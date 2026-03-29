/**
 * One-time ingestion script for Palmer Law Firm precedents.
 * Run: scripts/node_modules/.bin/tsx scripts/ingest-palmer.ts
 *
 * Reads attached_assets/palmer_1774766398129.zip using Node's built-in
 * zlib + fs, parses each DOCX/DOC/PDF with vendored parsers, classifies
 * by category via keyword heuristics, and inserts into the precedents table.
 */

import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync } from "fs";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import { inflateRawSync } from "zlib";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
// @ts-ignore — one-time script, cross-root import intentional
import { precedentsTable } from "../lib/db/src/schema/library.js";
// @ts-ignore — one-time script, cross-root import intentional
import { parseDocx } from "../artifacts/api-server/src/vendor/docx-parser.js";
// @ts-ignore — one-time script, cross-root import intentional
import { parsePDF } from "../artifacts/api-server/src/vendor/pdf-parser.js";
// @ts-ignore — one-time script, cross-root import intentional
import { tagStatutesInText } from "../artifacts/api-server/src/vendor/statute-tagger.js";
// @ts-ignore — one-time script, cross-root import intentional
import { extractLegalKeywords } from "../artifacts/api-server/src/vendor/keyword-extractor.js";
// @ts-ignore — word-extractor has no bundled types
import WordExtractor from "word-extractor";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = join(__dirname, "../attached_assets/palmer_1774766398129.zip");
const EXTRACT_DIR = "/tmp/palmer_ingest";

interface ZipCentralEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  compression: number;
  localHeaderOffset: number;
}

function readZipCentralDirectory(buf: Buffer): ZipCentralEntry[] {
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Cannot find EOCD record");

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const entries: ZipCentralEntry[] = [];

  let pos = cdOffset;
  const cdEnd = cdOffset + cdSize;

  while (pos < cdEnd && pos + 46 <= buf.length) {
    const sig = buf.readUInt32LE(pos);
    if (sig !== 0x02014b50) break;

    const compression = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const filenameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);

    const filename = buf.slice(pos + 46, pos + 46 + filenameLen).toString("utf8");

    entries.push({ filename, compressedSize, uncompressedSize, compression, localHeaderOffset });
    pos += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}

function extractFileData(buf: Buffer, entry: ZipCentralEntry): Buffer {
  const off = entry.localHeaderOffset;
  const fnLen = buf.readUInt16LE(off + 26);
  const exLen = buf.readUInt16LE(off + 28);
  const dataStart = off + 30 + fnLen + exLen;

  const raw = buf.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === 0) return raw;
  if (entry.compression === 8) return inflateRawSync(raw);
  throw new Error(`Unsupported compression: ${entry.compression}`);
}

