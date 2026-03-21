import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { consultationsTable, messagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { runLegalPipeline, getProviderStatus } from "../lib/aiPipeline";
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

    const startTime = Date.now();
    const result = await runLegalPipeline(message, practiceArea, conversationHistory);
    const responseTimeMs = Date.now() - startTime;

    const [savedMessage] = await db.insert(messagesTable).values({
      consultationId: activeConsultationId,
      role: "assistant",
      content: result.content,
      providerUsed: result.providerUsed,
      fromCache: result.fromCache,
      thinkingChain: result.thinkingChain,
      flags: result.flags,
    }).returning();

    await db.update(consultationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(consultationsTable.id, activeConsultationId));

    res.json({
      id: savedMessage.id,
      content: result.content,
      thinkingChain: result.thinkingChain,
      providerUsed: result.providerUsed,
      responseTimeMs,
      fromCache: result.fromCache,
      flags: result.flags,
      detectedStatutes: result.detectedStatutes,
      suggestedCases: result.suggestedCases,
      applicableRules: result.applicableRules,
      consultationId: activeConsultationId,
    });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: "Internal Server Error", message: (err as Error).message });
  }
});

router.get("/provider/status", (_req, res) => {
  const providers = getProviderStatus();
  const activeProvider = providers.find(p => p.available);
  res.json({ providers, activeProvider: activeProvider?.name });
});

export default router;
