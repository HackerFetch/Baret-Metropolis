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

/** One record from `/profiler/address/first-funder`. */
export interface FirstFunder {
  first_funder_address?: string;
  first_funder_name?: string | null;
  block_timestamp?: string;
}

/** A wallet first funded this recently counts as fresh. */
export const FRESH_WALLET_DAYS = 7;

/**
 * The cheap profile: who first sent this wallet gas, and when (1 credit).
 *
 *   never funded, or funded in the last FRESH_WALLET_DAYS → new, fresh wallet
 *   older                                                   → established
 *   funder labelled as an exploiter, scammer, drainer…      → flagged
 *
 * It cannot tell who owns the wallet, so it never says `identified`, and it
 * does not see balances, so it never says whale.
 */
export function profileFromFirstFunder(
  records: readonly FirstFunder[],
  nowMs: number,
  /**
   * False where Nansen does not index the chain being checked (Monad testnet:
   * its answers describe the same address on mainnet). A wallet Nansen has no
   * record of is then unknown, not fresh: its absence says nothing.
   */
  absenceIsFresh = true,
): NansenProfile {
  if (records.length === 0 && !absenceIsFresh) {
    return { trustLevel: "new", flagged: false, freshWallet: false, whale: false };
  }
  const first = records[0];
  const fundedAt = first?.block_timestamp ? Date.parse(first.block_timestamp) : Number.NaN;
  const freshWallet =
    Number.isNaN(fundedAt) || nowMs - fundedAt < FRESH_WALLET_DAYS * 24 * 60 * 60 * 1000;
  const flagged = FLAGGED.test(first?.first_funder_name ?? "");
  return { trustLevel: freshWallet ? "new" : "established", flagged, freshWallet, whale: false };
}

export type NansenMode = "funder" | "labels";

export interface NansenHttpOptions {
  apiKey: string;
  timeoutMs: number;
  /** funder: 1 credit per address (free plan). labels: 100 credits per address. */
  mode?: NansenMode;
  baseUrl?: string;
  /** Answers change slowly; one answer is reused this long. */
  cacheTtlMs?: number;
  /** Requests in flight at once, to stay inside Nansen's rate limit. */
  concurrency?: number;
  /**
   * Most uncached addresses one lookup may ask about. Above it the lookup
   * throws rather than check some and skip the rest, and the rules that need
   * Nansen fail closed.
   */
  maxAddresses?: number;
  /**
   * Whether a wallet with no funding record counts as a fresh wallet. True on
   * a chain Nansen indexes. False on Monad testnet, where the lookup reads the
   * address on mainnet and almost no testnet wallet exists there: Nansen then
   * speaks only when it knows something (a recent funding, a funder named for
   * theft, a label).
   */
  absenceIsFresh?: boolean;
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
 * Nansen for Monad, in one of two modes (D-017): first-funder lookups, which
 * fit the free plan, or Profiler labels, which need credits.
 *
 * Nansen indexes Monad mainnet only, so on testnet the answers describe the
 * same address on mainnet. Every requested address gets an answer or the
 * whole lookup throws: a partial answer would let an unchecked address pass.
 */
export class NansenHttpSource implements NansenSource {
  private readonly baseUrl: string;
  private readonly mode: NansenMode;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly now: () => number;
  private readonly cache = new Map<Address, { at: number; profile: NansenProfile }>();

  constructor(private readonly options: NansenHttpOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.nansen.ai").replace(/\/+$/, "");
    this.mode = options.mode ?? "funder";
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
  }

  async lookup(addresses: readonly Address[]): Promise<Map<Address, NansenProfile>> {
    const out = new Map<Address, NansenProfile>();
    const ttl = this.options.cacheTtlMs ?? 24 * 60 * 60 * 1000;
    const todo: Address[] = [];
    for (const a of new Set(addresses)) {
      const hit = this.cache.get(a);
      if (hit && this.now() - hit.at < ttl) out.set(a, hit.profile);
      else todo.push(a);
    }
    const max = this.options.maxAddresses ?? 3;
    if (todo.length > max) {
      throw new NansenError(`${todo.length} addresses to check, the limit is ${max}`, null);
    }

    const limit = Math.max(1, this.options.concurrency ?? 4);
    for (let i = 0; i < todo.length; i += limit) {
      const batch = todo.slice(i, i + limit);
      const profiles = await Promise.all(batch.map((a) => this.profile(a)));
      batch.forEach((a, j) => {
        const profile = profiles[j] as NansenProfile;
        this.cache.set(a, { at: this.now(), profile });
        out.set(a, profile);
      });
    }
    return out;
  }

  private async profile(address: Address): Promise<NansenProfile> {
    if (this.mode === "labels") {
      const data = await this.post("/api/v1/profiler/address/labels", {
        address,
        chain: "monad",
        pagination: { page: 1, per_page: 100 },
      });
      return profileFromLabels(
        data.filter(
          (l): l is NansenLabel =>
            typeof l === "object" && l !== null && typeof (l as NansenLabel).label === "string",
        ),
      );
    }
    const data = await this.post("/api/v1/profiler/address/first-funder", {
      address,
      chain: "all",
    });
    return profileFromFirstFunder(
      data as FirstFunder[],
      this.now(),
      this.options.absenceIsFresh ?? true,
    );
  }

  /** POSTs and returns `data`. 404 means Nansen has nothing on the address: an empty answer. */
  private async post(path: string, body: unknown): Promise<unknown[]> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: this.options.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (cause) {
      throw new NansenError(`Nansen did not answer: ${String(cause)}`, null);
    }
    if (res.status === 404) return [];
    if (!res.ok) throw new NansenError(`Nansen answered ${res.status}`, res.status);
    const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
    if (!json || !Array.isArray(json.data)) {
      throw new NansenError("Nansen answered with an unexpected body", res.status);
    }
    return json.data;
  }
}
