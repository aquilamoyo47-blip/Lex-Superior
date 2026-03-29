import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { ingestAllRepos } from "../lib/repoIngestion.js";
import { buildLunrIndex, getKnowledgeStats, invalidateLunrIndex } from "../lib/knowledgeSearch.js";
import { getKnowledgeDb, getChunkCount, getLastIngestionDate } from "../lib/knowledgeDb.js";
import { searchKnowledge } from "../lib/knowledgeSearch.js";

const router: IRouter = Router();

router.post("/knowledge/refresh", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_KEY;

  if (!expectedKey) {
    res.status(503).json({ error: "Admin key not configured on server" });
    return;
  }

  if (!adminKey || adminKey !== expectedKey) {
    res.status(401).json({ error: "Unauthorized — invalid or missing X-Admin-Key header" });
    return;
  }

  try {
    logger.info({ ip: req.ip }, "Knowledge refresh triggered by admin");

    res.json({
      status: "started",
      message: "Knowledge base ingestion started. Check server logs for progress.",
    });

    setImmediate(async () => {
      try {
        const stats = await ingestAllRepos();

        const db = getKnowledgeDb();
        const { sql } = await import("drizzle-orm").catch(() => ({ sql: null }));
        void sql;

        db.prepare(
          `INSERT OR REPLACE INTO knowledge_meta(key, value, updated_at) VALUES('last_ingested', datetime('now'), datetime('now'))`
        ).run();

        invalidateLunrIndex();
        await buildLunrIndex();

        logger.info(stats, "Knowledge base refresh complete");
      } catch (err) {
        logger.error({ err }, "Knowledge base refresh failed");
      }
    });
  } catch (err) {
    logger.error({ err }, "Error starting knowledge refresh");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/knowledge/status", async (req, res) => {
  try {
    const stats = getKnowledgeStats();
    const db = getKnowledgeDb();
    const lastIngested = getLastIngestionDate(db);
    const chunkCount = getChunkCount(db);

    res.json({
      ready: stats.lunrReady,
      chunkCount,
      fts5Count: stats.fts5Count,
      lunrReady: stats.lunrReady,
      indexBuilding: stats.indexBuilding,
      lastIngested,
    });
  } catch (err) {
    logger.error({ err }, "Error getting knowledge status");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/knowledge/search", async (req, res) => {
  const { q, limit } = req.query as Record<string, string>;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: "Query parameter 'q' must be at least 2 characters" });
    return;
  }

  try {
    const results = await searchKnowledge(q, parseInt(limit || "10", 10));
    res.json({
      query: q,
      results,
      count: results.length,
    });
  } catch (err) {
    logger.error({ err }, "Knowledge search error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
