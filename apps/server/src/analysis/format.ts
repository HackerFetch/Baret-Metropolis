import { type Address, formatUnits, parseUnits } from "viem";
import type { AnalysisContext, TokenMeta } from "./context.js";

export const UNKNOWN_TOKEN: TokenMeta = { symbol: "tokens", decimals: 18 };

export function tokenMeta(ctx: AnalysisContext, token: Address | null): TokenMeta {
  if (token === null) return { symbol: "MON", decimals: 18 };
  return ctx.tokens.get(token) ?? UNKNOWN_TOKEN;
}

/** Base units to a plain decimal string, without the symbol. */
export function formatAmount(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals);
}

/** A rule amount ("12.5") to base units of an asset. */
export function toBaseUnits(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

export function formatPercent(p: number): string {
  return `${Number(p.toFixed(2))}%`;
}
