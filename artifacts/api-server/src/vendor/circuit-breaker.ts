/**
 * Vendored circuit breaker — pattern based on opossum and cockatiel
 * Sources: https://github.com/nodeshift/opossum (Apache-2.0)
 *          https://github.com/nicolo-ribaudo/cockatiel (MIT)
 * Wraps external calls with open/half-open/closed state machine.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
  onOpen?: (name: string) => void;
  onClose?: (name: string) => void;
  onHalfOpen?: (name: string) => void;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: number | null;
  consecutiveSuccesses: number;
}

export class CircuitBreaker {
  private name: string;
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private consecutiveSuccesses = 0;
  private totalRequests = 0;
  private lastFailureTime: number | null = null;

  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private resetTimeout: number;
  private volumeThreshold: number;

  private onOpen?: (name: string) => void;
  private onClose?: (name: string) => void;
  private onHalfOpen?: (name: string) => void;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 60000;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.volumeThreshold = options.volumeThreshold ?? 3;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  get isOpen(): boolean {
    return this.state === 'OPEN';
  }

  get isClosed(): boolean {
    return this.state === 'CLOSED';
  }

  private shouldAttemptReset(): boolean {
    if (this.state !== 'OPEN') return false;
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  private transitionToOpen(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;
    this.onOpen?.(this.name);
  }

  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.onHalfOpen?.(this.name);
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.onClose?.(this.name);
  }

  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.transitionToOpen();
      return;
    }

    if (
      this.state === 'CLOSED' &&
      this.totalRequests >= this.volumeThreshold &&
      this.failures >= this.failureThreshold
    ) {
      this.transitionToOpen();
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitOpenError(this.name, this.resetTimeout - (Date.now() - (this.lastFailureTime ?? 0)));
      }
    }

    this.totalRequests++;

    const timer = this.timeout > 0
      ? new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Circuit breaker timeout after ${this.timeout}ms`)), this.timeout)
        )
      : null;

    try {
      const result = await (timer ? Promise.race([fn(), timer]) : fn());
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  reset(): void {
    this.transitionToClosed();
    this.successes = 0;
    this.totalRequests = 0;
  }
}

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;
  readonly circuitName: string;

  constructor(circuitName: string, retryAfterMs: number) {
    super(`Circuit "${circuitName}" is OPEN. Retry after ${Math.max(0, retryAfterMs)}ms.`);
    this.name = 'CircuitOpenError';
    this.circuitName = circuitName;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const globalCircuitRegistry = new CircuitBreakerRegistry();
