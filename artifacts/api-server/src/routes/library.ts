import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { statutesTable, casesTable, notesTable, updatesTable, precedentsTable } from "@workspace/db";
import { ilike, or, eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { fuzzySearch } from "../vendor/fuzzy-search.js";
import { levenshteinSimilarity } from "../vendor/levenshtein.js";
import { Trie } from "../vendor/trie.js";
import { BM25Retriever } from "../vendor/bm25.js";
import { TfIdfVectoriser } from "../vendor/tfidf-vectoriser.js";
import { cosineSimilarity } from "../vendor/cosine-similarity.js";
import { mergeRankedResults } from "../vendor/priority-queue.js";

const router: IRouter = Router();

function hybridSearch<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  textFields: (keyof T)[]
): T[] {
  if (items.length === 0) return [];

  const docs = items.map(item =>
    textFields.map(f => String(item[f] ?? "")).join(" ")
  );
  const docEntries = docs.map((text, i) => ({ id: String(i), text }));

  const retriever = new BM25Retriever();
  retriever.addDocuments(docEntries);
  const bm25Results = retriever.search(query, items.length);

  const vectoriser = new TfIdfVectoriser();
  vectoriser.addDocuments(docEntries);
  const tfidfResults = vectoriser.search(query, items.length);

  const tfidfNorm = tfidfResults.length > 0
    ? tfidfResults.reduce((m, r) => Math.max(m, r.score), 0) || 1
    : 1;

  const tfidfHits = tfidfResults.map(r => ({
    ...r,
    score: r.score / tfidfNorm,
  }));

  const merged = mergeRankedResults(
    [
      { results: bm25Results, weight: 0.6 },
      { results: tfidfHits, weight: 0.4 },
    ],
    100
  );

  return merged
    .filter(r => r.score > 0)
    .map(r => items[parseInt(r.id)])
    .filter(Boolean) as T[];
}

function correctTypo(query: string, candidates: string[]): { corrected: string; score: number } | null {
  let best: { corrected: string; score: number } | null = null;
  for (const candidate of candidates) {
    const score = levenshteinSimilarity(query.toLowerCase(), candidate.toLowerCase());
    if (score > 0.7 && (!best || score > best.score)) {
      best = { corrected: candidate, score };
    }
  }
  return best;
}

function charBigramVector(text: string, vocab: string[]): number[] {
  const bigrams = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) bigrams.add(text[i] + text[i + 1]);
  return vocab.map(b => (bigrams.has(b) ? 1 : 0));
}

function bigramCosineSimilarity(a: string, b: string): number {
  const combined = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) combined.add(a[i] + a[i + 1]);
  for (let i = 0; i < b.length - 1; i++) combined.add(b[i] + b[i + 1]);
  const vocab = Array.from(combined);
  const va = charBigramVector(a, vocab);
  const vb = charBigramVector(b, vocab);
  return cosineSimilarity(va, vb);
}

