/**
 * Vendored retry with backoff — exponential-backoff-with-jitter ported from p-retry
 * Source: https://github.com/sindresorhus/p-retry (MIT)
 * Wraps outbound AI API calls with smarter retry scheduling.
 * Supplements the existing circuit breaker.
 */

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  jitter?: boolean;
  onFailedAttempt?: (error: Error, attemptNumber: number, retriesLeft: number) => void | Promise<void>;
  shouldRetry?: (error: Error) => boolean;
  signal?: AbortSignal;
}

export class AbortError extends Error {
  readonly name = 'AbortError';
  constructor(message?: string) {
    super(message ?? 'The operation was aborted');
  }
}

export class RetryError extends Error {
  readonly name = 'RetryError';
  readonly attempts: number;
  readonly lastError: Error;

  constructor(message: string, attempts: number, lastError: Error) {
    super(message);
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

function computeDelay(attempt: number, minTimeout: number, maxTimeout: number, factor: number, jitter: boolean): number {
  const exponential = Math.min(minTimeout * Math.pow(factor, attempt), maxTimeout);
  if (!jitter) return exponential;
  const jitterAmount = exponential * 0.5 * Math.random();
  return Math.round(exponential * 0.5 + jitterAmount);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }

    const timer = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new AbortError());
    }, { once: true });
  });
}

export async function retry<T>(
  fn: (attemptNumber: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minTimeout = 1000,
    maxTimeout = 30000,
    factor = 2,
    jitter = true,
    onFailedAttempt,
    shouldRetry = () => true,
    signal,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw new AbortError();
    }

    try {
      return await fn(attempt + 1);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (error instanceof AbortError) throw error;

      lastError = error;

      const retriesLeft = retries - attempt;

      if (retriesLeft === 0 || !shouldRetry(error)) {
        throw new RetryError(
          `Failed after ${attempt + 1} attempt(s): ${error.message}`,
          attempt + 1,
          error
        );
      }

      await onFailedAttempt?.(error, attempt + 1, retriesLeft);

      if (signal?.aborted) throw new AbortError();

      const delay = computeDelay(attempt, minTimeout, maxTimeout, factor, jitter);
      await sleep(delay, signal);
    }
  }

  throw new RetryError(
    `Failed after ${retries + 1} attempt(s)`,
    retries + 1,
    lastError ?? new Error('Unknown error')
  );
}

export function isNetworkError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket')
  );
}

export function isRetryableHttpError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  const retryableStatusCodes = ['429', '500', '502', '503', '504', '408', '409'];
  return retryableStatusCodes.some(code => msg.includes(code)) || isNetworkError(err);
}

export async function retryWithLogging<T>(
  name: string,
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retry(fn, {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 30000,
    factor: 2,
    jitter: true,
    shouldRetry: isRetryableHttpError,
    onFailedAttempt: (err, attempt, retriesLeft) => {
      console.warn(`[retry:${name}] attempt ${attempt} failed: ${err.message} — ${retriesLeft} retries left`);
    },
    ...options,
  });
}
