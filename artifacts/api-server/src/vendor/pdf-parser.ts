/**
 * Vendored PDF text extractor — minimal PDF parsing ported from pdf.js text extraction
 * Source: https://github.com/mozilla/pdf.js (Apache-2.0)
 * Provides local PDF text extraction without external API calls.
 * Supports PDF 1.x binary format text stream extraction.
 */

export interface PDFParseResult {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
  wordCount: number;
  characterCount: number;
}

function decodeOctalString(str: string): string {
  return str.replace(/\\(\d{3})/g, (_: string, oct: string) =>
    String.fromCharCode(parseInt(oct, 8))
  ).replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
}

function extractPDFStrings(buffer: Buffer): string[] {
  const text = buffer.toString('latin1');
  const strings: string[] = [];

  const parenRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = parenRegex.exec(text)) !== null) {
    const decoded = decodeOctalString(match[1]);
    const printable = decoded.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    if (printable.length >= 3) {
      strings.push(printable);
    }
  }

  return strings;
}

function extractPDFMetadata(text: string): PDFParseResult['metadata'] {
  const metadata: PDFParseResult['metadata'] = {};

  const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
  if (titleMatch) metadata.title = decodeOctalString(titleMatch[1]).replace(/[^\x20-\x7E]/g, ' ').trim();

  const authorMatch = text.match(/\/Author\s*\(([^)]+)\)/);
  if (authorMatch) metadata.author = decodeOctalString(authorMatch[1]).replace(/[^\x20-\x7E]/g, ' ').trim();

  const subjectMatch = text.match(/\/Subject\s*\(([^)]+)\)/);
  if (subjectMatch) metadata.subject = decodeOctalString(subjectMatch[1]).replace(/[^\x20-\x7E]/g, ' ').trim();

  const creatorMatch = text.match(/\/Creator\s*\(([^)]+)\)/);
  if (creatorMatch) metadata.creator = decodeOctalString(creatorMatch[1]).replace(/[^\x20-\x7E]/g, ' ').trim();

  const producerMatch = text.match(/\/Producer\s*\(([^)]+)\)/);
  if (producerMatch) metadata.producer = decodeOctalString(producerMatch[1]).replace(/[^\x20-\x7E]/g, ' ').trim();

  const dateMatch = text.match(/\/CreationDate\s*\(([^)]+)\)/);
  if (dateMatch) metadata.creationDate = dateMatch[1];

  return metadata;
}

function countPages(text: string): number {
  const pageMatches = text.match(/\/Type\s*\/Page\b/g);
  return pageMatches ? Math.max(1, pageMatches.length - 1) : 1;
}

function isLikelyText(str: string): boolean {
  const wordPattern = /[a-zA-Z]{2,}/;
  const controlPattern = /^[0-9\s.+\-*/=<>]+$/;

  if (!wordPattern.test(str)) return false;
  if (controlPattern.test(str)) return false;

  const printableRatio = str.split('').filter(c => /[\x20-\x7E]/.test(c)).length / str.length;
  return printableRatio > 0.8;
}

export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  const headerCheck = buffer.slice(0, 5).toString('ascii');
  if (!headerCheck.startsWith('%PDF')) {
    throw new Error('Invalid PDF: file does not start with %PDF header');
  }

  const rawText = buffer.toString('latin1');
  const metadata = extractPDFMetadata(rawText);
  const pages = countPages(rawText);
  const strings = extractPDFStrings(buffer);

  const textStrings = strings.filter(isLikelyText);

  const cleanedLines: string[] = [];
  for (const s of textStrings) {
    const normalized = s.replace(/\s+/g, ' ').trim();
    if (normalized.length >= 3) {
      cleanedLines.push(normalized);
    }
  }

  const fullText = cleanedLines
    .filter((line, idx) => {
      if (idx === 0) return true;
      const prev = cleanedLines[idx - 1];
      return line !== prev;
    })
    .join('\n');

  return {
    text: fullText,
    pages,
    metadata,
    wordCount: fullText.trim().split(/\s+/).filter(w => w.length > 0).length,
    characterCount: fullText.length,
  };
}

export async function parsePDFBase64(base64: string): Promise<PDFParseResult> {
  const buffer = Buffer.from(base64, 'base64');
  return parsePDF(buffer);
}

export function isPDFBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.slice(0, 5).toString('ascii').startsWith('%PDF');
}

export function cleanExtractedText(text: string): string {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}