function extractZipToDir(zipPath: string, outDir: string): string[] {
  const buf = readFileSync(zipPath);
  const entries = readZipCentralDirectory(buf);
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.filename.endsWith("/")) continue;

    const outPath = join(outDir, entry.filename);
    mkdirSync(dirname(outPath), { recursive: true });

    try {
      const data = extractFileData(buf, entry);
      writeFileSync(outPath, data);
      files.push(outPath);
    } catch (err) {
      console.warn(`  Failed to extract ${entry.filename}: ${err}`);
    }
  }

  return files;
}

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Labour Law",
    keywords: [
      "labour", "labor", "employment", "dismissal", "retrenchment",
      "unfair", "national employment council", "nec", "termination",
      "employee", "employer", "wages", "misconduct", "disciplinary",
      "conciliation", "arbitration", "labour court", "labour officer",
      "referral", "chapter 28"
    ]
  },
  {
    category: "Property / Conveyancing",
    keywords: [
      "agreement of sale", "sale of property", "immovable property",
      "purchase price", "transfer", "conveyancing", "deed",
      "title deed", "seller", "purchaser", "erf", "stand",
      "mortgage", "bond", "lease", "rental", "tenant", "landlord",
      "lessor", "lessee", "premises", "occupation", "deposit",
      "sectional title", "real rights"
    ]
  },
  {
    category: "Civil Procedure",
    keywords: [
      "high court", "application", "respondent", "applicant",
      "summons", "declaration", "plea", "notice of motion",
      "founding affidavit", "court application", "order of court",
      "chamber application", "urgent", "interdict", "mandamus",
      "heads of argument", "rule nisi", "service", "sheriff",
      "default judgment", "appearance to defend", "condonation",
      "exception", "discovery"
    ]
  },
  {
    category: "Criminal",
    keywords: [
      "criminal", "accused", "prosecution", "state v",
      "theft", "fraud", "assault", "robbery", "murder",
      "magistrate", "sentence", "convicted", "bail",
      "charge", "guilty", "not guilty", "verdict", "acquittal"
    ]
  },
  {
    category: "Corporate",
    keywords: [
      "company", "director", "shareholder", "share", "cobe",
      "private limited", "pvt ltd", "memorandum", "articles",
      "joint venture", "partnership", "commercial", "contract",
      "agreement", "breach", "damages", "debt", "creditor",
      "debtor", "promissory note", "deed of settlement", "assumption of agency",
      "lotteries", "gaming", "acknowledgment of debt"
    ]
  },
  {
    category: "Property / Conveyancing",
    keywords: [
      "deceased estate", "executor", "estates", "letters of administration",
      "will", "testator", "beneficiary", "master of the high court",
      "inheritance"
    ]
  },
];

function classify(text: string, filename: string): string {
  const lower = (text + " " + filename).toLowerCase();
  const scores: Record<string, number> = {};

  for (const rule of CATEGORY_RULES) {
    let score = scores[rule.category] ?? 0;
    for (const kw of rule.keywords) {
      const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const matches = lower.match(regex);
      if (matches) score += matches.length;
    }
    scores[rule.category] = score;
  }

  try {
    const tagged = tagStatutesInText(text);
    for (const t of tagged) {
      for (const subj of t.statute.subject) {
        const sl = subj.toLowerCase();
        if (sl.includes("labour") || sl.includes("employment"))
          scores["Labour Law"] = (scores["Labour Law"] ?? 0) + 3;
        if (sl.includes("property") || sl.includes("conveyancing") || sl.includes("land"))
          scores["Property / Conveyancing"] = (scores["Property / Conveyancing"] ?? 0) + 3;
        if (sl.includes("companies") || sl.includes("corporate"))
          scores["Corporate"] = (scores["Corporate"] ?? 0) + 3;
        if (sl.includes("civil procedure") || sl.includes("pleadings") || sl.includes("applications"))
          scores["Civil Procedure"] = (scores["Civil Procedure"] ?? 0) + 3;
      }
    }
  } catch {}

  try {
    const keywords = extractLegalKeywords(text, 10);
    for (const kw of keywords) {
      const kl = kw.toLowerCase();
      if (["labour", "employ", "dismiss", "retrench"].some(t => kl.includes(t)))
        scores["Labour Law"] = (scores["Labour Law"] ?? 0) + 2;
      if (["property", "sale", "lease", "convey", "deed"].some(t => kl.includes(t)))
        scores["Property / Conveyancing"] = (scores["Property / Conveyancing"] ?? 0) + 2;
      if (["criminal", "bail", "accused", "sentence"].some(t => kl.includes(t)))
        scores["Criminal"] = (scores["Criminal"] ?? 0) + 2;
    }
  } catch {}

  let best = "Civil Procedure";
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return best;
}

