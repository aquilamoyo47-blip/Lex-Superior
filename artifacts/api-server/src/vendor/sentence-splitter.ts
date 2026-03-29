/**
 * Vendored sentence splitter and text tokenizer
 * Inspired by: Sentence Boundary Detection (SBD) and punkt algorithm patterns
 * Source patterns: https://github.com/nicktindall/cyclic-swd / various NLP SBD libs (MIT)
 * Adapted for legal text chunking.
 */

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'rev', 'hon', 'adv', 'j', 'jj', 'aj', 'ja', 'cj', 'dcj',
  'sr', 'jr', 'vs', 'etc', 'e.g', 'i.e', 'ibid', 'op', 'cit', 'supra', 'infra', 'cf',
  'no', 'nos', 'vol', 'para', 'paras', 'cl', 'cls', 'pt', 'pts', 'ch', 'art',
  'sec', 'ss', 'reg', 'regs', 'sch', 'app', 'govt', 'govt', 'co', 'ltd', 'inc', 'corp',
  'pp', 'pg', 'ed', 'eds', 'fig', 'approx', 'dept', 'est', 'min', 'max', 'avg',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]);

const SENTENCE_END = /[.!?]+/;
const UPPERCASE_LETTER = /^[A-Z]/;

function isAbbreviation(word: string): boolean {
  const lower = word.toLowerCase().replace(/\.$/, '');
  return ABBREVIATIONS.has(lower) || /^[a-z]$/.test(lower) || /^\d+$/.test(lower);
}

function isSentenceBoundary(tokens: string[], index: number): boolean {
  const token = tokens[index];
  if (!SENTENCE_END.test(token.slice(-1))) return false;

  const word = token.replace(SENTENCE_END, '');
  if (isAbbreviation(word)) return false;

  const next = tokens[index + 1];
  if (!next) return true;

  if (!UPPERCASE_LETTER.test(next)) return false;

  if (/^\d+$/.test(next)) return false;

  return true;
}

export function splitSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const paragraphs = normalized.split(/\n\n+/);
  const sentences: string[] = [];

  for (const para of paragraphs) {
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
    const paraText = lines.join(' ');

    if (paraText.length === 0) continue;

    const tokens = paraText.split(/\s+/);
    let currentSentence: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      currentSentence.push(tokens[i]);

      if (isSentenceBoundary(tokens, i)) {
        const sentence = currentSentence.join(' ').trim();
        if (sentence.length > 0) sentences.push(sentence);
        currentSentence = [];
      }
    }

    if (currentSentence.length > 0) {
      const sentence = currentSentence.join(' ').trim();
      if (sentence.length > 0) sentences.push(sentence);
    }
  }

  return sentences.filter(s => s.length > 0);
}

export interface TextChunk {
  text: string;
  index: number;
  charStart: number;
  charEnd: number;
}

export function chunkText(text: string, maxChunkSize: number = 1500, overlap: number = 200): TextChunk[] {
  const sentences = splitSentences(text);
  const chunks: TextChunk[] = [];

  let currentChunk: string[] = [];
  let currentSize = 0;
  let charStart = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceSize = sentence.length + 1;

    if (currentSize + sentenceSize > maxChunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      chunks.push({
        text: chunkText,
        index: chunkIndex++,
        charStart,
        charEnd: charStart + chunkText.length,
      });

      const overlapSentences: string[] = [];
      let overlapSize = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        overlapSize += currentChunk[i].length + 1;
        if (overlapSize > overlap) break;
        overlapSentences.unshift(currentChunk[i]);
      }

      charStart += chunkText.length - overlapSentences.join(' ').length;
      currentChunk = overlapSentences;
      currentSize = overlapSentences.reduce((acc, s) => acc + s.length + 1, 0);
    }

    currentChunk.push(sentence);
    currentSize += sentenceSize;
  }

  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    chunks.push({
      text: chunkText,
      index: chunkIndex,
      charStart,
      charEnd: charStart + chunkText.length,
    });
  }

  return chunks;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function characterCount(text: string): number {
  return text.length;
}

export function stripWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
