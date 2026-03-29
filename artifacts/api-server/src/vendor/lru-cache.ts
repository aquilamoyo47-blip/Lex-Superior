/**
 * Vendored LRU Cache — ported from isaacs/node-lru-cache core
 * Source: https://github.com/isaacs/node-lru-cache (ISC)
 * Simplified doubly-linked-list LRU with TTL support.
 */

interface Node<K, V> {
  key: K;
  value: V;
  expiry: number | null;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}

export interface LRUOptions {
  max: number;
  ttl?: number;
}

export class LRUCache<K, V> {
  private max: number;
  private ttl: number | null;
  private map: Map<K, Node<K, V>>;
  private head: Node<K, V> | null = null;
  private tail: Node<K, V> | null = null;

  constructor(options: LRUOptions) {
    this.max = options.max;
    this.ttl = options.ttl ?? null;
    this.map = new Map();
  }

  get size(): number {
    return this.map.size;
  }

  private removeNode(node: Node<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = null;
    node.next = null;
  }

  private prependNode(node: Node<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private isExpired(node: Node<K, V>): boolean {
    return node.expiry !== null && Date.now() > node.expiry;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    if (this.isExpired(node)) {
      this.delete(key);
      return undefined;
    }

    this.removeNode(node);
    this.prependNode(node);
    return node.value;
  }

  set(key: K, value: V, options?: { ttl?: number }): this {
    const ttl = options?.ttl ?? this.ttl;
    const expiry = ttl !== null ? Date.now() + ttl : null;

    if (this.map.has(key)) {
      const existing = this.map.get(key)!;
      existing.value = value;
      existing.expiry = expiry;
      this.removeNode(existing);
      this.prependNode(existing);
      return this;
    }

    const node: Node<K, V> = { key, value, expiry, prev: null, next: null };
    this.map.set(key, node);
    this.prependNode(node);

    if (this.map.size > this.max) {
      const evicted = this.tail;
      if (evicted) {
        this.removeNode(evicted);
        this.map.delete(evicted.key);
      }
    }

    return this;
  }

  has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (this.isExpired(node)) {
      this.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  keys(): K[] {
    const result: K[] = [];
    let node = this.head;
    while (node) {
      if (!this.isExpired(node)) result.push(node.key);
      node = node.next;
    }
    return result;
  }

  values(): V[] {
    const result: V[] = [];
    let node = this.head;
    while (node) {
      if (!this.isExpired(node)) result.push(node.value);
      node = node.next;
    }
    return result;
  }

  entries(): Array<[K, V]> {
    const result: Array<[K, V]> = [];
    let node = this.head;
    while (node) {
      if (!this.isExpired(node)) result.push([node.key, node.value]);
      node = node.next;
    }
    return result;
  }
}
