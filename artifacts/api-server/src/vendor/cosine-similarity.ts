/**
 * Vendored cosine similarity — ported from mljs/distance
 * Source: https://github.com/mljs/distance (MIT)
 * Compares TF-IDF / embedding vectors.
 * Used by the TF-IDF vectoriser and semantic search steps.
 */

export type Vector = number[] | Float32Array | Float64Array;

export function dotProduct(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(v: Vector): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

export function cosineDistance(a: Vector, b: Vector): number {
  return 1 - cosineSimilarity(a, b);
}

export function euclideanDistance(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function manhattanDistance(a: Vector, b: Vector): number {
  if (a.length !== b.length) throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}

export function normalizeVector(v: Vector): number[] {
  const mag = magnitude(v);
  if (mag === 0) return Array.from(v).map(() => 0);
  return Array.from(v).map(x => x / mag);
}

export interface SimilarityResult<T> {
  item: T;
  score: number;
  distance: number;
}

export function findMostSimilar<T>(
  queryVector: Vector,
  corpus: Array<{ item: T; vector: Vector }>,
  topN = 5
): SimilarityResult<T>[] {
  const scored = corpus.map(({ item, vector }) => {
    const score = cosineSimilarity(queryVector, vector);
    return { item, score, distance: 1 - score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

export function sparseCosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0;
  let magASq = 0;
  let magBSq = 0;

  for (const [key, valA] of a) {
    magASq += valA * valA;
    const valB = b.get(key) ?? 0;
    dot += valA * valB;
  }

  for (const valB of b.values()) {
    magBSq += valB * valB;
  }

  const denom = Math.sqrt(magASq) * Math.sqrt(magBSq);
  return denom === 0 ? 0 : dot / denom;
}
