import { logger } from "./logger.js";
import { db, notesTable } from "@workspace/db";
import { COUNCIL_MEMBERS } from "../routes/council.js";
import { downloadFileContent, listDriveFiles, type DriveFile } from "./driveIngester.js";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-opus-4-7";

export interface SwarmProgress {
  status: "idle" | "running" | "complete" | "error";
  startedAt?: string;
  completedAt?: string;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  results: SwarmFileResult[];
  error?: string;
}

interface SwarmFileResult {
  filename: string;
  fileId: string;
  agentResults: Record<string, { ok: boolean; snippet: string }>;
}

let currentProgress: SwarmProgress = {
  status: "idle",
  totalFiles: 0,
  processedFiles: 0,
  results: [],
};

export function getSwarmProgress(): SwarmProgress {
  return { ...currentProgress, results: [...currentProgress.results] };
}

async function analyzeWithAgent(
  content: string,
  filename: string,
  systemPrompt: string,
  memberTitle: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const userPrompt = `Analyze the following legal document from your specialization as ${memberTitle}.

Produce a structured response with:
1. **Summary** (3–5 sentences): Key legal principles and holdings
2. **Applicable Statutes**: Zimbabwe statutes/rules mentioned or applicable
3. **Relevant Cases**: Case citations found or applicable
4. **Key Q&A Pairs** (5 pairs): Important legal questions this document answers, each as Q: / A:
5. **Specialist Analysis**: Your expert perspective from ${memberTitle}

Document: ${filename}
---
${content.slice(0, 28000)}
---

Respond in structured markdown.`;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
}

async function processFile(file: DriveFile): Promise<SwarmFileResult> {
  logger.info({ fileId: file.id, name: file.name }, "Processing file through agent swarm");

  const content = await downloadFileContent(file);

  const agentPromises = COUNCIL_MEMBERS.map(async (member) => {
    try {
      const analysis = await analyzeWithAgent(content, file.name, member.systemPrompt, member.title);

      try {
        await db.insert(notesTable).values({
          topic: `[DRIVE] ${member.title}: ${file.name.slice(0, 100)}`,
          content: analysis,
          keyCases: [],
          keyRules: [],
          tags: ["drive-training", member.specialty, "ai-generated"],
        });
      } catch (dbErr) {
        logger.warn({ err: dbErr }, "DB insert failed for training note");
      }

      return [member.id, { ok: true, snippet: analysis.slice(0, 200) }] as const;
    } catch (err) {
      logger.warn({ member: member.id, file: file.name, err }, "Agent analysis failed");
      return [member.id, { ok: false, snippet: String(err) }] as const;
    }
  });

  const settled = await Promise.all(agentPromises);
  return {
    filename: file.name,
    fileId: file.id,
    agentResults: Object.fromEntries(settled),
  };
}

export async function runLegalResearchSwarm(
  folderId?: string,
  maxFiles = 10
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for the agent swarm");

  currentProgress = {
    status: "running",
    startedAt: new Date().toISOString(),
    totalFiles: 0,
    processedFiles: 0,
    results: [],
  };

  try {
    const files = await listDriveFiles(folderId, maxFiles);
    currentProgress.totalFiles = files.length;
    logger.info({ fileCount: files.length }, "Legal research swarm starting");

    for (const file of files) {
      currentProgress.currentFile = file.name;
      try {
        const result = await processFile(file);
        currentProgress.results.push(result);
      } catch (err) {
        logger.warn({ file: file.name, err }, "File processing failed");
        currentProgress.results.push({
          filename: file.name,
          fileId: file.id,
          agentResults: { error: { ok: false, snippet: String(err) } },
        });
      }
      currentProgress.processedFiles++;
    }

    currentProgress.status = "complete";
    currentProgress.completedAt = new Date().toISOString();
    currentProgress.currentFile = undefined;
    logger.info("Legal research swarm complete");
  } catch (err) {
    currentProgress.status = "error";
    currentProgress.error = String(err);
    currentProgress.currentFile = undefined;
    throw err;
  }
}
