import { fromUnits } from "@baret/wallet-ui/data/format";
import type { ActivityItem } from "@baret/wallet-ui/data/types";
import { VAULT_ASSET, VAULT_DECIMALS } from "./vault.js";

/**
 * The History page's live activity: `/v1/audit/vault/<address>`'s `activity`
 * array, read as `ActivityItem`s. Pure; `live.tsx` does the fetch.
 *
 * The indexer's `VaultActivity` carries ten kinds
 * (`indexer/src/handlers/PaymentGuard.ts`), and each becomes a row: `paid`
 * is the agent's payment, the other nine are what the owner changed in the
 * vault and when. A change this wallet signed is also in its own log, with
 * its verdict; the store keeps that one and drops the indexer's copy
 * (wallet-ui store, "history").
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function iso(seconds: unknown): string | null {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;
}

/**
 * Reads the indexer's answer defensively. Null when the answer is not the
 * audit route's shape (fail-closed: the caller says the history could not be
 * read, never "nothing yet"); a row that cannot be read is left out.
 * `names` maps a lowercase merchant address to the name this browser gave it.
 */
export function activityOf(
  body: unknown,
  names: Readonly<Record<string, string>> = {},
): readonly ActivityItem[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { activity } = body as Record<string, unknown>;
  if (!Array.isArray(activity)) return null;
  const seen = new Set<string>();
  return activity.flatMap((row): ActivityItem[] => {
    if (typeof row !== "object" || row === null) return [];
    const r = row as Record<string, unknown>;
    const at = iso(r.timestamp);
    if (!at || typeof r.kind !== "string") return [];
    const address = (value: unknown) =>
      typeof value === "string" && ADDRESS_RE.test(value) ? value : null;
    const merchant = address(r.merchant);
    const agent = address(r.agent);
    const amount = typeof r.amount === "string" && /^\d+$/.test(r.amount) ? r.amount : null;
    // USDC's six decimals in full: a sub-cent payment never reads as 0.00.
    const value = amount
      ? fromUnits(BigInt(amount), VAULT_DECIMALS, { min: 2, max: VAULT_DECIMALS })
      : null;
    const named = merchant ? names[merchant.toLowerCase()]?.trim() || merchant : null;

    // What the row says, by the indexer's kind; null when a field it needs is missing.
    let item: Pick<ActivityItem, "kind" | "values" | "changes"> | null = null;
    const money = value ? { amount: value, asset: VAULT_ASSET } : null;
    switch (r.kind) {
      case "paid":
        if (money && named)
          item = {
            kind: "payment",
            values: { ...money, merchant: named },
            changes: [{ direction: "out", value: money.amount, unit: VAULT_ASSET }],
          };
        break;
      case "created":
        item = { kind: "vaultCreated", values: {}, changes: [] };
        break;
      case "deposited":
        if (money)
          item = {
            kind: "vaultDeposit",
            values: money,
            changes: [{ direction: "out", value: money.amount, unit: VAULT_ASSET }],
          };
        break;
      case "withdrawn":
        if (money)
          item = {
            kind: "vaultWithdraw",
            values: money,
            changes: [{ direction: "in", value: money.amount, unit: VAULT_ASSET }],
          };
        break;
      case "merchantCapSet":
        // The indexer keeps the daily cap of the change.
        if (money && named)
          item = { kind: "merchantCaps", values: { ...money, merchant: named }, changes: [] };
        break;
      case "merchantPaused":
      case "merchantResumed":
      case "merchantRevoked":
        if (named)
          item = {
            kind:
              r.kind === "merchantPaused"
                ? "merchantPaused"
                : r.kind === "merchantResumed"
                  ? "merchantResumed"
                  : "merchantRemoved",
            values: { merchant: named },
            changes: [],
          };
        break;
      case "agentSet":
      case "agentRevoked":
        if (agent)
          item = {
            kind: r.kind === "agentSet" ? "agentKey" : "agentRevoked",
            values: { agent },
            changes: [],
          };
        break;
    }
    if (!item) return [];

    const hash = typeof r.txHash === "string" && HASH_RE.test(r.txHash) ? r.txHash : undefined;
    const id =
      typeof r.id === "string" && r.id !== ""
        ? r.id
        : (hash ?? `${(merchant ?? agent ?? r.kind).toLowerCase()}-${at}`);
    // The indexer's ids are unique; a repeated one is the same event twice.
    if (seen.has(id)) return [];
    seen.add(id);
    const block =
      typeof r.block === "number" && Number.isSafeInteger(r.block)
        ? String(r.block)
        : typeof r.block === "string" && /^\d+$/.test(r.block)
          ? r.block
          : undefined;
    return [
      {
        id,
        ...item,
        at,
        verdict: null,
        findings: [],
        ...(hash ? { hash } : {}),
        ...(block ? { block } : {}),
        source: "indexer",
      },
    ];
  });
}

/**
 * The names the vault's merchants carry on the Delegation page, by lowercase
 * address. A merchant with no name of its own (its address) is left out.
 */
export function merchantNames(
  merchants: readonly { readonly address: string; readonly origin: string }[],
): Record<string, string> {
  const names: Record<string, string> = {};
  for (const m of merchants) {
    const name = m.origin.trim();
    if (name && name.toLowerCase() !== m.address.toLowerCase())
      names[m.address.toLowerCase()] = name;
  }
  return names;
}
