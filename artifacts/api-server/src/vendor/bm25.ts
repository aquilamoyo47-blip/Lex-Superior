/**
 * Vendored BM25 retrieval scorer — ported from winkjs/wink-bm25-text-search
 * Source: https://github.com/winkjs/wink-bm25-text-search (MIT)
 * Okapi BM25 ranking algorithm for ranking knowledge base chunks by relevance.
 * Replaces/augments the current fuzzy search in the RAG retrieval step.
 */

import { removeStopwords, ALL_STOPWORDS } from './stopwords.js';
import { stem } from './porter-stemmer.js';

export interface BM25Document {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface BM25ScoredResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface BM25Options {
  k1?: number;
  b?: number;
  minTermLength?: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function preprocessTokens(tokens: string[]): string[] {
  return removeStopwords(tokens.map(t => stem(t)), ALL_STOPWORDS);
}

interface IndexedDoc {
  id: string;
  text: string;
  termFreqs: Map<string, number>;
  length: number;
  metadata?: Record<string, unknown>;
}

export class BM25Retriever {
  private k1: number;
  private b: number;
  private minTermLength: number;
  private docs: IndexedDoc[] = [];
  private df: Map<string, number> = new Map();
  private avgDocLength = 0;

  constructor(options: BM25Options = {}) {
    this.k1 = options.k1 ?? 1.5;
    this.b = options.b ?? 0.75;
    this.minTermLength = options.minTermLength ?? 2;
  }

  addDocument(doc: BM25Document): void {
    const rawTokens = tokenize(doc.text);
    const tokens = preprocessTokens(rawTokens).filter(t => t.length >= this.minTermLength);

    const termFreqs = new Map<string, number>();
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
    }

    for (const term of termFreqs.keys()) {
      this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }

    this.docs.push({ id: doc.id, text: doc.text, termFreqs, length: tokens.length, metadata: doc.metadata });
    this.avgDocLength = this.docs.reduce((sum, d) => sum + d.length, 0) / this.docs.length;
  }

  addDocuments(docs: BM25Document[]): void {
    for (const doc of docs) this.addDocument(doc);
  }

  private idf(term: string): number {
    const N = this.docs.length;
    const dfTerm = this.df.get(term) ?? 0;
    return Math.log((N - dfTerm + 0.5) / (dfTerm + 0.5) + 1);
  }

  search(query: string, topN = 10): BM25ScoredResult[] {
    if (this.docs.length === 0) return [];

    const queryTokens = preprocessTokens(tokenize(query)).filter(t => t.length >= this.minTermLength);
    if (queryTokens.length === 0) return [];

    const scores = new Map<string, number>();

    for (const term of queryTokens) {
      const idf = this.idf(term);

      for (const doc of this.docs) {
        const tf = doc.termFreqs.get(term) ?? 0;
        if (tf === 0) continue;

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / this.avgDocLength));
        const score = idf * (numerator / denominator);

        scores.set(doc.id, (scores.get(doc.id) ?? 0) + score);
      }
    }

    const results: BM25ScoredResult[] = [];
    for (const [id, score] of scores) {
      const doc = this.docs.find(d => d.id === id);
      if (doc) results.push({ id, score, text: doc.text, metadata: doc.metadata });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topN);
  }

  clear(): void {
    this.docs = [];
    this.df.clear();
    this.avgDocLength = 0;
  }

  get size(): number {
    return this.docs.length;
  }
}
