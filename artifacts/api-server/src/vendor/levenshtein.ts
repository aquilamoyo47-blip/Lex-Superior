/**
 * Vendored Levenshtein edit distance — ported from hiddentao/fast-levenshtein
 * Source: https://github.com/hiddentao/fast-levenshtein (MIT)
 * Enables approximate matching of statute names and case citations when users make typos.
 */

export function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;
  if (a === b) return 0;

  const prevRow = new Uint32Array(bLen + 1);
  const currRow = new Uint32Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= bLen; j++) {
      const bChar = b.charCodeAt(j - 1);
      const cost = aChar === bChar ? 0 : 1;

      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
    }

    prevRow.set(currRow);
  }

  return currRow[bLen];
}

export function levenshteinNormalized(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshtein(a, b) / maxLen;
}

export function isSimilar(a: string, b: string, maxDistance = 2): boolean {
  return levenshtein(a.toLowerCase(), b.toLowerCase()) <= maxDistance;
}

export function levenshteinSimilarity(a: string, b: string): number {
  return 1 - levenshteinNormalized(a.toLowerCase(), b.toLowerCase());
}

export interface FuzzyMatch {
  term: string;
  distance: number;
  similarity: number;
}

export function findClosestMatches(
  query: string,
  candidates: string[],
  maxDistance = 3,
  limit = 5
): FuzzyMatch[] {
  const q = query.toLowerCase();
  const results = candidates
    .map(candidate => {
      const c = candidate.toLowerCase();
      const dist = levenshtein(q, c);
      return {
        term: candidate,
        distance: dist,
        similarity: 1 - dist / Math.max(q.length, c.length),
      };
    })
    .filter(r => r.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  return results.slice(0, limit);
}

export function spellCorrect(query: string, dictionary: string[], maxDistance = 2): string | null {
  const matches = findClosestMatches(query, dictionary, maxDistance, 1);
  return matches.length > 0 ? matches[0].term : null;
}

export function approximateStatuteMatch(query: string, statutes: string[]): FuzzyMatch[] {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  return findClosestMatches(normalizedQuery, statutes, 4, 5);
}
