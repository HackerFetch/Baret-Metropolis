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
 * Delegation page (`vault.ts`) — what is missing is only the "when did this
 * change" log for them. Add a kind and a content row for one and it starts
 * showing here too; this function does not need to change.
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function iso(seconds: unknown): string | null {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;
}

/** Reads the indexer's answer defensively; a row that cannot be read is left out. */
export function activityOf(body: unknown): readonly ActivityItem[] {
  if (typeof body !== "object" || body === null) return [];
  const { activity } = body as Record<string, unknown>;
  if (!Array.isArray(activity)) return [];
  return activity.flatMap((row): ActivityItem[] => {
    const r = row as Record<string, unknown>;
    if (r.kind !== "paid") return [];
    const at = iso(r.timestamp);
    const merchant =
      typeof r.merchant === "string" && ADDRESS_RE.test(r.merchant) ? r.merchant : null;
    const amount = typeof r.amount === "string" && /^\d+$/.test(r.amount) ? r.amount : null;
    if (!at || !merchant || !amount) return [];
    const value = fromUnits(BigInt(amount), VAULT_DECIMALS, { max: 2 });
    const hash = typeof r.txHash === "string" && HASH_RE.test(r.txHash) ? r.txHash : undefined;
    const block =
      typeof r.block === "number" || typeof r.block === "string" ? String(r.block) : undefined;
    return [
      {
        id: String(r.id ?? hash ?? `${merchant}-${at}`),
        kind: "payment",
        at,
        values: { amount: value, asset: VAULT_ASSET, merchant },
        verdict: null,
        findings: [],
        changes: [{ direction: "out", value, unit: VAULT_ASSET }],
        ...(hash ? { hash } : {}),
        ...(block ? { block } : {}),
      },
    ];
  });
}
