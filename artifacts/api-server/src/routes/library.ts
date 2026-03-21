import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { statutesTable, casesTable, notesTable, updatesTable } from "@workspace/db";
import { ilike, or, eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/library/statutes", async (req, res) => {
  const { category, search } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (category) conditions.push(eq(statutesTable.category, category));
    if (search) {
      conditions.push(
        or(
          ilike(statutesTable.title, `%${search}%`),
          ilike(statutesTable.summary, `%${search}%`)
        )!
      );
    }

    const statutes = await db
      .select()
      .from(statutesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(statutesTable.category, statutesTable.title)
      .limit(100);

    res.json({ statutes, total: statutes.length });
  } catch (err) {
    req.log.error({ err }, "List statutes error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/statutes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [statute] = await db.select().from(statutesTable).where(eq(statutesTable.id, id));
    if (!statute) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(statute);
  } catch (err) {
    req.log.error({ err }, "Get statute error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/cases", async (req, res) => {
  const { court, year, search, tags } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (court) conditions.push(eq(casesTable.court, court));
    if (year) conditions.push(eq(casesTable.year, parseInt(year)));
    if (search) {
      conditions.push(
        or(
          ilike(casesTable.citation, `%${search}%`),
          ilike(casesTable.title, `%${search}%`),
          ilike(casesTable.principle, `%${search}%`),
          ilike(casesTable.headnote, `%${search}%`)
        )!
      );
    }

    const cases = await db
      .select()
      .from(casesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${casesTable.year} DESC NULLS LAST`, casesTable.citation)
      .limit(100);

    res.json({ cases, total: cases.length });
  } catch (err) {
    req.log.error({ err }, "List cases error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/cases/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [legalCase] = await db.select().from(casesTable).where(eq(casesTable.id, id));
    if (!legalCase) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(legalCase);
  } catch (err) {
    req.log.error({ err }, "Get case error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/notes", async (req, res) => {
  const { topic, search } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (topic) conditions.push(ilike(notesTable.topic, `%${topic}%`));
    if (search) {
      conditions.push(
        or(
          ilike(notesTable.topic, `%${search}%`),
          ilike(notesTable.content, `%${search}%`)
        )!
      );
    }

    const notes = await db
      .select()
      .from(notesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(notesTable.unit, notesTable.topic)
      .limit(100);

    res.json({ notes, total: notes.length });
  } catch (err) {
    req.log.error({ err }, "List notes error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/updates", async (req, res) => {
  try {
    const updates = await db
      .select()
      .from(updatesTable)
      .orderBy(sql`${updatesTable.date} DESC`)
      .limit(50);

    res.json({ updates });
  } catch (err) {
    req.log.error({ err }, "List updates error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
