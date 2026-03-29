/**
 * Vendored token counter — simplified BPE tokenization estimate
 * Inspired by: https://github.com/dqbd/tiktoken (MIT)
 * Uses character-level heuristics to estimate token counts compatible with cl100k_base.
 * For precise counts use the actual tiktoken library; this is a fast local approximation.
 */

const COMMON_WORDS = new Set([
  'the', 'of', 'and', 'a', 'to', 'in', 'is', 'that', 'it', 'was', 'for',
  'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be', 'this', 'from',
  'or', 'one', 'had', 'by', 'not', 'but', 'what', 'all', 'were', 'when',
  'we', 'there', 'can', 'an', 'your', 'which', 'their', 'said', 'if', 'do',
  'will', 'each', 'about', 'how', 'up', 'out', 'them', 'then', 'she', 'many',
  'some', 'so', 'these', 'would', 'other', 'into', 'has', 'more', 'two',
  'her', 'him', 'he', 'its', 'also', 'where', 'after', 'who', 'been', 'over',
  'such', 'may', 'no', 'only', 'new', 'shall', 'any', 'upon', 'being', 'own',
]);

const LEGAL_TERMS = new Set([
  'plaintiff', 'defendant', 'respondent', 'applicant', 'court', 'rule',
  'section', 'statute', 'judgment', 'order', 'interdict', 'mandamus',
  'certiorari', 'habeas', 'corpus', 'mandament', 'spoliation', 'mandament',
  'declaratory', 'relief', 'affidavit', 'summons', 'notice', 'motion',
  'application', 'appeal', 'review', 'jurisdiction', 'locus', 'standi',
  'res', 'judicata', 'causa', 'prima', 'facie', 'bona', 'fide', 'mala',
]);

function estimateWordTokens(word: string): number {
  const lower = word.toLowerCase();

  if (COMMON_WORDS.has(lower)) return 1;
  if (LEGAL_TERMS.has(lower)) return 1;
  if (word.length <= 3) return 1;
  if (word.length <= 6) return 1;
  if (word.length <= 10) return 1 + Math.floor((word.length - 6) / 4);
  return Math.ceil(word.length / 4);
}

export function countTokens(text: string): number {
  if (!text || text.length === 0) return 0;

  const tokens = text.split(/(\s+|[.,;:!?()[\]{}"'`~@#$%^&*+=<>|/\\-]+)/);

  let count = 0;
  for (const token of tokens) {
    if (!token || /^\s+$/.test(token)) {
      continue;
    }
    if (/^[.,;:!?()[\]{}"'`~@#$%^&*+=<>|/\\-]+$/.test(token)) {
      count += 1;
      continue;
    }
    count += estimateWordTokens(token);
  }

  return count;
}

export function countTokensInMessages(messages: Array<{ role: string; content: string }>): number {
  let total = 0;
  for (const msg of messages) {
    total += 4;
    total += countTokens(msg.role);
    total += countTokens(msg.content);
  }
  total += 3;
  return total;
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentCount = countTokens(text);
  if (currentCount <= maxTokens) return text;

  const ratio = maxTokens / currentCount;
  const approxCharLimit = Math.floor(text.length * ratio * 0.9);

  const truncated = text.slice(0, approxCharLimit);
  const lastPeriod = truncated.lastIndexOf('. ');
  if (lastPeriod > approxCharLimit * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated;
}

export function estimateCompletionTokens(prompt: string): number {
  const inputTokens = countTokens(prompt);
  return Math.min(Math.ceil(inputTokens * 0.8), 4096);
}

export function fitsInContext(text: string, contextWindow: number, reservedForOutput: number = 1024): boolean {
  const tokens = countTokens(text);
  return tokens + reservedForOutput <= contextWindow;
}
