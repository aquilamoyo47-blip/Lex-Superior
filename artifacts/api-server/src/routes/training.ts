import { Router, type IRouter, type Request, type Response } from "express";
import { runLegalResearchSwarm, getSwarmProgress } from "../lib/legalResearchSwarm.js";
import { listDriveFiles, isDriveAvailable } from "../lib/driveIngester.js";
import { buildAuthUrl, exchangeCodeForTokens, getOAuthStatus, revokeTokens, isOAuthConfigured } from "../lib/googleOAuth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── OAuth flow ─────────────────────────────────────────────────────────────

router.get("/api/training/drive-auth", (req: Request, res: Response) => {
  if (!isOAuthConfigured()) {
    res.status(503).json({
      error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in Replit Secrets",
    });
    return;
  }
  const redirectUri = `${req.protocol}://${req.get("host")}/api/training/drive-callback`;
  res.redirect(buildAuthUrl(redirectUri));
});

router.get("/api/training/drive-callback", async (req: Request, res: Response) => {
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    res.send(
      `<html><body style="font-family:sans-serif;padding:2rem"><h2>Google Drive auth failed</h2>` +
      `<p>${error ?? "No authorisation code received"}</p>` +
      `<a href="/training">Back to Training</a></body></html>`
    );
    return;
  }

  const redirectUri = `${req.protocol}://${req.get("host")}/api/training/drive-callback`;
  try {
    await exchangeCodeForTokens(code, redirectUri);
    res.send(
      `<html><body style="font-family:sans-serif;padding:2rem;text-align:center">` +
      `<h2>✅ Google Drive Connected!</h2>` +
      `<p>You can close this tab and return to the Training page.</p>` +
      `<script>if(window.opener){window.opener.postMessage('drive-connected','*');window.close();}</script>` +
      `</body></html>`
    );
  } catch (err) {
    res.status(500).send(
      `<html><body style="font-family:sans-serif;padding:2rem"><h2>Auth error</h2>` +
      `<p>${String(err)}</p><a href="/training">Back to Training</a></body></html>`
    );
  }
});

router.get("/api/training/drive-status", (_req: Request, res: Response) => {
  res.json(getOAuthStatus());
});

router.delete("/api/training/drive-disconnect", (_req: Request, res: Response) => {
  revokeTokens();
  res.json({ ok: true });
});

// ─── Swarm ───────────────────────────────────────────────────────────────────

router.post("/api/training/drive-ingest", async (req: Request, res: Response) => {
  const progress = getSwarmProgress();
  if (progress.status === "running") {
    res.status(409).json({ error: "Training already in progress", progress });
    return;
  }

  if (!isDriveAvailable()) {
    res.status(503).json({
      error: "Google Drive is not connected — visit /training to connect",
    });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const body = req.body as { folderId?: string; maxFiles?: number };
  const folderId = typeof body.folderId === "string" && body.folderId ? body.folderId : undefined;
  const maxFiles = typeof body.maxFiles === "number" ? Math.min(body.maxFiles, 50) : 10;

  logger.info({ folderId, maxFiles }, "Drive ingest + agent swarm triggered");

  runLegalResearchSwarm(folderId, maxFiles).catch((err: unknown) => {
    logger.error({ err }, "Legal research swarm failed");
  });

  res.json({
    status: "started",
    message: `Legal research agent swarm launched for up to ${maxFiles} files`,
    folderId: folderId ?? "My Drive (all files)",
  });
});

router.get("/api/training/status", (_req: Request, res: Response) => {
  res.json(getSwarmProgress());
});

router.get("/api/training/drive-files", async (req: Request, res: Response) => {
  if (!isDriveAvailable()) {
    res.status(503).json({
      error: "Google Drive is not connected — visit /training to connect",
    });
    return;
  }

  const query = req.query as { folderId?: string; maxFiles?: string };
  const maxFiles = query.maxFiles ? parseInt(query.maxFiles, 10) : 20;

  try {
    const files = await listDriveFiles(query.folderId, maxFiles);
    res.json({ files, count: files.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