function titleFromFilename(filename: string): string {
  const base = basename(filename);
  return base
    .replace(/\.(docx?|pdf)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractText(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();
  const data = readFileSync(filePath);

  if (ext === ".docx") {
    try {
      const result = await parseDocx(data);
      return result.text;
    } catch (err) {
      console.warn(`  DOCX parse failed for ${basename(filePath)}: ${err}`);
      return "";
    }
  }

  if (ext === ".doc") {
    try {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      const body = doc.getBody() ?? "";
      return body.trim();
    } catch (err) {
      console.warn(`  DOC parse (word-extractor) failed for ${basename(filePath)}: ${err}`);
      const raw = data.toString("latin1");
      const printable = raw
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s{3,}/g, "\n")
        .replace(/\s+/g, " ")
        .trim();
      return printable.length > 50 ? printable.slice(0, 100000) : "";
    }
  }

  if (ext === ".pdf") {
    try {
      const result = await parsePDF(data);
      return result.text;
    } catch (err) {
      console.warn(`  PDF parse failed for ${basename(filePath)}: ${err}`);
      return "";
    }
  }

  return "";
}

function makeExcerpt(text: string, maxLen = 600): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + "…" : cleaned;
}

async function main() {
  console.log("Reading ZIP:", ZIP_PATH);
  const zipBuffer = readFileSync(ZIP_PATH);
  console.log(`ZIP size: ${(zipBuffer.length / 1024).toFixed(1)} KB`);

  try { rmSync(EXTRACT_DIR, { recursive: true, force: true }); } catch {}
  mkdirSync(EXTRACT_DIR, { recursive: true });

  const allFiles = extractZipToDir(ZIP_PATH, EXTRACT_DIR);
  const docFiles = allFiles.filter(f => /\.(docx?|pdf)$/i.test(f));

  console.log(`Extracted ${allFiles.length} files, ${docFiles.length} documents to process`);

  const existing = await db.select({ filename: precedentsTable.filename }).from(precedentsTable);
  const existingSet = new Set(existing.map(e => e.filename));

  const records = [];

  for (const filePath of docFiles) {
    const fname = basename(filePath);
    if (existingSet.has(fname)) {
      console.log(`  Already exists: ${fname}`);
      continue;
    }

    console.log(`Processing: ${fname}`);
    const text = await extractText(filePath);

    if (!text || text.trim().length < 20) {
      console.warn(`  Skipping (too little text): ${fname}`);
      continue;
    }

    const title = titleFromFilename(fname);
    const category = classify(text, fname);
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const excerpt = makeExcerpt(text);
    const ft = extname(fname).toLowerCase().replace(".", "");

    console.log(`  → Category: ${category}, Words: ${wordCount}`);

    records.push({
      title,
      category,
      source: "Palmer Law Firm",
      filename: fname,
      fileType: ft,
      fullText: text.slice(0, 200000),
      excerpt,
      wordCount,
    });
  }

  const skipped: string[] = [];
  if (records.length > 0) {
    console.log(`\nInserting ${records.length} new precedent(s) into database...`);
    let inserted = 0;
    for (const record of records) {
      try {
        await db.insert(precedentsTable).values(record);
        inserted++;
      } catch (err) {
        console.error(`  Failed to insert ${record.filename}: ${err}`);
        skipped.push(record.filename);
      }
    }
    console.log(`Inserted: ${inserted}`);
    if (skipped.length > 0) console.warn(`Skipped: ${skipped.join(", ")}`);
  } else {
    console.log("\nNo new records to insert.");
  }

  const total = await db.select({ filename: precedentsTable.filename }).from(precedentsTable);
  console.log(`\n=== INGESTION REPORT ===`);
  console.log(`ZIP files total: ${allFiles.length}`);
  console.log(`Document files (DOCX/DOC/PDF): ${docFiles.length}`);
  console.log(`Non-document files skipped: ${allFiles.length - docFiles.length} (e.g. CSS)`);
  console.log(`Records inserted this run: ${records.length - skipped.length}`);
  console.log(`Total precedents in database: ${total.length}`);
  console.log(`========================`);

  if (total.length < docFiles.length) {
    console.error(`WARNING: ${docFiles.length - total.length} document(s) were not stored. Check logs above for skipped files.`);
  }

  try { rmSync(EXTRACT_DIR, { recursive: true, force: true }); } catch {}
  await pool.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
