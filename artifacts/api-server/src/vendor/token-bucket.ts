/**
 * Vendored token bucket rate limiter — ported from jhurliman/node-rate-limiter
 * Source: https://github.com/jhurliman/node-rate-limiter (MIT)
 * Enforces per-user and per-provider request quotas, preventing API overage and abuse.
 */

export interface TokenBucketOptions {
  capacity: number;
  fillRate: number;
  fillInterval?: number;
  initialTokens?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  retryAfterMs?: number;
  resetAt?: number;
}

export class TokenBucket {
  private capacity: number;
  private fillRate: number;
  private fillInterval: number;
  private tokens: number;
  private lastFill: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.fillRate = options.fillRate;
    this.fillInterval = options.fillInterval ?? 1000;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastFill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastFill;
    const intervalsElapsed = elapsed / this.fillInterval;
    const tokensToAdd = intervalsElapsed * this.fillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.capacity, this.tokens + Math.floor(tokensToAdd));
      this.lastFill = now - (elapsed % this.fillInterval);
    }
  }

  tryConsume(tokens = 1): RateLimitResult {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return { allowed: true, tokensRemaining: this.tokens };
    }

    const deficit = tokens - this.tokens;
    const intervalsNeeded = deficit / this.fillRate;
    const retryAfterMs = Math.ceil(intervalsNeeded * this.fillInterval);
    const resetAt = Date.now() + retryAfterMs;

    return {
      allowed: false,
      tokensRemaining: this.tokens,
      retryAfterMs,
      resetAt,
    };
  }

  async consume(tokens = 1): Promise<void> {
    const result = this.tryConsume(tokens);
    if (!result.allowed) {
      await new Promise<void>(resolve => setTimeout(resolve, result.retryAfterMs ?? 1000));
      return this.consume(tokens);
    }
  }

  get available(): number {
    this.refill();
    return this.tokens;
  }

  get full(): boolean {
    this.refill();
    return this.tokens >= this.capacity;
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastFill = Date.now();
  }
}

export class RateLimiterRegistry {
  private buckets: Map<string, TokenBucket> = new Map();
  private defaults: TokenBucketOptions;

  constructor(defaults: TokenBucketOptions = { capacity: 60, fillRate: 1, fillInterval: 1000 }) {
    this.defaults = defaults;
  }

  getOrCreate(key: string, options?: Partial<TokenBucketOptions>): TokenBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, new TokenBucket({ ...this.defaults, ...options }));
    }
    return this.buckets.get(key)!;
  }

  tryConsume(key: string, tokens = 1, options?: Partial<TokenBucketOptions>): RateLimitResult {
    return this.getOrCreate(key, options).tryConsume(tokens);
  }

  reset(key: string): void {
    this.buckets.get(key)?.reset();
  }

  resetAll(): void {
    for (const bucket of this.buckets.values()) {
      bucket.reset();
    }
  }

  delete(key: string): boolean {
    return this.buckets.delete(key);
  }

  status(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, bucket] of this.buckets) {
      out[key] = bucket.available;
    }
    return out;
  }
}

export const globalRateLimiter = new RateLimiterRegistry({
  capacity: 60,
  fillRate: 1,
  fillInterval: 1000,
});

export const aiProviderLimiter = new RateLimiterRegistry({
  capacity: 100,
  fillRate: 5,
  fillInterval: 1000,
});
