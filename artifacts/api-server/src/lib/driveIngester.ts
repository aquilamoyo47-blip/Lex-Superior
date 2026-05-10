import { logger } from "./logger.js";
import { getAccessToken, getOAuthStatus } from "./googleOAuth.js";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export function isDriveAvailable(): boolean {
  const status = getOAuthStatus();
  return status.connected || status.hasApiKeyFallback;
}

async function driveRequest(path: string, params: Record<string, string> = {}): Promise<Response> {
  const status = getOAuthStatus();

  if (status.connected) {
    // OAuth: Bearer token in Authorization header
    const accessToken = await getAccessToken();
    const url = new URL(`${DRIVE_API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(60000),
    });
  }

  // Fallback: API key (public files only)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("No Drive credentials. Set GOOGLE_CLIENT_ID/SECRET or GOOGLE_API_KEY.");
  const url = new URL(`${DRIVE_API_BASE}${path}`);
  url.searchParams.set("key", apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url.toString(), { signal: AbortSignal.timeout(60000) });
}

export async function listDriveFiles(folderId?: string, maxFiles = 20): Promise<DriveFile[]> {
  const queryParts = [
    "trashed=false",
    "(mimeType='application/vnd.google-apps.document' or mimeType='text/plain' or mimeType='text/html')",
  ];
  if (folderId) queryParts.push(`'${folderId}' in parents`);

  logger.info({ folderId, maxFiles }, "Listing Google Drive files");

  const response = await driveRequest("/files", {
    fields: "files(id,name,mimeType,size)",
    pageSize: String(Math.min(maxFiles, 100)),
    orderBy: "modifiedTime desc",
    q: queryParts.join(" and "),
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive list failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { files?: DriveFile[] };
  const files = (data.files || []).slice(0, maxFiles);
  logger.info({ count: files.length }, "Drive files listed");
  return files;
}

export async function downloadFileContent(file: DriveFile): Promise<string> {
  logger.info({ fileId: file.id, name: file.name, mimeType: file.mimeType }, "Downloading Drive file");

  let response: Response;
  if (file.mimeType === "application/vnd.google-apps.document") {
    response = await driveRequest(`/files/${file.id}/export`, { mimeType: "text/plain" });
  } else {
    response = await driveRequest(`/files/${file.id}`, { alt: "media" });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive download failed for "${file.name}" (${response.status}): ${text}`);
  }

  const content = await response.text();
  return content.slice(0, 40000); // cap at ~40k chars
}
