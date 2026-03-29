/**
 * Vendored keyword extractor — TF-IDF based, ported from NaturalNode/natural
 * Source: https://github.com/NaturalNode/natural (MIT)
 * Surfaces the top legal keywords from any document chunk.
 * Used in the RAG context-building step.
 */

import { removeStopwords, ALL_STOPWORDS } from './stopwords.js';
import { stem } from './porter-stemmer.js';

export interface KeywordScore {
  keyword: string;
  stem: string;
  tfIdf: number;
  tf: number;
  df: number;
  count: number;
}

export interface KeywordExtractionResult {
  keywords: KeywordScore[];
  topKeywords: string[];
  documentCount: number;
}

function tokenizeForKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !/^\d+$/.test(t));
}

function computeTermFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

export class TfIdfKeywordExtractor {
  private documentFrequency: Map<string, number> = new Map();
  private documentCount = 0;
  private documents: Array<Map<string, number>> = [];

  addDocument(text: string): void {
    const tokens = removeStopwords(tokenizeForKeywords(text), ALL_STOPWORDS);
    const stemmed = tokens.map(t => stem(t));
    const tf = computeTermFrequency(stemmed);

    this.documents.push(tf);
    this.documentCount++;

    for (const term of tf.keys()) {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
    }
  }

  extractKeywords(text: string, topN = 10): KeywordExtractionResult {
    const tokens = removeStopwords(tokenizeForKeywords(text), ALL_STOPWORDS);
    const stemmed = tokens.map(t => stem(t));
    const tf = computeTermFrequency(stemmed);

    const totalTerms = stemmed.length;
    const corpusSize = Math.max(this.documentCount, 1);

    const scores: KeywordScore[] = [];

    for (const [stemmedTerm, count] of tf) {
      const termFreq = count / totalTerms;
      const df = (this.documentFrequency.get(stemmedTerm) ?? 0) + 1;
      const idf = Math.log(corpusSize / df) + 1;
      const tfIdf = termFreq * idf;

      const originalIdx = stemmed.indexOf(stemmedTerm);
      const keyword = originalIdx >= 0 ? tokens[originalIdx] : stemmedTerm;

      scores.push({
        keyword,
        stem: stemmedTerm,
        tfIdf,
        tf: termFreq,
        df,
        count,
      });
    }

    scores.sort((a, b) => b.tfIdf - a.tfIdf);
    const topKeywords = scores.slice(0, topN);

    return {
      keywords: topKeywords,
      topKeywords: topKeywords.map(k => k.keyword),
      documentCount: this.documentCount,
    };
  }

  reset(): void {
    this.documentFrequency.clear();
    this.documentCount = 0;
    this.documents = [];
  }
}

export function extractKeywordsSimple(text: string, topN = 10): string[] {
  const tokens = removeStopwords(tokenizeForKeywords(text), ALL_STOPWORDS);
  const stemmed = tokens.map(t => stem(t));
  const tf = computeTermFrequency(stemmed);

  const scored = [...tf.entries()]
    .map(([stemmedTerm, count]) => {
      const idx = stemmed.indexOf(stemmedTerm);
      return { keyword: idx >= 0 ? tokens[idx] : stemmedTerm, count };
    })
    .sort((a, b) => b.count - a.count);

  return scored.slice(0, topN).map(s => s.keyword);
}

export function extractLegalKeywords(text: string, topN = 10): string[] {
  const extractor = new TfIdfKeywordExtractor();
  const result = extractor.extractKeywords(text, topN);
  return result.topKeywords;
}
