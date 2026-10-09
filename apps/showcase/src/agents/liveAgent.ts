import { agents } from "@baret/content";

/**
 * The agent shown on this page: a Dynamic server wallet authorised on a
 * PaymentGuard vault on Monad testnet (H6, 2026-10-09). Its real payments,
 * read from `/v1/audit/recent`, serve the Dynamic and Envio prizes together.
 */
export const DYNAMIC_AGENT = agents.liveAgent.address;

export interface RecentPayment {
  readonly id: string;
  readonly merchant: string;
  /** Base units (USDC, 6 decimals). */
  readonly amount: string;
  readonly timestamp: number;
  readonly txHash: string | null;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/**
 * `/v1/audit/recent`'s `payments`, filtered to one agent and read defensively;
 * a row that cannot be read is left out, never guessed. Newest first, since
 * that is how the indexer already orders them.
 */
export function recentPaymentsOf(body: unknown, agent: string, limit: number): RecentPayment[] {
  if (typeof body !== "object" || body === null) return [];
  const { payments } = body as Record<string, unknown>;
  if (!Array.isArray(payments)) return [];
  const rows = payments.flatMap((row): RecentPayment[] => {
    const r = row as Record<string, unknown>;
    if (typeof r.agent !== "string" || !sameAddress(r.agent, agent)) return [];
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
  return rows.slice(0, limit);
}
