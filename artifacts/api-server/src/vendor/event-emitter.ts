/**
 * Vendored typed event emitter — ported from EventEmitter3
 * Source: https://github.com/primus/eventemitter3 (MIT)
 * Zero-dependency typed event bus for streaming AI responses chunk-by-chunk via SSE.
 */

type EventListener<T extends unknown[] = unknown[]> = (...args: T) => void;

interface EventEntry<T extends unknown[]> {
  fn: EventListener<T>;
  once: boolean;
  context?: unknown;
}

export type EventMap = Record<string, unknown[]>;

export class TypedEventEmitter<Events extends EventMap = Record<string, unknown[]>> {
  private _events: Map<string, Array<EventEntry<unknown[]>>> = new Map();
  private _maxListeners: number = 100;

  get maxListeners(): number {
    return this._maxListeners;
  }

  setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
  }

  on<K extends keyof Events & string>(
    event: K,
    listener: (...args: Events[K]) => void,
    context?: unknown
  ): this {
    const entry: EventEntry<unknown[]> = {
      fn: listener as EventListener<unknown[]>,
      once: false,
      context,
    };

    const listeners = this._events.get(event) ?? [];
    listeners.push(entry);
    this._events.set(event, listeners);
    return this;
  }

  once<K extends keyof Events & string>(
    event: K,
    listener: (...args: Events[K]) => void,
    context?: unknown
  ): this {
    const entry: EventEntry<unknown[]> = {
      fn: listener as EventListener<unknown[]>,
      once: true,
      context,
    };

    const listeners = this._events.get(event) ?? [];
    listeners.push(entry);
    this._events.set(event, listeners);
    return this;
  }

  off<K extends keyof Events & string>(
    event: K,
    listener?: (...args: Events[K]) => void
  ): this {
    if (!listener) {
      this._events.delete(event);
      return this;
    }

    const listeners = this._events.get(event);
    if (!listeners) return this;

    const filtered = listeners.filter(entry => entry.fn !== listener);
    if (filtered.length === 0) {
      this._events.delete(event);
    } else {
      this._events.set(event, filtered);
    }
    return this;
  }

  removeAllListeners<K extends keyof Events & string>(event?: K): this {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
    return this;
  }

  emit<K extends keyof Events & string>(event: K, ...args: Events[K]): boolean {
    const listeners = this._events.get(event);
    if (!listeners || listeners.length === 0) return false;

    const toRemove: EventEntry<unknown[]>[] = [];

    for (const entry of [...listeners]) {
      entry.fn.apply(entry.context ?? this, args as unknown[]);
      if (entry.once) {
        toRemove.push(entry);
      }
    }

    for (const entry of toRemove) {
      const current = this._events.get(event);
      if (current) {
        const filtered = current.filter(e => e !== entry);
        if (filtered.length === 0) {
          this._events.delete(event);
        } else {
          this._events.set(event, filtered);
        }
      }
    }

    return true;
  }

  listenerCount<K extends keyof Events & string>(event: K): number {
    return this._events.get(event)?.length ?? 0;
  }

  eventNames(): string[] {
    return [...this._events.keys()];
  }

  listeners<K extends keyof Events & string>(event: K): Array<(...args: Events[K]) => void> {
    return (this._events.get(event) ?? []).map(e => e.fn as (...args: Events[K]) => void);
  }

  addListener<K extends keyof Events & string>(
    event: K,
    listener: (...args: Events[K]) => void,
    context?: unknown
  ): this {
    return this.on(event, listener, context);
  }

  removeListener<K extends keyof Events & string>(
    event: K,
    listener: (...args: Events[K]) => void
  ): this {
    return this.off(event, listener);
  }
}

export type StreamEvents = {
  chunk: [content: string];
  done: [fullContent: string, metadata?: Record<string, unknown>];
  error: [error: Error];
  start: [requestId: string];
};

export class StreamEventEmitter extends TypedEventEmitter<StreamEvents> {
  constructor() {
    super();
  }
}
