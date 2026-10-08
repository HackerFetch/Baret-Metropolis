import type { Address } from "viem";
import type { AnalysisContext, Detector, FindingDraft } from "../../analysis/context.js";
import { formatAmount, tokenMeta } from "../../analysis/format.js";
import { REGISTRY_BLOCKLIST_SEVERITY } from "../../sources/types.js";

/**
 * Contracts the request touches: reported in the reputation registry, or on
 * no list Baret reads. A contract counts as known when the server lists it,
 * when it is the network's USDC, or when Nansen identifies it. The
 * implementation behind a standard proxy is not judged on its own. An unknown
 * contract that keeps what the user sends is reported on top (`keptValue`).
 */
export const programs: Detector = (ctx) => {
  const out: FindingDraft[] = [];
  const known = new Set(ctx.network.knownContracts);
  if (ctx.network.usdcAddress) known.add(ctx.network.usdcAddress);

  // The code behind a standard proxy is vouched for, or not, through the proxy.
  const implementations = new Set(
    ctx.delegateCalls.filter((d) => d.standardProxy).map((d) => d.codeFrom),
  );

  const unknown = new Set<Address>();
  for (const contract of ctx.contracts) {
    if (implementations.has(contract)) continue;
    const entry = ctx.registry.data?.get(contract);
    if (entry?.flagged && entry.severity < REGISTRY_BLOCKLIST_SEVERITY) {
      out.push({
        code: "RISKY_CONTRACT_INTERACTION",
        values: { contract },
        details: { severity: entry.severity, reasonCode: entry.reasonCode },
      });
      continue;
    }
    if (entry?.flagged) continue; // a blocklist entry is the reputation detector's
    const identified = ctx.nansen.data?.get(contract)?.trustLevel === "identified";
    if (!known.has(contract) && !identified) {
      out.push({ code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract } });
      unknown.add(contract);
    }
  }
  out.push(...keptValue(ctx, unknown));
  return out;
};

/**
 * A call that pays an unknown contract and brings nothing back: the user
 * calls a function, value leaves their account for a contract nothing vouches
 * for, and no token, collectible or MON arrives in the same transaction. A
 * deposit or a purchase returns something; this one only takes.
 *
 * Not reported for a plain transfer (no calldata): sending MON to a contract
 * address is a transfer, and the user chose its recipient. One finding per
 * contract, for the largest amount it keeps.
 */
function keptValue(ctx: AnalysisContext, unknown: ReadonlySet<Address>): FindingDraft[] {
  if (!ctx.tx || ctx.tx.data === "0x" || unknown.size === 0) return [];
  const { transfers } = ctx.effects;
  if (transfers.some((t) => t.to === ctx.user && t.from !== ctx.user)) return [];
  const kept = new Map<Address, (typeof transfers)[number]>();
  for (const t of transfers) {
    if (t.from !== ctx.user || !unknown.has(t.to) || t.amount === 0n) continue;
    const seen = kept.get(t.to);
    if (!seen || t.amount > seen.amount) kept.set(t.to, t);
  }
  return [...kept.values()].map((t) => {
    const meta = tokenMeta(ctx, t.token);
    return {
      code: "VALUE_KEPT_BY_UNKNOWN_CONTRACT",
      values: {
        contract: t.to,
        amount: t.nft ? "1" : formatAmount(t.amount, meta.decimals),
        asset: meta.symbol,
      },
    };
  });
}
