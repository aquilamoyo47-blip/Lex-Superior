import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { statutesTable, casesTable, notesTable, updatesTable } from "@workspace/db";
import { ilike, or, eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { fuzzySearch } from "../vendor/fuzzy-search.js";

const router: IRouter = Router();

router.get("/library/statutes", async (req, res) => {
  const { category, search } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (category) conditions.push(eq(statutesTable.category, category));

    const statutes = await db
      .select()
      .from(statutesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(statutesTable.category, statutesTable.title)
      .limit(500);

    if (search && search.trim().length >= 2) {
      const results = fuzzySearch(statutes, search, {
        keys: ['title', 'summary', 'category'],
        threshold: 0.45,
        limit: 100,
      });
      const fuzzyStatutes = results.map(r => r.item);
      res.json({ statutes: fuzzyStatutes, total: fuzzyStatutes.length, fuzzySearch: true });
    } else {
      const limited = statutes.slice(0, 100);
      res.json({ statutes: limited, total: limited.length, fuzzySearch: false });
    }
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

    const cases = await db
      .select()
      .from(casesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${casesTable.year} DESC NULLS LAST`, casesTable.citation)
      .limit(500);

    if (search && search.trim().length >= 2) {
      const results = fuzzySearch(cases, search, {
        keys: ['citation', 'title', 'principle', 'headnote'],
        threshold: 0.45,
        limit: 100,
      });
      const fuzzyCases = results.map(r => r.item);
      res.json({ cases: fuzzyCases, total: fuzzyCases.length, fuzzySearch: true });
    } else {
      const limited = cases.slice(0, 100);
      res.json({ cases: limited, total: limited.length, fuzzySearch: false });
    }

    void tags;
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

    const notes = await db
      .select()
      .from(notesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(notesTable.unit, notesTable.topic)
      .limit(500);

    if (search && search.trim().length >= 2) {
      const results = fuzzySearch(notes, search, {
        keys: ['topic', 'content'],
        threshold: 0.45,
        limit: 100,
      });
      const fuzzyNotes = results.map(r => r.item);
      res.json({ notes: fuzzyNotes, total: fuzzyNotes.length, fuzzySearch: true });
    } else {
      const limited = notes.slice(0, 100);
      res.json({ notes: limited, total: limited.length, fuzzySearch: false });
    }
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
