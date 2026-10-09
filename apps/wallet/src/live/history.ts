import { fromUnits } from "@baret/wallet-ui/data/format";
import type { ActivityItem } from "@baret/wallet-ui/data/types";
import { VAULT_ASSET, VAULT_DECIMALS } from "./vault.js";

/**
 * The History page's live activity: `/v1/audit/vault/<address>`'s `activity`
 * array, read as `ActivityItem`s. Pure; `live.tsx` does the fetch.
 *
 * The indexer's `VaultActivity` carries ten kinds (`indexer/src/handlers/PaymentGuard.ts`):
 * created, deposited, withdrawn, merchantCapSet, merchantPaused,
 * merchantResumed, merchantRevoked, agentSet, agentRevoked, paid. Only
 * `paid` has a matching `ActivityItem.kind` and a sentence
 * (`history.rows.payment`, `packages/content`) today, so only `paid` rows
 * become a row here. The other nine are not a regression: the vault's
 * current merchants and agent already read live, from the chain, on the
 * Delegation page (`vault.ts`), and a change the owner signs in this wallet is
 * logged in memory with its verdict. What is missing is only the indexer's
 * "when did this change" log for them.
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
    if (r.kind !== "paid") return [];
    const at = iso(r.timestamp);
    const merchant =
      typeof r.merchant === "string" && ADDRESS_RE.test(r.merchant) ? r.merchant : null;
    const amount = typeof r.amount === "string" && /^\d+$/.test(r.amount) ? r.amount : null;
    if (!at || !merchant || !amount) return [];
    const hash = typeof r.txHash === "string" && HASH_RE.test(r.txHash) ? r.txHash : undefined;
    const id =
      typeof r.id === "string" && r.id !== "" ? r.id : (hash ?? `${merchant.toLowerCase()}-${at}`);
    // The indexer's ids are unique; a repeated one is the same event twice.
    if (seen.has(id)) return [];
    seen.add(id);
    // USDC's six decimals in full: a sub-cent payment never reads as 0.00.
    const value = fromUnits(BigInt(amount), VAULT_DECIMALS, { min: 2, max: VAULT_DECIMALS });
    const block =
      typeof r.block === "number" && Number.isSafeInteger(r.block)
        ? String(r.block)
        : typeof r.block === "string" && /^\d+$/.test(r.block)
          ? r.block
          : undefined;
    const name = names[merchant.toLowerCase()]?.trim();
    return [
      {
        id,
        kind: "payment",
        at,
        values: { amount: value, asset: VAULT_ASSET, merchant: name || merchant },
        verdict: null,
        findings: [],
        changes: [{ direction: "out", value, unit: VAULT_ASSET }],
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
