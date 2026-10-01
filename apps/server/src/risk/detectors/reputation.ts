import { NANSEN_TRUST_LEVELS } from "@baret/guard";
import type { Detector, FindingDraft } from "../../analysis/context.js";
import { REGISTRY_BLOCKLIST_SEVERITY } from "../../sources/types.js";

const rank = (level: (typeof NANSEN_TRUST_LEVELS)[number]) => NANSEN_TRUST_LEVELS.indexOf(level);

/**
 * Nansen labels and the on-chain ReputationRegistry, for every address the
 * request sends something to. When a source a rule depends on does not
 * answer, the request fails closed with REPUTATION_DATA_UNAVAILABLE.
 */
export const reputation: Detector = (ctx) => {
  const out: FindingDraft[] = [];
  const p = ctx.policy;
  const nansenNeeded = p.blockKnownMalicious || p.minNansenTrustLevel !== "new";
  const registryNeeded = p.blockKnownMalicious || p.blockRiskyContracts;

  const missing: string[] = [];
  if (nansenNeeded && !ctx.nansen.data) missing.push("nansen");
  if (registryNeeded && !ctx.registry.data) missing.push("reputation-registry");
  if (missing.length > 0) {
    out.push({
      code: "REPUTATION_DATA_UNAVAILABLE",
      values: {},
      details: { sources: missing },
      rule: p.blockKnownMalicious
        ? "blockKnownMalicious"
        : registryNeeded
          ? "blockRiskyContracts"
          : "minNansenTrustLevel",
    });
  }

  const contracts = new Set(ctx.contracts);
  const addresses = new Set([...ctx.counterparties, ...ctx.contracts]);
  for (const address of addresses) {
    const entry = ctx.registry.data?.get(address);
    const profile = ctx.nansen.data?.get(address);
    const registryBlocklisted =
      entry?.flagged === true &&
      (entry.severity >= REGISTRY_BLOCKLIST_SEVERITY || !contracts.has(address));

    if (registryBlocklisted || profile?.flagged) {
      out.push({
        code: "KNOWN_MALICIOUS_ADDRESS",
        values: { address },
        details: {
          registry: registryBlocklisted
            ? { severity: entry?.severity, reasonCode: entry?.reasonCode }
            : null,
          nansen: profile?.flagged === true,
        },
      });
      continue;
    }
    if (!profile || !ctx.counterparties.includes(address)) continue;
    if (profile.freshWallet) out.push({ code: "NANSEN_FLAGGED_FRESH_WALLET", values: { address } });
    if (profile.whale) out.push({ code: "NANSEN_FLAGGED_WHALE_COUNTERPARTY", values: { address } });
    if (rank(profile.trustLevel) < rank(p.minNansenTrustLevel)) {
      out.push({
        code: "NANSEN_TRUST_BELOW_MINIMUM",
        values: { address, actual: profile.trustLevel, limit: p.minNansenTrustLevel },
        rule: "minNansenTrustLevel",
      });
    }
  }
  return out;
};
