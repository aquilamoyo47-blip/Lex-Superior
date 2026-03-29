import app from "./app";
import { logger } from "./lib/logger";
import { getKnowledgeDb, getChunkCount } from "./lib/knowledgeDb.js";
import { buildLunrIndex, isKnowledgeIndexReady } from "./lib/knowledgeSearch.js";
import { ingestAllRepos } from "./lib/repoIngestion.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  setImmediate(async () => {
    try {
      const db = getKnowledgeDb();
      const existingChunks = getChunkCount(db);

      if (existingChunks === 0) {
        logger.info("No existing knowledge chunks — running initial ingestion...");
        await ingestAllRepos();

        db.prepare(
          `INSERT OR REPLACE INTO knowledge_meta(key, value, updated_at) VALUES('last_ingested', datetime('now'), datetime('now'))`
        ).run();
      } else {
        logger.info({ existingChunks }, "Knowledge base already populated — skipping ingestion");
      }

      if (!isKnowledgeIndexReady()) {
        logger.info("Building Lunr.js in-memory index...");
        await buildLunrIndex();
      }

      logger.info("Knowledge engine ready");
    } catch (err) {
      logger.error({ err }, "Knowledge engine startup error (non-fatal — server continues)");
    }
  });
});
