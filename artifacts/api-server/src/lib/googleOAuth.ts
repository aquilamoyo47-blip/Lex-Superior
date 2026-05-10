import { logger } from "./logger.js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const TOKEN_FILE = join(process.cwd(), ".data", "google-oauth.json");

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let tokens: StoredTokens | null = null;

function loadTokens(): void {
  // 1) From env var (Replit Secret)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    tokens = {
      accessToken: "",
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      expiresAt: 0, // force refresh on first use
    };
    logger.info("Google OAuth: loaded refresh token from GOOGLE_REFRESH_TOKEN env var");
    return;
  }

  // 2) From persisted file
  try {
    const raw = readFileSync(TOKEN_FILE, "utf8");
    tokens = JSON.parse(raw) as StoredTokens;
    logger.info("Google OAuth: loaded tokens from file");
  } catch {
    tokens = null;
  }
}

function persistTokens(): void {
  try {
    mkdirSync(join(process.cwd(), ".data"), { recursive: true });
    writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
  } catch (err) {
    logger.warn({ err }, "Could not persist OAuth tokens to file");
  }
}

// Load on module init
loadTokens();

export function isOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getOAuthStatus(): {
  configured: boolean;
  connected: boolean;
  hasApiKeyFallback: boolean;
} {
  if (!tokens) loadTokens();
  return {
    configured: isOAuthConfigured(),
    connected: Boolean(tokens?.refreshToken),
    hasApiKeyFallback: Boolean(process.env.GOOGLE_API_KEY),
  };
}

export function buildAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<void> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens?.refreshToken || "",
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };

  persistTokens();

  // Prominently log so the user can copy it to .env file
  logger.info(
    { refreshToken: tokens.refreshToken },
    "=== GOOGLE OAUTH SUCCESS — save GOOGLE_REFRESH_TOKEN to .env file ==="
  );
  console.log(
    "\n\n✅  GOOGLE DRIVE CONNECTED\n" +
    "Save this as GOOGLE_REFRESH_TOKEN in .env file so it survives restarts:\n\n" +
    `GOOGLE_REFRESH_TOKEN=${tokens.refreshToken}\n\n`
  );
}

async function refreshAccessToken(): Promise<void> {
  if (!tokens?.refreshToken) throw new Error("No refresh token — complete OAuth flow first");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokens.accessToken = data.access_token;
  tokens.expiresAt = Date.now() + data.expires_in * 1000 - 60_000;
  persistTokens();
  logger.info("Google OAuth: access token refreshed");
}

export async function getAccessToken(): Promise<string> {
  if (!tokens) loadTokens();
  if (!tokens?.refreshToken) {
    throw new Error("Google Drive not connected. Complete OAuth flow at /api/training/drive-auth");
  }
  if (!tokens.accessToken || Date.now() >= tokens.expiresAt) {
    await refreshAccessToken();
  }
  return tokens.accessToken;
}

export function revokeTokens(): void {
  tokens = null;
  try {
    writeFileSync(TOKEN_FILE, "{}", "utf8");
  } catch {
    // ignore
  }
  logger.info("Google OAuth: tokens revoked");
}
