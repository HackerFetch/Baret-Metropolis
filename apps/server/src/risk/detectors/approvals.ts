import type { Detector, FindingDraft } from "../../analysis/context.js";
import { formatAmount, tokenMeta } from "../../analysis/format.js";

/**
 * Allowances, operator access and permits the user grants. For an unlimited
 * allowance, {amount} is what this same request actually spends of the token,
 * the amount a bounded approval would need; empty when nothing is spent.
 */
export const approvals: Detector = (ctx) => {
  const out: FindingDraft[] = [];
  for (const a of ctx.effects.approvals) {
    const meta = tokenMeta(ctx, a.contract);
    if (a.kind === "operator") {
      out.push({
        code: "NFT_OPERATOR_GRANTED",
        values: { operator: a.spender, contract: a.contract },
      });
      continue;
    }
    const amount = a.amount ?? 0n;
    if (a.kind === "permit") {
      out.push({
        code: "PERMIT_SIGNATURE_DETECTED",
        values: {
          spender: a.spender,
          amount: a.unlimited ? "unlimited" : formatAmount(amount, meta.decimals),
          asset: meta.symbol,
        },
        details: { contract: a.contract, unlimited: a.unlimited },
      });
    }
    if (a.unlimited) {
      const spent = ctx.effects.transfers
        .filter((t) => t.token === a.contract && t.from === ctx.user && !t.nft)
        .reduce((sum, t) => sum + t.amount, 0n);
      out.push({
        code: "ERC20_APPROVAL_UNLIMITED",
        values: {
          spender: a.spender,
          asset: meta.symbol,
          amount: spent > 0n ? formatAmount(spent, meta.decimals) : "",
        },
        details: { contract: a.contract, neededAmountKnown: spent > 0n },
      });
    } else if (a.kind === "erc20") {
      out.push({
        code: "ERC20_APPROVAL_GRANTED",
        values: {
          spender: a.spender,
          amount: formatAmount(amount, meta.decimals),
          asset: meta.symbol,
        },
        details: { contract: a.contract },
      });
    }
  }
  return out;
};
