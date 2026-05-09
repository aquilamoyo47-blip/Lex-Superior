import { logger } from "./logger.js";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export function isDriveAvailable(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY);
}

export async function listDriveFiles(folderId?: string, maxFiles = 20): Promise<DriveFile[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured");

  const queryParts = [
    "trashed=false",
    "(mimeType='application/vnd.google-apps.document' or mimeType='text/plain' or mimeType='text/html')",
  ];
  if (folderId) queryParts.push(`'${folderId}' in parents`);

  const params = new URLSearchParams({
    key: apiKey,
    fields: "files(id,name,mimeType,size)",
    pageSize: String(Math.min(maxFiles, 100)),
    orderBy: "modifiedTime desc",
    q: queryParts.join(" and "),
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });

  logger.info({ folderId, maxFiles }, "Listing Google Drive files");

  const response = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { files?: DriveFile[] };
  const files = (data.files || []).slice(0, maxFiles);
  logger.info({ count: files.length }, "Drive files listed");
  return files;
}

export async function downloadFileContent(file: DriveFile): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured");

  let url: string;
  if (file.mimeType === "application/vnd.google-apps.document") {
    url = `${DRIVE_API_BASE}/files/${file.id}/export?mimeType=text%2Fplain&key=${apiKey}`;
  } else {
    url = `${DRIVE_API_BASE}/files/${file.id}?alt=media&key=${apiKey}`;
  }

  logger.info({ fileId: file.id, name: file.name, mimeType: file.mimeType }, "Downloading Drive file");

  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive download failed for "${file.name}" (${response.status}): ${text}`);
  }

  const content = await response.text();
  // Truncate to ~40k chars to stay within token limits
  return content.slice(0, 40000);
}
