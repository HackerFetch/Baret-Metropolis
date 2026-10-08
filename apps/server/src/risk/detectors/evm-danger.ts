import type { Detector, FindingDraft } from "../../analysis/context.js";

/**
 * Self-destructs, borrowed code and admin handovers. A delegatecall from a
 * standard EIP-1967 proxy to its own implementation is how most upgradeable
 * tokens work (USDC included), so it is not reported.
 */
export const evmDanger: Detector = (ctx) => {
  const out: FindingDraft[] = [];
  for (const contract of new Set(ctx.selfdestructs)) {
    out.push({ code: "SELFDESTRUCT_CALL", values: { contract } });
  }
  const seen = new Set<string>();
  for (const d of ctx.delegateCalls) {
    if (d.reverted || d.standardProxy || seen.has(d.contract)) continue;
    seen.add(d.contract);
    out.push({
      code: "DELEGATECALL_DETECTED",
      values: { contract: d.contract },
      details: { codeFrom: d.codeFrom },
    });
  }
  for (const o of ctx.effects.ownership) {
    out.push({
      code: "OWNERSHIP_TRANSFER",
      values: { contract: o.contract, recipient: o.newOwner },
    });
  }
  return out;
};
