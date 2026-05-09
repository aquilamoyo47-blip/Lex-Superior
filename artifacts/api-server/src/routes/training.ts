import { Router, type IRouter, type Request, type Response } from "express";
import { runLegalResearchSwarm, getSwarmProgress } from "../lib/legalResearchSwarm.js";
import { listDriveFiles, isDriveAvailable } from "../lib/driveIngester.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.post("/api/training/drive-ingest", async (req: Request, res: Response) => {
  const progress = getSwarmProgress();
  if (progress.status === "running") {
    res.status(409).json({ error: "Training already in progress", progress });
    return;
  }

  if (!isDriveAvailable()) {
    res.status(503).json({ error: "GOOGLE_API_KEY is not configured" });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const body = req.body as { folderId?: string; maxFiles?: number };
  const folderId = typeof body.folderId === "string" ? body.folderId : undefined;
  const maxFiles = typeof body.maxFiles === "number" ? Math.min(body.maxFiles, 50) : 10;

  logger.info({ folderId, maxFiles }, "Drive ingest + agent swarm triggered");

  runLegalResearchSwarm(folderId, maxFiles).catch((err: unknown) => {
    logger.error({ err }, "Legal research swarm failed");
  });

  res.json({
    status: "started",
    message: `Legal research agent swarm launched for ${maxFiles} files`,
    folderId: folderId ?? "My Drive (all files)",
  });
});

router.get("/api/training/status", (_req: Request, res: Response) => {
  const progress = getSwarmProgress();
  res.json(progress);
});

router.get("/api/training/drive-files", async (req: Request, res: Response) => {
  if (!isDriveAvailable()) {
    res.status(503).json({ error: "GOOGLE_API_KEY is not configured" });
    return;
  }

  const query = req.query as { folderId?: string; maxFiles?: string };
  const folderId = query.folderId;
  const maxFiles = query.maxFiles ? parseInt(query.maxFiles, 10) : 20;

  try {
    const files = await listDriveFiles(folderId, maxFiles);
    res.json({ files, count: files.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
