/**
 * Vendored TF-IDF vectoriser — ported from NaturalNode/natural
 * Source: https://github.com/NaturalNode/natural (MIT)
 * TF-IDF document vectorisation to score document similarity.
 * Used alongside BM25 for hybrid retrieval in the Civil Procedure knowledge base.
 */

import { removeStopwords, ALL_STOPWORDS } from './stopwords.js';
import { stem } from './porter-stemmer.js';
import { sparseCosineSimilarity } from './cosine-similarity.js';

export interface TfIdfDocument {
  id: string;
  text: string;
  vector?: Map<string, number>;
  metadata?: Record<string, unknown>;
}

export interface TfIdfScoredResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const total = tokens.length;
  for (const [term, count] of freq) {
    freq.set(term, count / total);
  }
  return freq;
}

export class TfIdfVectoriser {
  private documents: TfIdfDocument[] = [];
  private documentFrequency: Map<string, number> = new Map();
  private idfCache: Map<string, number> = new Map();
  private dirty = true;

  addDocument(doc: TfIdfDocument): void {
    const tokens = removeStopwords(
      tokenize(doc.text).map(t => stem(t)),
      ALL_STOPWORDS
    );
    const tf = termFrequency(tokens);

    for (const term of tf.keys()) {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
    }

    this.documents.push({ ...doc, vector: tf });
    this.dirty = true;
  }

  addDocuments(docs: TfIdfDocument[]): void {
    for (const doc of docs) this.addDocument(doc);
  }

  private buildIdf(): void {
    if (!this.dirty) return;
    const N = this.documents.length;
    this.idfCache.clear();
    for (const [term, df] of this.documentFrequency) {
      this.idfCache.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }
    this.dirty = false;
  }

  private buildTfIdfVector(tf: Map<string, number>): Map<string, number> {
    this.buildIdf();
    const tfidf = new Map<string, number>();
    for (const [term, tfScore] of tf) {
      const idf = this.idfCache.get(term) ?? 1;
      tfidf.set(term, tfScore * idf);
    }
    return tfidf;
  }

  vectorize(text: string): Map<string, number> {
    const tokens = removeStopwords(
      tokenize(text).map(t => stem(t)),
      ALL_STOPWORDS
    );
    const tf = termFrequency(tokens);
    return this.buildTfIdfVector(tf);
  }

  search(query: string, topN = 5): TfIdfScoredResult[] {
    this.buildIdf();
    const queryVector = this.vectorize(query);

    const scored = this.documents.map(doc => {
      const docVector = doc.vector ? this.buildTfIdfVector(doc.vector) : this.vectorize(doc.text);
      const score = sparseCosineSimilarity(queryVector, docVector);
      return { id: doc.id, score, text: doc.text, metadata: doc.metadata };
    });

    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  clear(): void {
    this.documents = [];
    this.documentFrequency.clear();
    this.idfCache.clear();
    this.dirty = true;
  }

  get size(): number {
    return this.documents.length;
  }
}
