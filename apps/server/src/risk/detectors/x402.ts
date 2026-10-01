import { type Address, getAddress } from "viem";
import type { AnalysisContext, Detector, FindingDraft } from "../../analysis/context.js";
import type { TransferEffect } from "../../analysis/effects.js";
import { tokenMeta } from "../../analysis/format.js";

/** The value the request actually sends: the first fungible transfer out of the user's account. */
export function actualPayment(ctx: AnalysisContext): TransferEffect | null {
  return (
    ctx.effects.transfers.find((t) => t.from === ctx.user && !t.nft && t.to !== ctx.user) ?? null
  );
}

function label(ctx: AnalysisContext, token: Address | null, other: Address | null): string {
  const mine = tokenMeta(ctx, token).symbol;
  // Two tokens with one name: the address is the only honest label.
  if (other !== token && tokenMeta(ctx, other).symbol === mine) return token ?? "MON";
  return mine;
}

/**
 * Compares the payment with what the merchant's 402 response asked for, and
 * the asset with the user's allowed list (by contract address, not by name).
 */
export const x402: Detector = (ctx) => {
  const payment = ctx.payment;
  if (!payment) return [];
  const out: FindingDraft[] = [];
  const p = ctx.policy;
  const expectedAsset = getAddress(payment.asset);
  const expectedPayTo = getAddress(payment.payTo);
  const paid = actualPayment(ctx);

  if (!paid || paid.to !== expectedPayTo) {
    out.push({
      code: "X402_DESTINATION_MISMATCH",
      values: { expected: expectedPayTo, actual: paid?.to ?? ctx.tx?.to ?? "no recipient" },
    });
  }
  if (paid && paid.token !== expectedAsset) {
    out.push({
      code: "X402_ASSET_MISMATCH",
      values: {
        expected: label(ctx, expectedAsset, paid.token),
        actual: label(ctx, paid.token, expectedAsset),
      },
      details: { expectedAsset, actualAsset: paid.token },
    });
  }

  const asset = paid ? paid.token : expectedAsset;
  const allowed = p.allowedAssets.map((a) => getAddress(a));
  if (asset === null || !allowed.includes(asset)) {
    const symbol = tokenMeta(ctx, asset).symbol;
    const lookalike = asset !== null && allowed.some((a) => tokenMeta(ctx, a).symbol === symbol);
    out.push(
      lookalike
        ? {
            code: "X402_NON_CANONICAL_ASSET",
            values: { asset: symbol, contract: asset },
            rule: "allowedAssets",
          }
        : { code: "X402_ASSET_NOT_ALLOWED", values: { asset: symbol }, rule: "allowedAssets" },
    );
  }

  if (p.requireMemo && !payment.memo?.trim()) {
    out.push({ code: "X402_MEMO_MISSING", values: {}, rule: "requireMemo" });
  }
  return out;
};
