import type { Address } from "viem";
import type { NansenProfile, NansenSource } from "./types.js";

/** One label as Nansen's `/profiler/address/labels` returns it. */
export interface NansenLabel {
  label: string;
  category?: string | null;
  kind?: string[] | null;
}

/**
 * Label words that mean an address has taken funds that were not its own.
 * Matched case-insensitively against the label text.
 */
const FLAGGED = /exploit|hack|scam|phish|drain|rug ?pull|attacker|sanction|stolen|fraud/i;
const FRESH = /fresh wallet|new wallet/i;
const WHALE = /whale|high balance/i;

/**
 * Turns Nansen labels into the profile the reputation detector reads.
 *
 *   identified   Nansen names the owner: an entity label (exchange, fund,
 *                app) or a name. Matches the copy: "Named by Nansen".
 *   established  any other label, unless it says the wallet is fresh.
 *   new          no labels, or a fresh-wallet label.
 */
export function profileFromLabels(labels: readonly NansenLabel[]): NansenProfile {
  const flagged = labels.some((l) => FLAGGED.test(l.label));
  const freshWallet = labels.some((l) => FRESH.test(l.label));
  const whale = labels.some((l) => WHALE.test(l.label));
  const named = labels.some(
    (l) => (l.kind ?? []).some((k) => k === "entity" || k === "name") || l.category === "cefi",
  );
  const trustLevel = named
    ? "identified"
    : labels.length > 0 && !freshWallet
      ? "established"
      : "new";
  return { trustLevel, flagged, freshWallet, whale };
}

export interface NansenHttpOptions {
  apiKey: string;
  timeoutMs: number;
  baseUrl?: string;
  /** Labels change slowly; one answer is reused this long. */
  cacheTtlMs?: number;
  /** Requests in flight at once, to stay inside Nansen's rate limit. */
  concurrency?: number;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}

export class NansenError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = "NansenError";
  }
}

/**
 * Nansen Profiler labels for Monad.
 *
 * Nansen indexes Monad mainnet only, so on testnet the labels describe the
 * same address on mainnet. Every requested address gets an answer or the
 * whole lookup throws: a partial answer would let an unchecked address pass.
 */
export class NansenHttpSource implements NansenSource {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly now: () => number;
  private readonly cache = new Map<Address, { at: number; profile: NansenProfile }>();

  constructor(private readonly options: NansenHttpOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.nansen.ai").replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
  }

  async lookup(addresses: readonly Address[]): Promise<Map<Address, NansenProfile>> {
    const out = new Map<Address, NansenProfile>();
    const ttl = this.options.cacheTtlMs ?? 6 * 60 * 60 * 1000;
    const todo: Address[] = [];
    for (const a of new Set(addresses)) {
      const hit = this.cache.get(a);
      if (hit && this.now() - hit.at < ttl) out.set(a, hit.profile);
      else todo.push(a);
    }

    const limit = Math.max(1, this.options.concurrency ?? 4);
    for (let i = 0; i < todo.length; i += limit) {
      const batch = todo.slice(i, i + limit);
      const profiles = await Promise.all(batch.map((a) => this.labels(a)));
      batch.forEach((a, j) => {
        const profile = profileFromLabels(profiles[j] ?? []);
        this.cache.set(a, { at: this.now(), profile });
        out.set(a, profile);
      });
    }
    return out;
  }

  private async labels(address: Address): Promise<NansenLabel[]> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/api/v1/profiler/address/labels`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: this.options.apiKey },
        body: JSON.stringify({ address, chain: "monad", pagination: { page: 1, per_page: 100 } }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (cause) {
      throw new NansenError(`Nansen did not answer: ${String(cause)}`, null);
    }
    // An address Nansen has never seen has no labels; that is an answer.
    if (res.status === 404) return [];
    if (!res.ok) throw new NansenError(`Nansen answered ${res.status}`, res.status);
    const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
    if (!body || !Array.isArray(body.data)) {
      throw new NansenError("Nansen answered with an unexpected body", res.status);
    }
    return body.data.filter(
      (l): l is NansenLabel => typeof l === "object" && l !== null && typeof l.label === "string",
    );
  }
}
