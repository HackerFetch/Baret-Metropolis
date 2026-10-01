import type { Detector, FindingDraft } from "../../analysis/context.js";
import { REGISTRY_BLOCKLIST_SEVERITY } from "../../sources/types.js";

/**
 * Contracts the request touches: reported in the reputation registry, or on
 * no list Baret reads. A contract counts as known when the server lists it,
 * when it is the network's USDC, or when Nansen identifies it.
 */
export const programs: Detector = (ctx) => {
  const out: FindingDraft[] = [];
  const known = new Set(ctx.network.knownContracts);
  if (ctx.network.usdcAddress) known.add(ctx.network.usdcAddress);

  for (const contract of ctx.contracts) {
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
    }
  }
  return out;
};
