/**
 * Repository Ingestion Pipeline — AI-Free Knowledge Engine
 * Walks the knowledge/repos directory, extracts text from .md/.txt/.rst/.pdf files,
 * chunks text using sentence-splitter, and inserts into SQLite FTS5 table.
 */

import fs from "fs";
import path from "path";
import { logger } from "./logger";
import { chunkText } from "../vendor/sentence-splitter.js";
import { markdownToPlainText } from "../vendor/markdown-parser.js";
import { parsePDF, isPDFBuffer } from "../vendor/pdf-parser.js";
import { getKnowledgeDb, insertChunks, clearChunks, type LegalChunk } from "./knowledgeDb.js";

interface RepoConfig {
  id: number;
  slug: string;
  name: string;
  localDir: string;
  originalUrl: string;
  resolvedUrl: string;
  substituted: boolean;
  category: string;
  attribution: string;
  fileExtensions: string[];
}

const REPO_CONFIGS: RepoConfig[] = [
  { id: 1, slug: "zimbabwe-legislation", name: "Zimbabwe Legislation", localDir: "01-zimbabwe-legislation", originalUrl: "", resolvedUrl: "", substituted: true, category: "Zimbabwe & SADC Legislation", attribution: "Government of Zimbabwe; Veritas Zimbabwe", fileExtensions: [".md", ".txt"] },
  { id: 2, slug: "openlaws-africa", name: "Zimbabwe Primary Legislation", localDir: "02-openlaws-africa", originalUrl: "", resolvedUrl: "", substituted: true, category: "Zimbabwe & SADC Legislation", attribution: "Veritas Zimbabwe", fileExtensions: [".md", ".txt"] },
  { id: 3, slug: "sadc-legislation", name: "SADC Legislation", localDir: "03-sadc-legislation", originalUrl: "", resolvedUrl: "", substituted: true, category: "Zimbabwe & SADC Legislation", attribution: "SADC Secretariat", fileExtensions: [".md", ".txt"] },
  { id: 4, slug: "constitutions", name: "Constitution of Zimbabwe 2013", localDir: "04-constitutions", originalUrl: "", resolvedUrl: "", substituted: true, category: "Zimbabwe & SADC Legislation", attribution: "Government of Zimbabwe", fileExtensions: [".md", ".txt"] },
  { id: 5, slug: "africa-legislation", name: "African Law Information", localDir: "05-africa-legislation", originalUrl: "", resolvedUrl: "", substituted: true, category: "Zimbabwe & SADC Legislation", attribution: "Laws.Africa; AfricanLII", fileExtensions: [".md", ".txt"] },
  { id: 6, slug: "court-rules", name: "Zimbabwe Court Rules", localDir: "06-court-rules", originalUrl: "", resolvedUrl: "", substituted: true, category: "Civil Procedure Rules & Court Practice", attribution: "Government of Zimbabwe, Chief Justice's Rules Committee", fileExtensions: [".md", ".txt"] },
  { id: 7, slug: "practice-directions", name: "High Court Practice Directions", localDir: "07-practice-directions", originalUrl: "", resolvedUrl: "", substituted: true, category: "Civil Procedure Rules & Court Practice", attribution: "High Court of Zimbabwe", fileExtensions: [".md", ".txt"] },
  { id: 8, slug: "sadc-judgments", name: "Zimbabwe and Southern African Judgments", localDir: "08-sadc-judgments", originalUrl: "", resolvedUrl: "", substituted: true, category: "Civil Procedure Rules & Court Practice", attribution: "SAFLII; ZimLII", fileExtensions: [".md", ".txt"] },
  { id: 9, slug: "court-forms", name: "Zimbabwe High Court Forms", localDir: "09-court-forms", originalUrl: "", resolvedUrl: "", substituted: true, category: "Civil Procedure Rules & Court Practice", attribution: "High Court of Zimbabwe", fileExtensions: [".md", ".txt"] },
  { id: 10, slug: "voet-commentary", name: "Voet — Commentary on the Pandects", localDir: "10-voet-commentary", originalUrl: "", resolvedUrl: "", substituted: true, category: "Roman-Dutch Law Foundations", attribution: "Public domain (Voet, 1647-1713)", fileExtensions: [".md", ".txt"] },
  { id: 11, slug: "grotius-introduction", name: "Grotius — Introduction to Dutch Jurisprudence", localDir: "11-grotius-introduction", originalUrl: "", resolvedUrl: "", substituted: true, category: "Roman-Dutch Law Foundations", attribution: "Public domain (Grotius, 1583-1645)", fileExtensions: [".md", ".txt"] },
  { id: 12, slug: "roman-dutch-texts", name: "Van der Linden — Institutes of Holland", localDir: "12-roman-dutch-texts", originalUrl: "", resolvedUrl: "", substituted: true, category: "Roman-Dutch Law Foundations", attribution: "Public domain (Van der Linden, 1756-1835)", fileExtensions: [".md", ".txt"] },
  { id: 13, slug: "legal-english", name: "Legal English Style Guide", localDir: "13-legal-english", originalUrl: "", resolvedUrl: "", substituted: true, category: "Legal English Language, Drafting & Style", attribution: "Lex Superior Knowledge Base", fileExtensions: [".md", ".txt"] },
  { id: 14, slug: "legal-language-corpus", name: "Legal Language Clarity", localDir: "14-legal-language-corpus", originalUrl: "", resolvedUrl: "", substituted: true, category: "Legal English Language, Drafting & Style", attribution: "Lex Superior Knowledge Base", fileExtensions: [".md", ".txt"] },
  { id: 15, slug: "legal-lexicon", name: "Zimbabwe Legal Dictionary", localDir: "15-legal-lexicon", originalUrl: "", resolvedUrl: "", substituted: true, category: "Legal English Language, Drafting & Style", attribution: "Lex Superior Knowledge Base", fileExtensions: [".md", ".txt"] },
  { id: 16, slug: "advocacy-guides", name: "Formal Legal Writing and Advocacy", localDir: "16-advocacy-guides", originalUrl: "", resolvedUrl: "", substituted: true, category: "Legal English Language, Drafting & Style", attribution: "Lex Superior Knowledge Base", fileExtensions: [".md", ".txt"] },
  { id: 17, slug: "legal-latin", name: "Legal Latin Maxims", localDir: "17-legal-latin", originalUrl: "", resolvedUrl: "", substituted: true, category: "Legal English Language, Drafting & Style", attribution: "Lex Superior Knowledge Base", fileExtensions: [".md", ".txt"] },
  { id: 18, slug: "constitutional-jurisprudence", name: "Zimbabwe Constitutional Jurisprudence", localDir: "18-constitutional-jurisprudence", originalUrl: "", resolvedUrl: "", substituted: true, category: "Constitutional & Human Rights Law (Zimbabwe)", attribution: "Constitutional Court of Zimbabwe; ZimLII", fileExtensions: [".md", ".txt"] },
  { id: 19, slug: "human-rights-corpus", name: "Southern Africa Human Rights", localDir: "19-human-rights-corpus", originalUrl: "", resolvedUrl: "", substituted: true, category: "Constitutional & Human Rights Law (Zimbabwe)", attribution: "African Union; United Nations; Zimbabwe Human Rights Commission", fileExtensions: [".md", ".txt"] },
  { id: 20, slug: "conveyancing", name: "Zimbabwe Conveyancing Procedure", localDir: "20-conveyancing", originalUrl: "", resolvedUrl: "", substituted: true, category: "Commercial & Property Law Procedure", attribution: "Government of Zimbabwe; Deeds Registries Act", fileExtensions: [".md", ".txt"] },
];

