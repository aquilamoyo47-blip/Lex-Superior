import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { consultationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/consultations", async (req, res) => {
  const { userId, practiceArea } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (userId) conditions.push(eq(consultationsTable.userId, userId));
    if (practiceArea && practiceArea !== "all") {
      conditions.push(eq(consultationsTable.practiceArea, practiceArea));
    }

    const consultations = await db
      .select()
      .from(consultationsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(consultationsTable.updatedAt))
      .limit(50);

    const withCounts = await Promise.all(
      consultations.map(async (c) => {
        const [{ count: msgCount }] = await db
          .select({ count: count() })
          .from(messagesTable)
          .where(eq(messagesTable.consultationId, c.id));
        return { ...c, messageCount: Number(msgCount) };
      })
    );

    res.json({ consultations: withCounts, total: withCounts.length });
  } catch (err) {
    req.log.error({ err }, "List consultations error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/consultations", async (req, res) => {
  const { userId, title, practiceArea = "all" } = req.body;

  try {
    const [consultation] = await db.insert(consultationsTable).values({
      userId: userId || "anonymous",
      title,
      practiceArea,
    }).returning();

    res.status(201).json(consultation);
  } catch (err) {
    req.log.error({ err }, "Create consultation error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/consultations/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [consultation] = await db
      .select()
      .from(consultationsTable)
      .where(eq(consultationsTable.id, id));

    if (!consultation) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.consultationId, id))
      .orderBy(messagesTable.createdAt);

    res.json({ ...consultation, messages });
  } catch (err) {
    req.log.error({ err }, "Get consultation error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/consultations/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.delete(consultationsTable).where(eq(consultationsTable.id, id));
    res.json({ success: true, message: "Consultation deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete consultation error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
