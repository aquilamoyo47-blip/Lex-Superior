/**
 * Vendored priority queue (min-heap) — ported from qiao/heap.js
 * Source: https://github.com/qiao/heap.js (MIT)
 * Ranks and merges results from BM25, TF-IDF, and fuzzy search into a single ordered hit list.
 */

export type Comparator<T> = (a: T, b: T) => number;

function defaultComparator<T>(a: T, b: T): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export class MinHeap<T> {
  private heap: T[];
  private comparator: Comparator<T>;

  constructor(comparator: Comparator<T> = defaultComparator) {
    this.heap = [];
    this.comparator = comparator;
  }

  get size(): number {
    return this.heap.length;
  }

  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  replace(item: T): T | undefined {
    if (this.heap.length === 0) {
      this.push(item);
      return undefined;
    }
    const top = this.heap[0];
    this.heap[0] = item;
    this.sinkDown(0);
    return top;
  }

  pushPop(item: T): T {
    if (this.heap.length > 0 && this.comparator(this.heap[0], item) < 0) {
      const top = this.heap[0];
      this.heap[0] = item;
      this.sinkDown(0);
      return top;
    }
    return item;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.comparator(this.heap[idx], this.heap[parentIdx]) < 0) {
        [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private sinkDown(idx: number): void {
    const n = this.heap.length;
    while (true) {
      const left = (idx << 1) + 1;
      const right = left + 1;
      let smallest = idx;

      if (left < n && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < n && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }

  toArray(): T[] {
    const copy = [...this.heap];
    const result: T[] = [];
    const tmpHeap = new MinHeap<T>(this.comparator);
    tmpHeap.heap = copy;
    while (!tmpHeap.isEmpty) {
      result.push(tmpHeap.pop()!);
    }
    return result;
  }

  clear(): void {
    this.heap = [];
  }

  heapify(items: T[]): void {
    this.heap = [...items];
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.sinkDown(i);
    }
  }
}

export interface ScoredHit {
  id: string;
  score: number;
  text?: string;
  source?: 'bm25' | 'tfidf' | 'fuzzy' | 'semantic';
  metadata?: Record<string, unknown>;
}

export function mergeRankedResults(
  resultSets: Array<{ results: ScoredHit[]; weight: number }>,
  topN = 10
): ScoredHit[] {
  const scoreMap = new Map<string, { score: number; hit: ScoredHit }>();

  for (const { results, weight } of resultSets) {
    for (const hit of results) {
      const existing = scoreMap.get(hit.id);
      if (existing) {
        existing.score += hit.score * weight;
      } else {
        scoreMap.set(hit.id, { score: hit.score * weight, hit });
      }
    }
  }

  const heap = new MinHeap<{ score: number; hit: ScoredHit }>((a, b) => a.score - b.score);

  for (const { score, hit } of scoreMap.values()) {
    if (heap.size < topN) {
      heap.push({ score, hit });
    } else if (heap.peek() && score > heap.peek()!.score) {
      heap.replace({ score, hit });
    }
  }

  return heap.toArray()
    .sort((a, b) => b.score - a.score)
    .map(({ score, hit }) => ({ ...hit, score }));
}

export function topN<T>(items: T[], n: number, comparator: Comparator<T>): T[] {
  const heap = new MinHeap<T>(comparator);
  for (const item of items) {
    if (heap.size < n) {
      heap.push(item);
    } else if (comparator(item, heap.peek()!) > 0) {
      heap.replace(item);
    }
  }
  return heap.toArray().sort((a, b) => -comparator(a, b));
}
