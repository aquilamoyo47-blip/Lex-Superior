/**
 * Vendored fuzzy search — core algorithm ported from Fuse.js
 * Source: https://github.com/krisk/Fuse (Apache-2.0)
 * Simplified for legal library search use-case.
 */

export interface FuzzyItem {
  [key: string]: unknown;
}

export interface FuzzyOptions {
  keys: string[];
  threshold?: number;
  includeScore?: boolean;
  minMatchCharLength?: number;
  limit?: number;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
  matches: Array<{ key: string; value: string }>;
}

function computeBitapScore(patternLen: number, errors: number, currentLocation: number, expectedLocation: number, accuracy: number): number {
  const proximity = Math.abs(expectedLocation - currentLocation);
  return errors / patternLen + proximity / 1000;
}

function bitapSearch(text: string, pattern: string, accuracy: number): { score: number; isMatch: boolean } {
  const patternLen = pattern.length;
  const textLen = text.length;

  if (patternLen === 0) return { score: 0, isMatch: false };
  if (patternLen > 32) {
    const sub = pattern.slice(0, 32);
    return bitapSearch(text, sub, accuracy);
  }

  const expectedLocation = Math.floor(textLen / 2);
  const MATCH_MASK = 1 << (patternLen - 1);

  let bestScore = 1;
  let lastBestLocation = -1;

  const patternAlphabet: Record<string, number> = {};
  for (let i = 0; i < patternLen; i++) {
    const c = pattern.charAt(i);
    patternAlphabet[c] = (patternAlphabet[c] || 0) | (1 << (patternLen - i - 1));
  }

  let score = 1;
  for (let j = 1; j <= textLen; j++) {
    let r = 0;
    let d = (1 << (patternLen + 1)) - 1;
    const startJ = j - 1;

    let temp = 0;
    for (let k = patternLen; k >= 1; k--) {
      const c = text.charAt(startJ + k - 1);
      const charScore = patternAlphabet[c] || 0;
      r = ((r << 1) | 1) & charScore;
      if (k < patternLen) {
        const prevD = d;
        d = ((prevD << 1) | 1) & charScore | ((prevD << 1) | 1) | prevD;
        r = r | (d >> 1) | d | prevD;
      }
      if (r & MATCH_MASK) {
        score = computeBitapScore(patternLen, 0, j, expectedLocation, accuracy);
        if (score <= bestScore) {
          bestScore = score;
          lastBestLocation = j;
        }
      }
      temp = r;
    }
    void temp;
    if (computeBitapScore(patternLen, patternLen + 1, j, expectedLocation, accuracy) > bestScore) {
      break;
    }
  }

  return {
    isMatch: lastBestLocation >= 0 && bestScore <= accuracy,
    score: Math.max(0.001, bestScore),
  };
}

function deepGet(obj: FuzzyItem, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }
  return String(current ?? '');
}

export function fuzzySearch<T extends FuzzyItem>(
  items: T[],
  query: string,
  options: FuzzyOptions
): FuzzyResult<T>[] {
  const {
    keys,
    threshold = 0.4,
    minMatchCharLength = 2,
    limit = 50,
  } = options;

  const pattern = query.toLowerCase().trim();

  if (pattern.length < minMatchCharLength) {
    return items.slice(0, limit).map(item => ({ item, score: 1, matches: [] }));
  }

  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    let bestScore = Infinity;
    const matches: Array<{ key: string; value: string }> = [];

    for (const key of keys) {
      const value = deepGet(item as FuzzyItem, key);
      if (!value) continue;

      const textLower = value.toLowerCase();

      if (textLower.includes(pattern)) {
        const exactScore = 0.001 * (pattern.length / textLower.length);
        if (exactScore < bestScore) {
          bestScore = exactScore;
          matches.push({ key, value });
        }
        continue;
      }

      const { isMatch, score } = bitapSearch(textLower, pattern, threshold);
      if (isMatch && score < bestScore) {
        bestScore = score;
        matches.push({ key, value });
      }
    }

    if (bestScore <= threshold) {
      results.push({ item, score: bestScore, matches });
    }
  }

  results.sort((a, b) => a.score - b.score);
  return results.slice(0, limit);
}
