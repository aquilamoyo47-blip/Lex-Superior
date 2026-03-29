/**
 * Vendored Trie / prefix tree — compact Trie implementation
 * Ported from nicktindall/trie-search
 * Source: https://github.com/nicktindall/trie-search (MIT)
 * Powers statute and case-name autocomplete in the chat UI's typeahead suggestions.
 */

export interface TrieSearchResult<T = string> {
  value: string;
  data?: T;
  score: number;
}

interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  isEnd: boolean;
  value?: string;
  data?: T;
  count: number;
}

function createNode<T>(): TrieNode<T> {
  return { children: new Map(), isEnd: false, count: 0 };
}

export class Trie<T = undefined> {
  private root: TrieNode<T> = createNode();
  private totalWords = 0;

  insert(word: string, data?: T): void {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, createNode());
      }
      node = node.children.get(char)!;
      node.count++;
    }

    if (!node.isEnd) {
      this.totalWords++;
    }

    node.isEnd = true;
    node.value = word;
    node.data = data;
  }

  insertMany(entries: Array<{ word: string; data?: T }>): void {
    for (const { word, data } of entries) {
      this.insert(word, data as T);
    }
  }

  search(prefix: string, limit = 10): TrieSearchResult<T>[] {
    const normalized = prefix.trim().toLowerCase();
    if (!normalized) return [];

    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }

    const results: TrieSearchResult<T>[] = [];
    this.collectWords(node, normalized, results, limit);

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  private collectWords(
    node: TrieNode<T>,
    prefix: string,
    results: TrieSearchResult<T>[],
    limit: number
  ): void {
    if (results.length >= limit) return;

    if (node.isEnd && node.value) {
      results.push({
        value: node.value,
        data: node.data,
        score: node.count,
      });
    }

    for (const [char, child] of node.children) {
      this.collectWords(child, prefix + char, results, limit);
    }
  }

  has(word: string): boolean {
    const normalized = word.trim().toLowerCase();
    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) return false;
      node = node.children.get(char)!;
    }
    return node.isEnd;
  }

  startsWith(prefix: string): boolean {
    const normalized = prefix.trim().toLowerCase();
    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) return false;
      node = node.children.get(char)!;
    }
    return true;
  }

  delete(word: string): boolean {
    const normalized = word.trim().toLowerCase();
    return this.deleteHelper(this.root, normalized, 0);
  }

  private deleteHelper(node: TrieNode<T>, word: string, depth: number): boolean {
    if (depth === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.value = undefined;
      node.data = undefined;
      this.totalWords--;
      return node.children.size === 0;
    }

    const char = word[depth];
    const child = node.children.get(char);
    if (!child) return false;

    const shouldDeleteChild = this.deleteHelper(child, word, depth + 1);
    if (shouldDeleteChild) {
      node.children.delete(char);
      return !node.isEnd && node.children.size === 0;
    }
    return false;
  }

  get size(): number {
    return this.totalWords;
  }

  clear(): void {
    this.root = createNode();
    this.totalWords = 0;
  }

  toArray(): string[] {
    const results: string[] = [];
    this.collectAllWords(this.root, results);
    return results;
  }

  private collectAllWords(node: TrieNode<T>, results: string[]): void {
    if (node.isEnd && node.value) results.push(node.value);
    for (const child of node.children.values()) {
      this.collectAllWords(child, results);
    }
  }
}

export function buildLegalAutocompleteTrie(terms: string[]): Trie {
  const trie = new Trie();
  for (const term of terms) {
    if (term && term.length >= 2) {
      trie.insert(term);
    }
  }
  return trie;
}