const KNOWLEDGE_BASE_DIR = process.env.KNOWLEDGE_REPOS_DIR
  ? path.resolve(process.env.KNOWLEDGE_REPOS_DIR)
  : path.resolve(process.cwd(), "../../knowledge/repos");
const CHUNK_MAX_SIZE = 512;
const CHUNK_OVERLAP = 64;
const MIN_CHUNK_LENGTH = 50;

async function readRepoConfigs(): Promise<RepoConfig[]> {
  return REPO_CONFIGS;
}

function extractTextFromMarkdown(content: string): string {
  return markdownToPlainText(content);
}

function extractTextFromPlainText(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function extractTextFromFile(filePath: string): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      if (!isPDFBuffer(buffer)) return null;
      const result = await parsePDF(buffer);
      return result.text;
    }

    const content = fs.readFileSync(filePath, "utf-8");

    if (ext === ".md" || ext === ".mdx") {
      return extractTextFromMarkdown(content);
    }

    if (ext === ".txt" || ext === ".rst" || ext === ".text") {
      return extractTextFromPlainText(content);
    }

    return null;
  } catch (err) {
    logger.debug({ filePath, err }, "Could not extract text from file");
    return null;
  }
}

function walkDirectory(dir: string, exts: string[]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      files.push(...walkDirectory(fullPath, exts));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function getSourceName(repo: RepoConfig, filePath: string): string {
  const repoDir = path.join(KNOWLEDGE_BASE_DIR, repo.localDir);
  const relative = path.relative(repoDir, filePath);
  return `${repo.name} — ${relative}`;
}

function getChapterFromFilePath(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  return base
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export interface IngestionStats {
  reposProcessed: number;
  filesProcessed: number;
  chunksInserted: number;
  errors: number;
}

export async function ingestAllRepos(): Promise<IngestionStats> {
  const stats: IngestionStats = {
    reposProcessed: 0,
    filesProcessed: 0,
    chunksInserted: 0,
    errors: 0,
  };

  logger.info("Starting knowledge base ingestion...");

  const db = getKnowledgeDb();
  clearChunks(db);

  const repos = await readRepoConfigs();

  if (repos.length === 0) {
    logger.warn("No repo configs found — scanning knowledge/repos directory directly");
    await ingestDirectScan(db, stats);
    return stats;
  }

  for (const repo of repos) {
    const repoDir = path.join(KNOWLEDGE_BASE_DIR, repo.localDir);

    if (!fs.existsSync(repoDir)) {
      logger.warn({ repo: repo.slug, dir: repoDir }, "Repository directory not found, skipping");
      continue;
    }

    const files = walkDirectory(repoDir, repo.fileExtensions);
    logger.info({ repo: repo.slug, fileCount: files.length }, "Ingesting repo");

    const chunks: LegalChunk[] = [];

    for (const filePath of files) {
      try {
        const text = await extractTextFromFile(filePath);
        if (!text || text.trim().length < MIN_CHUNK_LENGTH) continue;

        const textChunks = chunkText(text, CHUNK_MAX_SIZE, CHUNK_OVERLAP);

        for (const chunk of textChunks) {
          if (chunk.text.trim().length < MIN_CHUNK_LENGTH) continue;

          chunks.push({
            content: chunk.text.trim(),
            source: getSourceName(repo, filePath),
            chapter: getChapterFromFilePath(filePath),
            category: repo.category,
            attribution: repo.attribution,
          });
        }

        stats.filesProcessed++;
      } catch (err) {
        logger.warn({ filePath, err }, "Error processing file");
        stats.errors++;
      }
    }

    insertChunks(db, chunks);
    stats.chunksInserted += chunks.length;
    stats.reposProcessed++;

    logger.info({ repo: repo.slug, chunks: chunks.length }, "Repo ingested");
  }

  logger.info(stats, "Knowledge base ingestion complete");
  return stats;
}

async function ingestDirectScan(
  db: ReturnType<typeof getKnowledgeDb>,
  stats: IngestionStats
): Promise<void> {
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    logger.warn({ dir: KNOWLEDGE_BASE_DIR }, "Knowledge base directory does not exist");
    return;
  }

  const allFiles = walkDirectory(KNOWLEDGE_BASE_DIR, [".md", ".txt", ".rst", ".pdf"]);
  const chunks: LegalChunk[] = [];

  for (const filePath of allFiles) {
    try {
      const text = await extractTextFromFile(filePath);
      if (!text || text.trim().length < MIN_CHUNK_LENGTH) continue;

      const textChunks = chunkText(text, CHUNK_MAX_SIZE, CHUNK_OVERLAP);
      const relative = path.relative(KNOWLEDGE_BASE_DIR, filePath);
      const parts = relative.split(path.sep);
      const repoSlug = parts[0] || "unknown";
      const fileName = path.basename(filePath, path.extname(filePath));

      for (const chunk of textChunks) {
        if (chunk.text.trim().length < MIN_CHUNK_LENGTH) continue;

        chunks.push({
          content: chunk.text.trim(),
          source: `${repoSlug} — ${relative}`,
          chapter: fileName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          category: repoSlug,
          attribution: `Knowledge base — ${repoSlug}`,
        });
      }

      stats.filesProcessed++;
    } catch (err) {
      logger.warn({ filePath, err }, "Error processing file in direct scan");
      stats.errors++;
    }
  }

  insertChunks(db, chunks);
  stats.chunksInserted = chunks.length;
  stats.reposProcessed = 20;
}
