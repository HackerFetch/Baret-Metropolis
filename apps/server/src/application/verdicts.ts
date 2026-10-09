import type { AnalyzeResponse, Explanation } from "@baret/guard";

/**
 * What /v1/explain is allowed to explain: the verdicts this server itself
 * returned, for a short while. A caller cannot post a made-up "safe" verdict
 * for a drainer and get a model's words under Baret's name, and two readers of
 * the same verdict cost one model call, not two.
 */

const TEN_MINUTES = 10 * 60_000;

/** A Map in insertion order with a time to live and a size cap; the oldest go first. */
class TtlMap<V> {
  private readonly entries = new Map<string, { value: V; expires: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    // Re-inserting moves the key to the end, so "oldest" means least recently written.
    this.entries.delete(key);
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(key: string, value?: V): void {
    if (value !== undefined && this.entries.get(key)?.value !== value) return;
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }
}

export interface CacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

/** Every verdict /v1/analyze returned in the last ten minutes, keyed by `meta.requestId`. */
export class VerdictCache {
  private readonly map: TtlMap<AnalyzeResponse>;

  constructor(options: CacheOptions = {}) {
    this.map = new TtlMap(
      options.ttlMs ?? TEN_MINUTES,
      options.maxEntries ?? 500,
      options.now ?? Date.now,
    );
  }

  remember(verdict: AnalyzeResponse): void {
    this.map.set(verdict.meta.requestId, verdict);
  }

  get(requestId: string): AnalyzeResponse | undefined {
    return this.map.get(requestId);
  }

  get size(): number {
    return this.map.size;
  }
}

/**
 * Explanations by verdict and language. It holds the promise, not the result,
 * so a second request that arrives while the model is still writing waits for
 * the same call. A failed call is dropped, so the next request tries again.
 */
export class ExplanationCache {
  private readonly map: TtlMap<Promise<Explanation>>;

  constructor(options: CacheOptions = {}) {
    this.map = new TtlMap(
      options.ttlMs ?? TEN_MINUTES,
      options.maxEntries ?? 1000,
      options.now ?? Date.now,
    );
  }

  getOrCreate(requestId: string, language: string, make: () => Promise<Explanation>) {
    const key = `${requestId}:${language}`;
    const cached = this.map.get(key);
    if (cached) return cached;
    const pending = make();
    this.map.set(key, pending);
    pending.catch(() => this.map.delete(key, pending));
    return pending;
  }

  get size(): number {
    return this.map.size;
  }
}
