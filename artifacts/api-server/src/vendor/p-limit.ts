/**
 * Vendored promise concurrency limiter — ported from p-limit by Sindre Sorhus
 * Source: https://github.com/sindresorhus/p-limit (MIT)
 * Limits the number of concurrent async operations.
 */

type AnyFunction = (...args: unknown[]) => Promise<unknown>;
type QueueItem = { fn: AnyFunction; args: unknown[]; resolve: (v: unknown) => void; reject: (e: unknown) => void };

export interface LimitFunction {
  <T>(fn: (...args: unknown[]) => Promise<T>, ...args: unknown[]): Promise<T>;
  readonly activeCount: number;
  readonly pendingCount: number;
  clearQueue(): void;
}

export function pLimit(concurrency: number): LimitFunction {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new TypeError(`Expected a positive integer, got: ${concurrency}`);
  }

  const queue: QueueItem[] = [];
  let activeCount = 0;

  function next(): void {
    if (queue.length === 0 || activeCount >= concurrency) return;

    const item = queue.shift()!;
    activeCount++;

    item.fn(...item.args).then(
      (result) => {
        item.resolve(result);
        activeCount--;
        next();
      },
      (err) => {
        item.reject(err);
        activeCount--;
        next();
      }
    );
  }

  function run<T>(fn: (...args: unknown[]) => Promise<T>, ...args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push({
        fn: fn as AnyFunction,
        args,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      next();
    });
  }

  Object.defineProperties(run, {
    activeCount: {
      get: () => activeCount,
    },
    pendingCount: {
      get: () => queue.length,
    },
    clearQueue: {
      value: () => {
        queue.length = 0;
      },
    },
  });

  return run as unknown as LimitFunction;
}

export function pLimitAll<T>(
  concurrency: number,
  fns: Array<() => Promise<T>>
): Promise<T[]> {
  const limit = pLimit(concurrency);
  return Promise.all(fns.map(fn => limit(fn)));
}

export function pLimitSettled<T>(
  concurrency: number,
  fns: Array<() => Promise<T>>
): Promise<Array<PromiseSettledResult<T>>> {
  const limit = pLimit(concurrency);
  return Promise.allSettled(fns.map(fn => limit(fn)));
}
