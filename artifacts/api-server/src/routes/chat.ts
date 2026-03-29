import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { consultationsTable, messagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { streamLegalPipeline, getProviderStatus, createStreamEventBus } from "../lib/aiPipeline";
import { retryWithLogging } from "../vendor/retry-backoff.js";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const { message, practiceArea = "all", consultationId, userId } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Bad Request", message: "message is required" });
    return;
  }

  try {
    let activeConsultationId = consultationId;

    if (!activeConsultationId) {
      const title = message.slice(0, 60) + (message.length > 60 ? "..." : "");
      const [newConsultation] = await db.insert(consultationsTable).values({
        userId: userId || "anonymous",
        title,
        practiceArea,
      }).returning();
      activeConsultationId = newConsultation.id;
    }

    const previousMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.consultationId, activeConsultationId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(6);

    const conversationHistory = previousMessages.reverse().map(m => ({
      role: m.role,
      content: m.content,
    }));

    await db.insert(messagesTable).values({
      consultationId: activeConsultationId,
      role: "user",
      content: message,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.write(`data: ${JSON.stringify({ consultationId: activeConsultationId })}\n\n`);

    const startTime = Date.now();
    const streamBus = createStreamEventBus();

    const result = await retryWithLogging(
      'streamLegalPipeline',
      () => streamLegalPipeline(
        message,
        practiceArea,
        conversationHistory,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      ),
      { retries: 1, minTimeout: 2000, maxTimeout: 10000 }
    );

    streamBus.emit("done", result.content);
    streamBus.removeAllListeners();

    const responseTimeMs = Date.now() - startTime;

    const [savedMessage] = await db.insert(messagesTable).values({
      consultationId: activeConsultationId,
      role: "assistant",
      content: result.content,
      providerUsed: result.providerUsed,
      fromCache: result.fromCache,
      flags: result.flags,
    }).returning();

    await db.update(consultationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(consultationsTable.id, activeConsultationId));

    res.write(`data: ${JSON.stringify({
      done: true,
      id: savedMessage.id,
      providerUsed: result.providerUsed,
      responseTimeMs,
      fromCache: result.fromCache,
      flags: result.flags,
      detectedStatutes: result.detectedStatutes,
      suggestedCases: result.suggestedCases,
      applicableRules: result.applicableRules,
      keyTopics: result.keyTopics,
      legalDates: result.legalDates,
      consultationId: activeConsultationId,
    })}\n\n`);

    res.end();
  } catch (err: unknown) {
    const errObj = err as { status?: number; message?: string; retryAfterMs?: number };
    req.log.error({ err }, "Chat error");
    if (!res.headersSent) {
      const status = errObj.status === 429 ? 429 : 500;
      res.status(status).json({
        error: status === 429 ? "Too Many Requests" : "Internal Server Error",
        message: errObj.message || "An unexpected error occurred",
        ...(errObj.retryAfterMs ? { retryAfterMs: errObj.retryAfterMs } : {}),
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: errObj.message || "An unexpected error occurred" })}\n\n`);
      res.end();
    }
  }
});

router.get("/provider/status", (_req, res) => {
  const providers = getProviderStatus();
  const activeProvider = providers.find(p => p.available);
  res.json({ providers, activeProvider: activeProvider?.name });
});

export default router;
