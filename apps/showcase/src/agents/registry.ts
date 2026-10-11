import { isAddress } from "viem";

/**
 * A lookup of Baret's reputation registry, for /agents. A Chainlink CRE
 * workflow writes ScamSniffer's public blacklist into the ReputationRegistry
 * on Monad; the Envio indexer reads its events and the API serves one
 * address at `/v1/audit/reputation/<address>`:
 *
 * - listed: `{ entry: { id, severity, reasonCode, flaggedAt, block, txHash }, history: [...] }`
 * - not listed: `{ entry: null, history: [] }`
 * - not an address: 400
 *
 * Fail-closed: any other status, a body that is not exactly one of those
 * shapes, a network error and the timeout all give "unavailable", never
 * "clear". An unanswered lookup never reads as a clean address.
 */

/** The free API instance can take most of a minute to wake (as in liveAgent.ts). */
export const LOOKUP_TIMEOUT_MS = 60_000;

export const reputationUrl = (address: string): string =>
  `/api/v1/audit/reputation/${address.toLowerCase()}`;

export interface RegistryEntry {
  readonly reasonCode: string;
  /** 1 to 3. */
  readonly severity: number;
  /** Unix seconds. */
  readonly flaggedAt: number;
  readonly block: number;
  readonly txHash: string;
  /** How many registry events the address has. */
  readonly historyCount: number;
}

export type Lookup =
  | ({ readonly status: "listed" } & RegistryEntry)
  | { readonly status: "clear" }
  | { readonly status: "unavailable" }
  | { readonly status: "invalid" };

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const REASON_RE = /^[A-Z0-9_]{1,64}$/;
const isWhole = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

/** A lenient address check: any case, as typed or pasted. */
export function isRegistryAddress(text: string): boolean {
  return isAddress(text.trim(), { strict: false });
}

/**
 * The API's answer, read strictly. Null when it is not one of the two shapes
 * above or names another address, so the caller shows "unavailable".
 */
export function lookupOf(body: unknown, address: string): Lookup | null {
  if (typeof body !== "object" || body === null) return null;
  const { entry, history } = body as Record<string, unknown>;
  if (!Array.isArray(history)) return null;
  if (entry === null) return { status: "clear" };
  if (typeof entry !== "object") return null;
  const e = entry as Record<string, unknown>;
  if (typeof e.id !== "string" || e.id.toLowerCase() !== address.trim().toLowerCase()) return null;
  const { reasonCode, severity, flaggedAt, block, txHash } = e;
  if (typeof reasonCode !== "string" || !REASON_RE.test(reasonCode)) return null;
  if (!isWhole(severity) || severity < 1 || severity > 4) return null;
  if (!isWhole(flaggedAt) || !isWhole(block)) return null;
  if (typeof txHash !== "string" || !HASH_RE.test(txHash)) return null;
  return {
    status: "listed",
    reasonCode,
    severity,
    flaggedAt,
    block,
    txHash,
    historyCount: history.length,
  };
}

/**
 * Looks one address up. Never rejects: a bad address is "invalid" without a
 * request; everything that is not a readable answer is "unavailable". The
 * caller's `signal` (a new lookup, or the page unmounting) aborts the
 * request; the caller ignores that answer.
 */
export async function lookupAddress(
  address: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Lookup> {
  const text = address.trim();
  if (!isRegistryAddress(text)) return { status: "invalid" };
  const { signal, fetchImpl = fetch, timeoutMs = LOOKUP_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const stop = () => controller.abort();
  if (signal?.aborted) stop();
  signal?.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(stop, timeoutMs);
  try {
    const res = await fetchImpl(reputationUrl(text), { signal: controller.signal });
    if (res.status !== 200) return { status: "unavailable" };
    return lookupOf(await res.json(), text) ?? { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}
