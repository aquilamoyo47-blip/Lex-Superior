/**
 * SQLite FTS5 Knowledge Database
 * Creates and manages the legal_chunks FTS5 virtual table with BM25 ranking.
 * Uses better-sqlite3 for synchronous SQLite access.
 */

import Database from "better-sqlite3";
import path from "path";
import { logger } from "./logger";

const DB_PATH = process.env.KNOWLEDGE_DB_PATH
  ? path.resolve(process.env.KNOWLEDGE_DB_PATH)
  : path.resolve(process.cwd(), "../../knowledge/knowledge.db");

export interface LegalChunk {
  content: string;
  source: string;
  chapter: string;
  category: string;
  attribution: string;
}

export interface SearchResult extends LegalChunk {
  rank: number;
  rowid: number;
}

let _db: Database.Database | null = null;

export function getKnowledgeDb(): Database.Database {
  if (_db) return _db;

  const db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -64000");

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS legal_chunks USING fts5(
      content,
      source,
      chapter,
      category,
      attribution,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  _db = db;
  logger.info({ path: DB_PATH }, "Knowledge SQLite FTS5 database initialised");
  return db;
}

export function clearChunks(db: Database.Database): void {
  db.exec("DELETE FROM legal_chunks");
  db.prepare(
    `INSERT OR REPLACE INTO knowledge_meta(key, value, updated_at) VALUES('last_cleared', datetime('now'), datetime('now'))`
  ).run();
  logger.info("Cleared all chunks from FTS5 table");
}

export function insertChunks(db: Database.Database, chunks: LegalChunk[]): void {
  if (chunks.length === 0) return;

  const insert = db.prepare(
    `INSERT INTO legal_chunks(content, source, chapter, category, attribution) VALUES (@content, @source, @chapter, @category, @attribution)`
  );

  const insertMany = db.transaction((rows: LegalChunk[]) => {
    for (const row of rows) {
      insert.run(row);
    }
  });

  insertMany(chunks);
}

export function fts5Search(
  db: Database.Database,
  query: string,
  limit = 10
): SearchResult[] {
  if (!query || query.trim().length === 0) return [];

  const sanitizedQuery = query
    .trim()
    .replace(/['"*\-^(){}[\]|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitizedQuery) return [];

  try {
    const stmt = db.prepare(`
      SELECT 
        rowid,
        content,
        source,
        chapter,
        category,
        attribution,
        rank
      FROM legal_chunks
      WHERE legal_chunks MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(sanitizedQuery, limit) as SearchResult[];
    return rows;
  } catch (err) {
    logger.warn({ query: sanitizedQuery, err }, "FTS5 search error, trying phrase search");

    try {
      const words = sanitizedQuery
        .split(" ")
        .filter((w) => w.length > 2)
        .slice(0, 5)
        .join(" ");

      if (!words) return [];

      const stmt = db.prepare(`
        SELECT 
          rowid,
          content,
          source,
          chapter,
          category,
          attribution,
          rank
        FROM legal_chunks
        WHERE legal_chunks MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      return stmt.all(words, limit) as SearchResult[];
    } catch {
      return [];
    }
  }
}

export function getChunkCount(db: Database.Database): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM legal_chunks").get() as {
    count: number;
  };
  return row.count;
}

export function getLastIngestionDate(db: Database.Database): string | null {
  try {
    const row = db
      .prepare("SELECT value FROM knowledge_meta WHERE key = 'last_ingested'")
      .get() as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function setLastIngestionDate(db: Database.Database): void {
  db.prepare(
    `INSERT OR REPLACE INTO knowledge_meta(key, value, updated_at) VALUES('last_ingested', datetime('now'), datetime('now'))`
  ).run();
}

export function getAllChunks(
  db: Database.Database,
  limit = 50000
): LegalChunk[] {
  return db
    .prepare(
      "SELECT content, source, chapter, category, attribution FROM legal_chunks LIMIT ?"
    )
    .all(limit) as LegalChunk[];
}
