/**
 * Knowledge Search — Lunr.js + SQLite FTS5 Hybrid
 * Builds an in-memory Lunr.js index at startup for fast queries.
 * Falls back to FTS5 for deeper search or when Lunr index is not ready.
 */

import lunr from "lunr";
import { logger } from "./logger";
import {
  getKnowledgeDb,
  fts5Search,
  getAllChunks,
  getChunkCount,
  type LegalChunk,
  type SearchResult,
} from "./knowledgeDb.js";

export interface KnowledgeSearchResult {
  content: string;
  source: string;
  chapter: string;
  category: string;
  attribution: string;
  score: number;
  searchMethod: "lunr" | "fts5";
}

interface LunrDoc {
  id: string;
  content: string;
  chapter: string;
  source: string;
  category: string;
  attribution: string;
}

let _lunrIndex: lunr.Index | null = null;
let _lunrDocMap: Map<string, LunrDoc> | null = null;
let _indexBuilding = false;

export function isKnowledgeIndexReady(): boolean {
  return _lunrIndex !== null && _lunrDocMap !== null;
}

export async function buildLunrIndex(): Promise<void> {
  if (_indexBuilding) return;
  _indexBuilding = true;

  try {
    const db = getKnowledgeDb();
    const count = getChunkCount(db);

    if (count === 0) {
      logger.info("No chunks in FTS5 table — Lunr index not built (run ingestion first)");
      return;
    }

    logger.info({ chunkCount: count }, "Building Lunr.js in-memory index...");

    const chunks = getAllChunks(db, 100000);
    const docMap = new Map<string, LunrDoc>();

    const docs: LunrDoc[] = chunks.map((chunk, i) => {
      const id = String(i);
      const doc: LunrDoc = {
        id,
        content: chunk.content,
        chapter: chunk.chapter,
        source: chunk.source,
        category: chunk.category,
        attribution: chunk.attribution,
      };
      docMap.set(id, doc);
      return doc;
    });

    const index = lunr(function () {
      this.ref("id");

      this.field("chapter", { boost: 3 });
      this.field("source", { boost: 2 });
      this.field("category", { boost: 2 });
      this.field("content", { boost: 1 });

      this.metadataWhitelist = ["position"];

      for (const doc of docs) {
        this.add(doc);
      }
    });

    _lunrIndex = index;
    _lunrDocMap = docMap;

    logger.info({ docCount: docs.length }, "Lunr.js index built successfully");
  } catch (err) {
    logger.error({ err }, "Failed to build Lunr.js index");
    _indexBuilding = false;
    throw err;
  } finally {
    _indexBuilding = false;
  }
}

function lunrSearch(query: string, limit: number): KnowledgeSearchResult[] {
  if (!_lunrIndex || !_lunrDocMap) return [];

  try {
    const results = _lunrIndex.search(query);
    const top = results.slice(0, limit);

    return top.map((r) => {
      const doc = _lunrDocMap!.get(r.ref);
      if (!doc) return null;

      return {
        content: doc.content,
        source: doc.source,
        chapter: doc.chapter,
        category: doc.category,
        attribution: doc.attribution,
        score: r.score,
        searchMethod: "lunr" as const,
      };
    }).filter((r): r is KnowledgeSearchResult => r !== null);
  } catch (err) {
    logger.debug({ query, err }, "Lunr search error");
    return [];
  }
}

function fts5ToKnowledgeResult(r: SearchResult): KnowledgeSearchResult {
  const score = r.rank ? -r.rank : 0;
  return {
    content: r.content,
    source: r.source,
    chapter: r.chapter,
    category: r.category,
    attribution: r.attribution,
    score,
    searchMethod: "fts5",
  };
}

export async function searchKnowledge(
  query: string,
  limit = 10
): Promise<KnowledgeSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const db = getKnowledgeDb();

  if (_lunrIndex && _lunrDocMap) {
    const lunrResults = lunrSearch(query, limit);

    if (lunrResults.length >= 2) {
      logger.debug(
        { query, count: lunrResults.length, method: "lunr" },
        "Knowledge search via Lunr"
      );
      return lunrResults.slice(0, limit);
    }

    logger.debug(
      { query, lunrCount: lunrResults.length },
      "Lunr returned few results — augmenting with FTS5"
    );

    const fts5Results = fts5Search(db, query, limit).map(fts5ToKnowledgeResult);

    const combined = mergeResults(lunrResults, fts5Results, limit);
    return combined;
  }

  const fts5Results = fts5Search(db, query, limit).map(fts5ToKnowledgeResult);
  logger.debug(
    { query, count: fts5Results.length, method: "fts5" },
    "Knowledge search via FTS5 (Lunr not ready)"
  );
  return fts5Results;
}

function mergeResults(
  lunrResults: KnowledgeSearchResult[],
  fts5Results: KnowledgeSearchResult[],
  limit: number
): KnowledgeSearchResult[] {
  const seen = new Set<string>();
  const merged: KnowledgeSearchResult[] = [];

  for (const r of lunrResults) {
    const key = r.content.slice(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  for (const r of fts5Results) {
    const key = r.content.slice(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return merged.slice(0, limit);
}

export function getKnowledgeStats(): {
  lunrReady: boolean;
  fts5Count: number;
  indexBuilding: boolean;
} {
  const db = getKnowledgeDb();
  const fts5Count = getChunkCount(db);

  return {
    lunrReady: isKnowledgeIndexReady(),
    fts5Count,
    indexBuilding: _indexBuilding,
  };
}

export function invalidateLunrIndex(): void {
  _lunrIndex = null;
  _lunrDocMap = null;
  _indexBuilding = false;
  logger.info("Lunr index invalidated — will be rebuilt on next buildLunrIndex() call");
}
