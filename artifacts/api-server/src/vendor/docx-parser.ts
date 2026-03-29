/**
 * Vendored DOCX parser — core XML-extraction logic ported from mammoth.js
 * Source: https://github.com/mwilliamson/mammoth.js (BSD-2-Clause)
 * Extracts plain text from uploaded .docx files, complementing the existing PDF parser.
 * DOCX format is a ZIP archive containing XML files; we parse the word/document.xml.
 * Supports both stored (compression=0) and DEFLATE-compressed (compression=8) entries
 * using Node.js built-in zlib.inflateRawSync.
 */

import { inflateRawSync } from "zlib";

export interface DocxParseResult {
  text: string;
  paragraphs: string[];
  wordCount: number;
  characterCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    created?: string;
    modified?: string;
  };
  warnings: string[];
}

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<w:br[^>]*\/>/gi, '\n')
    .replace(/<w:p[ />][^>]*>/gi, '\n')
    .replace(/<\/w:p>/gi, '')
    .replace(/<w:tab[^>]*\/>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function extractXmlContent(xmlContent: string): string[] {
  const paragraphs: string[] = [];

  const paragraphRegex = /<w:p[ >][^]*?<\/w:p>/gi;
  let paraMatch: RegExpExecArray | null;

  while ((paraMatch = paragraphRegex.exec(xmlContent)) !== null) {
    const paraXml = paraMatch[0];

    const textParts: string[] = [];
    const runRegex = /<w:r[ >][^]*?<\/w:r>/gi;
    let runMatch: RegExpExecArray | null;

    while ((runMatch = runRegex.exec(paraXml)) !== null) {
      const runXml = runMatch[0];
      const textMatch = /<w:t[^>]*>([^<]*)<\/w:t>/gi.exec(runXml);
      if (textMatch) {
        textParts.push(textMatch[1]);
      }
    }

    const paraText = textParts.join('').trim();
    if (paraText.length > 0) {
      paragraphs.push(paraText);
    }
  }

  if (paragraphs.length === 0) {
    const plainText = stripXmlTags(xmlContent);
    return plainText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
  }

  return paragraphs;
}

function extractMetadata(coreXml: string): DocxParseResult['metadata'] {
  const meta: DocxParseResult['metadata'] = {};

  const titleMatch = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();

  const authorMatch = coreXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  if (authorMatch) meta.author = authorMatch[1].trim();

  const subjectMatch = coreXml.match(/<dc:subject[^>]*>([^<]+)<\/dc:subject>/i);
  if (subjectMatch) meta.subject = subjectMatch[1].trim();

  const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/i);
  if (createdMatch) meta.created = createdMatch[1].trim();

  const modifiedMatch = coreXml.match(/<dcterms:modified[^>]*>([^<]+)<\/dcterms:modified>/i);
  if (modifiedMatch) meta.modified = modifiedMatch[1].trim();

  return meta;
}

function isDocxBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function extractZipEntries(buffer: Buffer): Map<string, string> {
  const entries = new Map<string, string>();

  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const filenameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);

    const filenameStart = offset + 30;
    const filenameEnd = filenameStart + filenameLen;

    if (filenameEnd > buffer.length) break;
    const filename = buffer.slice(filenameStart, filenameEnd).toString('utf8');

    const dataStart = filenameEnd + extraLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > buffer.length) break;

    try {
      if (compression === 0) {
        const content = buffer.slice(dataStart, dataEnd).toString('utf8');
        entries.set(filename, content);
      } else if (compression === 8) {
        const compressed = buffer.slice(dataStart, dataEnd);
        const decompressed = inflateRawSync(compressed);
        entries.set(filename, decompressed.toString('utf8'));
      }
    } catch {
    }

    offset = dataEnd;
  }

  return entries;
}

export async function parseDocx(buffer: Buffer): Promise<DocxParseResult> {
  const warnings: string[] = [];

  if (!isDocxBuffer(buffer)) {
    throw new Error('Invalid DOCX: file does not start with ZIP magic bytes (PK)');
  }

  let documentXml = '';
  let coreXml = '';

  try {
    const entries = extractZipEntries(buffer);

    documentXml = entries.get('word/document.xml') ?? '';
    coreXml = entries.get('docProps/core.xml') ?? '';

    if (!documentXml) {
      warnings.push('Could not extract word/document.xml from DOCX archive');
    }
  } catch (err) {
    warnings.push(`ZIP extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const paragraphs = extractXmlContent(documentXml);
  const metadata = coreXml ? extractMetadata(coreXml) : {};

  const text = paragraphs.join('\n');

  return {
    text,
    paragraphs,
    wordCount: text.trim().split(/\s+/).filter(w => w.length > 0).length,
    characterCount: text.length,
    metadata,
    warnings,
  };
}

export async function parseDocxBase64(base64: string): Promise<DocxParseResult> {
  const buffer = Buffer.from(base64, 'base64');
  return parseDocx(buffer);
}

export function isDocxFile(filename: string): boolean {
  return /\.docx$/i.test(filename);
}