function rankByCharBigram(query: string, items: Array<{ id: string; text: string }>, topN: number): Array<{ id: string; score: number }> {
  return items
    .map(item => ({ id: item.id, score: bigramCosineSimilarity(query.toLowerCase(), item.text.toLowerCase().slice(0, 100)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

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
      const hybrid = hybridSearch(statutes as unknown as Record<string, unknown>[], search, ['title', 'summary', 'category']);
      const hybridStatutes = hybrid.length >= 3 ? hybrid : (() => {
        const results = fuzzySearch(statutes, search, {
          keys: ['title', 'summary', 'category'],
          threshold: 0.45,
          limit: 100,
        });
        return results.map(r => r.item);
      })();

      const typoSuggestion = hybridStatutes.length === 0
        ? correctTypo(search, statutes.map(s => s.title).filter(Boolean) as string[])
        : null;

      res.json({
        statutes: hybridStatutes.slice(0, 100),
        total: hybridStatutes.slice(0, 100).length,
        fuzzySearch: true,
        hybridSearch: true,
        typoSuggestion,
      });
    } else {
      const limited = statutes.slice(0, 100);
      res.json({ statutes: limited, total: limited.length, fuzzySearch: false, hybridSearch: false });
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
      const hybrid = hybridSearch(cases as unknown as Record<string, unknown>[], search, ['citation', 'title', 'principle', 'headnote']);
      const hybridCases = hybrid.length >= 3 ? hybrid : (() => {
        const results = fuzzySearch(cases, search, {
          keys: ['citation', 'title', 'principle', 'headnote'],
          threshold: 0.45,
          limit: 100,
        });
        return results.map(r => r.item);
      })();

      const typoSuggestion = hybridCases.length === 0
        ? correctTypo(search, cases.flatMap(c => [c.title, c.citation]).filter(Boolean) as string[])
        : null;

      res.json({
        cases: hybridCases.slice(0, 100),
        total: hybridCases.slice(0, 100).length,
        fuzzySearch: true,
        hybridSearch: true,
        typoSuggestion,
      });
    } else {
      const limited = cases.slice(0, 100);
      res.json({ cases: limited, total: limited.length, fuzzySearch: false, hybridSearch: false });
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

router.get("/library/precedents", async (req, res) => {
  const { q, category } = req.query as Record<string, string>;

  try {
    const conditions = [];
    if (category && category.trim()) {
      conditions.push(eq(precedentsTable.category, category.trim()));
    }

    const precedents = await db
      .select({
        id: precedentsTable.id,
        title: precedentsTable.title,
        category: precedentsTable.category,
        source: precedentsTable.source,
        filename: precedentsTable.filename,
        fileType: precedentsTable.fileType,
        excerpt: precedentsTable.excerpt,
        wordCount: precedentsTable.wordCount,
        ingestedAt: precedentsTable.ingestedAt,
      })
      .from(precedentsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(precedentsTable.category, precedentsTable.title)
      .limit(500);

    if (q && q.trim().length >= 2) {
      const hybrid = hybridSearch(
        precedents as unknown as Record<string, unknown>[],
        q,
        ["title", "category", "excerpt"]
      );
      const results = hybrid.length >= 3 ? hybrid : (() => {
        const r = fuzzySearch(precedents, q, {
          keys: ["title", "category", "excerpt"],
          threshold: 0.4,
          limit: 100,
        });
        return r.map(x => x.item);
      })();

      res.json({
        precedents: results.slice(0, 100),
        total: results.length,
        fuzzySearch: true,
      });
    } else {
      res.json({ precedents: precedents.slice(0, 100), total: precedents.length, fuzzySearch: false });
    }
  } catch (err) {
    req.log.error({ err }, "List precedents error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/precedents/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [precedent] = await db
      .select()
      .from(precedentsTable)
      .where(eq(precedentsTable.id, id));
    if (!precedent) { res.status(404).json({ error: "Not Found" }); return; }
    res.json(precedent);
  } catch (err) {
    req.log.error({ err }, "Get precedent error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library/autocomplete", async (req, res) => {
  const { q, kind } = req.query as Record<string, string>;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: "Bad Request", message: "q must be at least 2 characters" });
    return;
  }

  try {
    const trie = new Trie<{ kind: string }>();
    const limit = 200;

    if (!kind || kind === "statutes") {
      const statutes = await db.select({ title: statutesTable.title }).from(statutesTable).limit(limit);
      statutes.forEach(s => { if (s.title) trie.insert(s.title, { kind: "statute" }); });
    }

    if (!kind || kind === "cases") {
      const cases = await db.select({ title: casesTable.title, citation: casesTable.citation }).from(casesTable).limit(limit);
      cases.forEach(c => {
        if (c.title) trie.insert(c.title, { kind: "case" });
        if (c.citation) trie.insert(c.citation, { kind: "case_citation" });
      });
    }

    const trieResults = trie.search(q.trim(), 20);
    const bigramRanked = rankByCharBigram(
      q.trim(),
      trieResults.map(r => ({ id: r.value, text: r.value })),
      10
    );
    const suggestions = bigramRanked
      .map(r => trieResults.find(t => t.value === r.id))
      .filter(Boolean);

    res.json({ suggestions, query: q.trim() });
  } catch (err) {
    req.log.error({ err }, "Autocomplete error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
