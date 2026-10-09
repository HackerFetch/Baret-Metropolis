import { agents } from "@baret/content";

/**
 * The agent shown on /agents: a Dynamic server wallet, the authorised agent
 * of the demo PaymentGuard vault on Monad testnet (H6, 2026-10-09; the vault
 * and its token in docs/CONTRACTS.md §2). Its real payments serve the
 * Dynamic and Envio prizes together.
 *
 * They are read from the indexer through `/v1/audit/vault/<vault>`, the
 * vault's own payments, not `/v1/audit/recent`: the most recent payments of
 * every agent would push this agent's out of the window as soon as the demo
 * sites paid a hundred times, and the page would then claim it never paid.
 * The vault answer also names the vault's token, so the amounts are labelled
 * from the data, not assumed.
 *
 * Fail-closed: a non-2xx, an answer that is not this vault in USDC, a
 * network error and a timeout all reject, and the page shows "history
 * unavailable", never an empty list.
 */

export const DYNAMIC_AGENT = agents.liveAgent.agent;
export const AGENT_VAULT = agents.liveAgent.vault;
/** The vault's token: Circle's test USDC on Monad testnet. */
export const VAULT_TOKEN = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
export const VAULT_DECIMALS = 6;
export const VAULT_SYMBOL = "USDC";
/** The most one answer holds (`limitOf` in apps/server/src/api/routes/audit.ts). */
export const AUDIT_LIMIT = 100;
export const AUDIT_URL = `/api/v1/audit/vault/${AGENT_VAULT}?limit=${AUDIT_LIMIT}`;
/** The free API instance can take most of a minute to wake (43 s seen on 2026-10-09). */
export const LOAD_TIMEOUT_MS = 60_000;
/** How many of the agent's payments the page lists. */
export const SHOW_LIMIT = 5;

export interface AgentPayment {
  readonly id: string;
  readonly merchant: string;
  /** Base units of the vault's token (USDC, 6 decimals). */
  readonly amount: string;
  /** Unix seconds. */
  readonly timestamp: number;
  readonly txHash: string | null;
}

export interface AgentPayments {
  /** Newest first, at most the limit asked for. */
  readonly rows: readonly AgentPayment[];
  /**
   * The answer holds every payment the vault ever made, so no rows means
   * the agent has not paid yet. False when older payments were left out.
   */
  readonly complete: boolean;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const sameAddress = (a: unknown, b: string): boolean =>
  typeof a === "string" && a.toLowerCase() === b.toLowerCase();

/**
 * `/v1/audit/vault/<vault>`'s answer, read defensively. Null when it is not
 * the agent's vault holding USDC, so the caller shows "unavailable" instead
 * of guessing. Otherwise the agent's payments, matched case-insensitively
 * (the indexer stores addresses lowercase); a row that cannot be read is
 * left out, never guessed.
 */
export function agentPaymentsOf(body: unknown, agent: string, limit: number): AgentPayments | null {
  if (typeof body !== "object" || body === null) return null;
  const { vault, payments } = body as Record<string, unknown>;
  if (typeof vault !== "object" || vault === null || !Array.isArray(payments)) return null;
  const v = vault as Record<string, unknown>;
  if (!sameAddress(v.id, AGENT_VAULT) || !sameAddress(v.token, VAULT_TOKEN)) return null;
  const rows = payments.flatMap((row): AgentPayment[] => {
    if (typeof row !== "object" || row === null) return [];
    const r = row as Record<string, unknown>;
    if (!sameAddress(r.agent, agent)) return [];
    const merchant =
      typeof r.merchant === "string" && ADDRESS_RE.test(r.merchant) ? r.merchant : null;
    const amount = typeof r.amount === "string" && /^\d+$/.test(r.amount) ? r.amount : null;
    const timestamp =
      typeof r.timestamp === "number" && Number.isFinite(r.timestamp) ? r.timestamp : null;
    if (!merchant || !amount || timestamp === null) return [];
    const txHash = typeof r.txHash === "string" && HASH_RE.test(r.txHash) ? r.txHash : null;
    return [
      {
        id: String(r.id ?? txHash ?? `${merchant}-${timestamp}`),
        merchant,
        amount,
        timestamp,
        txHash,
      },
    ];
  });
  rows.sort((a, b) => b.timestamp - a.timestamp);
  const count = v.paymentCount;
  return {
    rows: rows.slice(0, limit),
    complete: typeof count === "number" && payments.length >= count,
  };
}

/**
 * Base units of the vault's token as a decimal with all six places kept
 * (trailing zeros dropped, at least two shown): a sub-cent x402 payment must
 * not read 0, as in the wallet (apps/wallet/src/live/vault.ts).
 */
export function amountText(baseUnits: string): string {
  const units = BigInt(baseUnits);
  const base = 10n ** BigInt(VAULT_DECIMALS);
  const fraction = (units % base)
    .toString()
    .padStart(VAULT_DECIMALS, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `${units / base}.${fraction}`;
}

/**
 * Reads the agent's payments. Rejects on a non-2xx, an unreadable or foreign
 * answer, a network error, `signal` (the page unmounting) and the timeout.
 */
export async function loadAgentPayments(
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<AgentPayments> {
  const { signal, fetchImpl = fetch, timeoutMs = LOAD_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const stop = () => controller.abort();
  if (signal?.aborted) stop();
  signal?.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(stop, timeoutMs);
  try {
    const res = await fetchImpl(AUDIT_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`the audit trail answered ${res.status}`);
    const read = agentPaymentsOf(await res.json(), DYNAMIC_AGENT, SHOW_LIMIT);
    if (!read) throw new Error("the audit trail did not answer for the agent's vault");
    return read;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}
