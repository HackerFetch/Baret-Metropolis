/**
 * The x402 Console's pure part: the indexer's answers (apps/server
 * src/api/routes/audit.ts) read into rows the screen shows. Amounts come as
 * base units in strings, addresses in lowercase. Anything that is not the
 * expected shape is dropped, never guessed: a row with no hash has no link,
 * an amount that is not a whole number shows nothing. Tested in audit.test.ts.
 */

/** The vault asset's decimals (USDC). */
const DECIMALS = 6;

export type FeedKind =
  | "payment"
  | "created"
  | "deposit"
  | "withdraw"
  | "merchant"
  | "paused"
  | "resumed"
  | "removed"
  | "agent"
  | "revoked"
  | "flagged"
  | "cleared"
  | "other";

export interface FeedRow {
  readonly id: string;
  readonly kind: FeedKind;
  readonly merchant: string | null;
  readonly agent: string | null;
  /** Whole units with up to 2 decimals ("0.10"); null when there is no amount. */
  readonly amount: string | null;
  /** Unix seconds; null when the indexer gave none. */
  readonly time: number | null;
  readonly txHash: string | null;
  /** Registry rows: the reason code. */
  readonly reason?: string;
}

export interface VaultMerchant {
  readonly address: string;
  readonly perPayment: string | null;
  readonly perDay: string | null;
  readonly paid: string | null;
  readonly payments: number;
  readonly status: "active" | "paused" | "removed";
}

export interface VaultSummary {
  readonly address: string;
  readonly balance: string | null;
  readonly paid: string | null;
  readonly payments: number;
  readonly merchants: readonly VaultMerchant[];
  readonly feed: readonly FeedRow[];
}

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

/** Base units to whole units with two decimals; null for anything not a whole number. */
export function units(raw: unknown): string | null {
  const text = typeof raw === "number" && Number.isInteger(raw) ? String(raw) : raw;
  if (typeof text !== "string" || !/^\d+$/.test(text)) return null;
  const value = BigInt(text);
  const scale = 10n ** BigInt(DECIMALS);
  const cents = (value * 100n + scale / 2n) / scale;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function timeOf(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function hashOf(v: unknown): string | null {
  const s = str(v);
  return s && HASH_RE.test(s) ? s : null;
}

/** The PaymentGuard event names the indexer stores, to the console's kinds. */
const ACTIVITY_KIND: Record<string, FeedKind> = {
  created: "created",
  deposit: "deposit",
  deposited: "deposit",
  withdraw: "withdraw",
  withdrawn: "withdraw",
  merchant: "merchant",
  merchantset: "merchant",
  merchantcaps: "merchant",
  merchantcapset: "merchant",
  merchantrevoked: "removed",
  paused: "paused",
  merchantpaused: "paused",
  resumed: "resumed",
  merchantresumed: "resumed",
  removed: "removed",
  merchantremoved: "removed",
  agent: "agent",
  agentset: "agent",
  agentauthorized: "agent",
  revoked: "revoked",
  agentrevoked: "revoked",
  payment: "payment",
  paid: "payment",
};

function rows(list: unknown): Record<string, unknown>[] {
  return Array.isArray(list)
    ? list.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    : [];
}

function paymentRow(r: Record<string, unknown>, index: number): FeedRow {
  return {
    id: `p-${String(r.id ?? r.txHash ?? index)}`,
    kind: "payment",
    merchant: str(r.merchant),
    agent: str(r.agent),
    amount: units(r.amount),
    time: timeOf(r.timestamp),
    txHash: hashOf(r.txHash),
  };
}

/** The block, from the indexer's `<block>-<logIndex>` id behind the row's prefix. */
function blockOf(row: FeedRow): number {
  const n = Number(row.id.split("-")[1]);
  return Number.isFinite(n) ? n : -1;
}

/** Newest first, by time, then by the indexer's block-logIndex id. */
function newest(a: FeedRow, b: FeedRow): number {
  return (b.time ?? 0) - (a.time ?? 0) || blockOf(b) - blockOf(a);
}

/** GET /v1/audit/recent: payments and registry changes, merged, newest first. */
export function recentOf(body: unknown): FeedRow[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { payments, reputationChanges } = body as Record<string, unknown>;
  if (!Array.isArray(payments)) return null;
  const changes = rows(reputationChanges).map(
    (r): FeedRow => ({
      id: `r-${String(r.id ?? r.txHash ?? "")}`,
      kind: str(r.kind) === "cleared" ? "cleared" : str(r.kind) === "flagged" ? "flagged" : "other",
      merchant: str(r.target),
      agent: null,
      amount: null,
      time: timeOf(r.timestamp),
      txHash: hashOf(r.txHash),
      ...(str(r.reasonCode) ? { reason: str(r.reasonCode) as string } : {}),
    }),
  );
  return [...rows(payments).map(paymentRow), ...changes].sort(newest);
}

/** GET /v1/audit/vault/:address: the vault, its merchants and its feed. */
export function vaultOf(body: unknown): VaultSummary | null {
  if (typeof body !== "object" || body === null) return null;
  const { vault, activity, payments } = body as Record<string, unknown>;
  if (typeof vault !== "object" || vault === null) return null;
  const v = vault as Record<string, unknown>;
  const address = str(v.id);
  if (!address) return null;
  const deposited =
    typeof v.deposited === "string" && /^\d+$/.test(v.deposited) ? BigInt(v.deposited) : null;
  const withdrawn =
    typeof v.withdrawn === "string" && /^\d+$/.test(v.withdrawn) ? BigInt(v.withdrawn) : null;
  const paid = typeof v.paid === "string" && /^\d+$/.test(v.paid) ? BigInt(v.paid) : null;
  const balance =
    deposited !== null && withdrawn !== null && paid !== null
      ? units(String(deposited - withdrawn - paid >= 0n ? deposited - withdrawn - paid : 0n))
      : null;
  const merchants = rows(v.merchants).flatMap((m): VaultMerchant[] => {
    const at = str(m.address);
    if (!at) return [];
    return [
      {
        address: at,
        perPayment: units(m.perTxCap),
        perDay: units(m.dailyCap),
        paid: units(m.paid),
        payments: Number(m.paymentCount ?? 0) || 0,
        status: m.active === false ? "removed" : m.paused === true ? "paused" : "active",
      },
    ];
  });
  // The vault's own events, without its payments: those come from `payments`, with their merchant.
  const events = rows(activity)
    .map(
      (r): FeedRow => ({
        id: `a-${String(r.id ?? "")}`,
        kind: ACTIVITY_KIND[String(r.kind ?? "").toLowerCase()] ?? "other",
        merchant: str(r.merchant),
        agent: str(r.agent),
        amount: units(r.amount),
        time: timeOf(r.timestamp),
        txHash: hashOf(r.txHash),
      }),
    )
    .filter((r) => r.kind !== "payment");
  return {
    address,
    balance,
    paid: units(v.paid),
    payments: Number(v.paymentCount ?? 0) || 0,
    merchants,
    feed: [...rows(payments).map(paymentRow), ...events].sort(newest),
  };
}

/** What the vault's payments add up to since `since` (unix seconds). */
export function spentSince(feed: readonly FeedRow[], since: number): string {
  let cents = 0n;
  for (const row of feed) {
    if (row.kind !== "payment" || row.amount === null || (row.time ?? 0) < since) continue;
    const [whole = "0", frac = "00"] = row.amount.split(".");
    cents += BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0").slice(0, 2));
  }
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}
