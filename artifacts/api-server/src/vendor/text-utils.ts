/**
 * Vendored text utilities — string manipulation helpers
 * Source patterns from: https://github.com/component/words and various OSS string libs (MIT)
 * General text processing for legal document handling.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  const cutAt = maxLength - suffix.length;
  const lastSpace = text.lastIndexOf(' ', cutAt);
  if (lastSpace > cutAt * 0.8) {
    return text.slice(0, lastSpace) + suffix;
  }
  return text.slice(0, cutAt) + suffix;
}

export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titleCase(text: string): string {
  const SMALL_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'so', 'yet', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'v', 'vs']);
  return text
    .toLowerCase()
    .split(' ')
    .map((word, idx) => {
      if (idx === 0 || !SMALL_WORDS.has(word)) return capitalize(word);
      return word;
    })
    .join(' ');
}

export function pad(text: string, length: number, char = ' ', side: 'left' | 'right' | 'both' = 'right'): string {
  const padding = char.repeat(Math.max(0, length - text.length));
  if (side === 'left') return padding + text;
  if (side === 'both') {
    const half = Math.floor(padding.length / 2);
    return char.repeat(half) + text + char.repeat(padding.length - half);
  }
  return text + padding;
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractNumbers(text: string): number[] {
  const matches = text.match(/\b\d+(?:\.\d+)?\b/g);
  return matches ? matches.map(Number) : [];
}

export function countOccurrences(text: string, searchStr: string, caseInsensitive = false): number {
  if (!searchStr) return 0;
  const flags = caseInsensitive ? 'gi' : 'g';
  const escaped = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, flags);
  return (text.match(regex) || []).length;
}

export function longestCommonSubstring(a: string, b: string): string {
  if (!a || !b) return '';
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  let maxLen = 0;
  let endIdx = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endIdx = i;
        }
      }
    }
  }

  return a.slice(endIdx - maxLen, endIdx);
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export function highlight(text: string, query: string, openTag = '<mark>', closeTag = '</mark>'): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, `${openTag}$1${closeTag}`);
}

export function extractQuotes(text: string): string[] {
  const quotes: string[] = [];
  const singleQuoteRegex = /'([^']{10,})'/g;
  const doubleQuoteRegex = /"([^"]{10,})"/g;

  let match: RegExpExecArray | null;
  while ((match = singleQuoteRegex.exec(text)) !== null) quotes.push(match[1]);
  while ((match = doubleQuoteRegex.exec(text)) !== null) quotes.push(match[1]);

  return quotes;
}

export function generateExcerpt(text: string, maxLength = 200): string {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) return normalized;

  const lastPeriod = normalized.lastIndexOf('.', maxLength);
  if (lastPeriod > maxLength * 0.7) {
    return normalized.slice(0, lastPeriod + 1);
  }

  return truncate(normalized, maxLength);
}
