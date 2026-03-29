/**
 * One-time seeding script: Civil Procedure (Superior Courts) Module BLAW 302
 *
 * Reads the docx source file, splits it by unit headings and sub-section headings,
 * inserts each section into notesTable with extracted key cases and key rules,
 * and inserts a statute record in statutesTable for library visibility.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { notesTable, statutesTable } from "./schema/library.js";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";
import { inflateRawSync } from "zlib";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { sql } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { notesTable, statutesTable } });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCX_PATH = join(
  __dirname,
  "../../../attached_assets/CIVIL_PROCEDURE_(SUPERIOR_COURTS)_MODULE_(1)_1774762385108.docx"
);

function extractDocxXML(docxPath: string): string {
  const buf = readFileSync(docxPath);
  const targetName = "word/document.xml";
  let pos = 0;

  while (pos < buf.length - 4) {
    if (
      buf[pos] === 0x50 &&
      buf[pos + 1] === 0x4b &&
      buf[pos + 2] === 0x03 &&
      buf[pos + 3] === 0x04
    ) {
      const compression = buf.readUInt16LE(pos + 8);
      const compSize = buf.readUInt32LE(pos + 18);
      const nameLen = buf.readUInt16LE(pos + 26);
      const extraLen = buf.readUInt16LE(pos + 28);
      const name = buf.slice(pos + 30, pos + 30 + nameLen).toString("utf8");
      const dataStart = pos + 30 + nameLen + extraLen;

      if (name === targetName) {
        const compressed = buf.slice(dataStart, dataStart + compSize);
        if (compression === 8) {
          return inflateRawSync(compressed).toString("utf8");
        }
        return compressed.toString("utf8");
      }
      pos = dataStart + compSize;
    } else {
      pos++;
    }
  }

  throw new Error(`${targetName} not found in docx archive`);
}

function xmlToParagraphs(xml: string): string[] {
  return xml.split(/<w:p[ w>]/).map((pEl) => {
    const texts: string[] = [];
    const tRx = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m: RegExpExecArray | null;
    while ((m = tRx.exec(pEl)) !== null) {
      texts.push(m[1]);
    }
    return texts.join("").trim();
  });
}

const UNIT_TOPICS: Record<number, string> = {
  1: "Jurisdiction of the High Court",
  2: "Attachment to Found or Confirm Jurisdiction",
  3: "Security for Costs",
  4: "Locus Standi",
  5: "Joinder and Substitution of Parties",
  6: "Forms of Proceedings",
  7: "Applications in General",
  8: "Court Applications",
  9: "Urgent Applications",
  10: "Proceedings in Matrimonial Matters",
  11: "Interdicts",
  12: "Action Proceedings",
  13: "Summary Judgment",
  14: "Plea and Exceptions",
  15: "Dismissal of Action",
  16: "Closure of Pleadings",
  17: "Discovery and Pre-Trial Conference",
  18: "Setting Down for Trial and Types of Judgment",
  19: "Correction, Variation and Rescission of Judgments",
  20: "Provisional Sentence",
  21: "Interpleader Proceedings",
  22: "Costs of Suit",
  23: "Collection Commission",
  24: "Taxation of Costs",
  25: "Reviews and Exhaustion of Domestic Remedies",
  26: "Declaratory Orders",
  27: "Appeals from High Court to Supreme Court",
  28: "Miscellaneous Applications",
  29: "Enforcement of Court Judgments",
  30: "The Constitutional Court of Zimbabwe",
};

interface Section {
  unit: number;
  topic: string;
  content: string;
  keyCases: string[];
  keyRules: string[];
  tags: string[];
}

function extractCaseNames(text: string): string[] {
  const cases = new Set<string>();

  const patterns = [
    /[A-Z][a-z]+(?: [A-Z][a-z]+)*(?: \(Pvt\) Ltd| \(Pty\) Ltd)?\s+v\s+[A-Z][a-z]+(?: [A-Z][a-z]+)*(?: \(Pvt\) Ltd| \(Pty\) Ltd)?(?:\s+(?:HH|SC|HB|HC|S|AD)\s*\d+[-/]\d+)?/g,
    /[A-Z][a-z]+(?: [A-Z][a-z]+)?\s+v\s+[A-Z][a-z]+(?: [A-Z][a-z]+)?\s+\d{4}\s*\(\d+\)\s+ZLR\s+\d+/g,
  ];

  for (const pat of patterns) {
    const matches = [...text.matchAll(pat)];
    for (const m of matches) {
      const caseName = m[0].trim();
      if (caseName.length > 8 && caseName.length < 200) {
        cases.add(caseName);
      }
    }
  }

  return [...cases].slice(0, 20);
}

function extractKeyRules(text: string): string[] {
  const rules = new Set<string>();

  const patterns = [
    /[Ss]ection\s+\d+(?:\(\d+\))?(?:[a-z])?\s+of\s+the\s+[A-Z][^.]{5,60}?(?:Act|Rules?)/g,
    /[Ss]\.\s*\d+(?:\(\d+\))?(?:[a-z])?\s+of\s+the\s+[A-Z][^.]{5,60}?(?:Act|Rules?)/g,
    /Rule\s+\d+(?:\s+[Ss]ubrule\s*\(\d+\))?(?:\s+of\s+the\s+High Court Rules)?/gi,
    /SI\s+\d+\s+of\s+\d{4}/gi,
    /Chapter\s+\d+:\d+/gi,
    /Order\s+\d+(?:\s+Rule\s+\d+)?/g,
    /High Court Rules?(?:\s+SI\s+\d+\s+of\s+\d{4})?/gi,
    /[A-Z][a-z]+(?: [A-Z][a-z]+)* Act(?:\s+Chapter\s+\d+:\d+)?/g,
    /Constitution(?:\s+of\s+Zimbabwe)?(?:,?\s+\d{4})?(?:,?\s+[Ss](?:ection)?\s+\d+)?/gi,
    /Form\s+(?:No\.)?\s*\d+/gi,
  ];

  for (const pat of patterns) {
    const matches = [...text.matchAll(pat)];
    for (const m of matches) {
      const rule = m[0].trim();
      if (rule.length > 5 && rule.length < 150) {
        rules.add(rule);
      }
    }
  }

  return [...rules].slice(0, 20);
}

function splitIntoSections(paragraphs: string[]): Section[] {
  const sections: Section[] = [];

  let currentUnit = 0;
  let currentTopic = "";
  let currentContent: string[] = [];
  let contentLength = 0;

  const UNIT_HEADING = /^UNIT\s+(\d+)$/;
  const NUMBERED_HEADING = /^(\d+\.\d+(?:\.\d+)*\.?\s{0,5}.{3,80})$/;

  const saveSection = () => {
    if (currentTopic && currentContent.length > 0) {
      const content = currentContent.join("\n").trim();
      if (content.length > 100) {
        sections.push({
          unit: currentUnit,
          topic: currentTopic,
          content,
          keyCases: extractCaseNames(content),
          keyRules: extractKeyRules(content),
          tags: ["civil-procedure", "BLAW302", "high-court"],
        });
      }
    }
    currentContent = [];
    contentLength = 0;
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) continue;

    const unitMatch = UNIT_HEADING.exec(p);
    if (unitMatch) {
      saveSection();
      currentUnit = parseInt(unitMatch[1]);
      const unitTopic = UNIT_TOPICS[currentUnit] || `Unit ${currentUnit}`;
      currentTopic = `Unit ${currentUnit}: ${unitTopic}`;
      currentContent = [];
      contentLength = 0;
      continue;
    }

    if (currentUnit === 0) continue;

    const numberedMatch = NUMBERED_HEADING.exec(p);
    if (numberedMatch && contentLength > 400) {
      saveSection();
      currentTopic = `Unit ${currentUnit}: ${p.trim()}`;
    }

    currentContent.push(p);
    contentLength += p.length;
  }

  saveSection();

  return sections;
}

async function seedCivilProcedure() {
  console.log("Extracting text from docx...");
  const xml = extractDocxXML(DOCX_PATH);
  const paragraphs = xmlToParagraphs(xml).filter((p) => p.trim());
  console.log(`Extracted ${paragraphs.length} paragraphs`);

  const sections = splitIntoSections(paragraphs);
  console.log(`Split into ${sections.length} sections`);

  console.log("Removing existing BLAW302 civil procedure notes...");
  await db.execute(
    sql`DELETE FROM notes WHERE tags && ARRAY['BLAW302']::text[]`
  );

  console.log("Inserting sections into notesTable...");
  let inserted = 0;
  for (const section of sections) {
    await db.insert(notesTable).values({
      unit: section.unit,
      topic: section.topic,
      content: section.content,
      keyCases: section.keyCases,
      keyRules: section.keyRules,
      tags: section.tags,
    });
    inserted++;
    if (inserted % 10 === 0) {
      process.stdout.write(`\r  Inserted ${inserted}/${sections.length} sections...`);
    }
  }
  console.log(`\nInserted ${inserted} sections total`);

  console.log("Removing existing BLAW302 statute record if any...");
  await db
    .delete(statutesTable)
    .where(eq(statutesTable.title, "Civil Procedure (Superior Courts) Module BLAW 302"));

  console.log("Inserting statute record for library visibility...");
  await db.insert(statutesTable).values({
    title: "Civil Procedure (Superior Courts) Module BLAW 302",
    chapter: "BLAW302",
    category: "Civil Procedure",
    summary:
      "Author: Scott Panashe Mamimine LLB, LLM (Midlands State University). " +
      "Comprehensive academic module covering Zimbabwe High Court civil procedure including: " +
      "jurisdiction (Unit 1), attachment to found jurisdiction (Unit 2), security for costs (Unit 3), " +
      "locus standi (Unit 4), joinder of parties (Unit 5), forms of proceedings (Unit 6), " +
      "applications (Units 7-9), matrimonial matters (Unit 10), interdicts (Unit 11), " +
      "action proceedings and pleadings (Units 12-16), discovery and trial (Units 17-18), " +
      "judgments and rescission (Units 19-20), interpleader (Unit 21), costs (Units 22-24), " +
      "reviews and declaratory orders (Units 25-26), appeals (Unit 27), " +
      "enforcement of judgments (Unit 29), and the Constitutional Court (Unit 30). " +
      "30 units covering all aspects of civil procedure in the Superior Courts of Zimbabwe.",
    lastUpdated: new Date().toISOString().slice(0, 10),
    tags: ["civil-procedure", "BLAW302", "high-court", "MSU", "academic"],
  });

  console.log("Civil Procedure (BLAW 302) seeding complete!");
  await pool.end();
}

seedCivilProcedure().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
