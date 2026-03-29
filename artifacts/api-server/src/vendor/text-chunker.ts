/**
 * Vendored text chunker — recursive character / paragraph text-splitting
 * Ported from langchain-ai/langchainjs text-splitters
 * Source: https://github.com/langchain-ai/langchainjs (MIT)
 * Breaks long legal documents into RAG-ready chunks with configurable overlap.
 */

export interface DocumentChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
  tokenEstimate: number;
}

export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  keepSeparator?: boolean;
  minChunkSize?: number;
}

const DEFAULT_SEPARATORS = [
  '\n\n\n',
  '\n\n',
  '\n',
  '. ',
  '! ',
  '? ',
  '; ',
  ', ',
  ' ',
  '',
];

const LEGAL_SEPARATORS = [
  '\n\n\n',
  '\n\n',
  '\n',
  '. ',
  '; ',
  ', ',
  ' ',
  '',
];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitByChar(text: string, separator: string): string[] {
  if (separator === '') {
    return text.split('');
  }
  return text.split(separator);
}

function mergeChunks(splits: string[], separator: string, chunkSize: number, chunkOverlap: number): string[] {
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const split of splits) {
    const splitLength = split.length;

    if (currentLength + splitLength + (currentChunk.length > 0 ? separator.length : 0) > chunkSize) {
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join(separator);
        if (chunkText.trim().length > 0) {
          chunks.push(chunkText);
        }

        while (currentLength > chunkOverlap && currentChunk.length > 0) {
          const removed = currentChunk.shift()!;
          currentLength -= removed.length + (currentChunk.length > 0 ? separator.length : 0);
        }
      }
    }

    currentChunk.push(split);
    currentLength += splitLength + (currentChunk.length > 1 ? separator.length : 0);
  }

  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(separator);
    if (chunkText.trim().length > 0) {
      chunks.push(chunkText);
    }
  }

  return chunks;
}

function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number,
  keepSeparator: boolean
): string[] {
  const finalChunks: string[] = [];

  let separator = separators[separators.length - 1];
  let newSeparators: string[] = [];

  for (let i = 0; i < separators.length; i++) {
    const sep = separators[i];
    if (sep === '' || text.includes(sep)) {
      separator = sep;
      newSeparators = separators.slice(i + 1);
      break;
    }
  }

  const splits = splitByChar(text, separator);
  const goodSplits: string[] = [];

  const sepToUse = keepSeparator ? separator : '';

  for (const split of splits) {
    if (split.trim().length === 0) continue;

    if (split.length < chunkSize) {
      goodSplits.push(split);
    } else {
      if (goodSplits.length > 0) {
        const merged = mergeChunks(goodSplits, sepToUse, chunkSize, chunkOverlap);
        finalChunks.push(...merged);
        goodSplits.length = 0;
      }

      if (newSeparators.length === 0) {
        finalChunks.push(split);
      } else {
        const subChunks = recursiveSplit(split, newSeparators, chunkSize, chunkOverlap, keepSeparator);
        finalChunks.push(...subChunks);
      }
    }
  }

  if (goodSplits.length > 0) {
    const merged = mergeChunks(goodSplits, sepToUse, chunkSize, chunkOverlap);
    finalChunks.push(...merged);
  }

  return finalChunks;
}

export function chunkDocument(text: string, options: ChunkerOptions = {}): DocumentChunk[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separators = DEFAULT_SEPARATORS,
    keepSeparator = false,
    minChunkSize = 50,
  } = options;

  if (!text || text.trim().length === 0) return [];

  const rawChunks = recursiveSplit(text, separators, chunkSize, chunkOverlap, keepSeparator);

  const filteredChunks = rawChunks.filter(c => c.trim().length >= minChunkSize);

  const result: DocumentChunk[] = [];
  let charPos = 0;

  for (let i = 0; i < filteredChunks.length; i++) {
    const chunkText = filteredChunks[i];
    const startChar = text.indexOf(chunkText, charPos);
    const endChar = startChar >= 0 ? startChar + chunkText.length : charPos + chunkText.length;

    result.push({
      text: chunkText,
      index: i,
      startChar: Math.max(0, startChar),
      endChar,
      tokenEstimate: estimateTokens(chunkText),
    });

    charPos = Math.max(0, startChar + chunkText.length - chunkOverlap);
  }

  return result;
}

export function chunkLegalDocument(text: string, options: ChunkerOptions = {}): DocumentChunk[] {
  return chunkDocument(text, {
    chunkSize: 1500,
    chunkOverlap: 300,
    separators: LEGAL_SEPARATORS,
    keepSeparator: true,
    minChunkSize: 100,
    ...options,
  });
}

export function chunkForRAG(text: string, maxTokens = 512): DocumentChunk[] {
  const chunkSize = maxTokens * 4;
  const overlap = Math.floor(chunkSize * 0.15);
  return chunkDocument(text, {
    chunkSize,
    chunkOverlap: overlap,
    separators: LEGAL_SEPARATORS,
    minChunkSize: 50,
  });
}
