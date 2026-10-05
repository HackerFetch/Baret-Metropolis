import { type Address, formatUnits, parseUnits } from "viem";
import type { AnalysisContext, TokenMeta } from "./context.js";

/**
 * A token whose symbol or decimals could not be read: named by its short
 * address and counted in base units. Guessing 18 decimals would print a
 * confident, wrong amount.
 */
export function unknownToken(token: Address): TokenMeta {
  return { symbol: `${token.slice(0, 6)}...${token.slice(-4)}`, decimals: 0 };
}

export function tokenMeta(ctx: AnalysisContext, token: Address | null): TokenMeta {
  if (token === null) return { symbol: "MON", decimals: 18 };
  return ctx.tokens.get(token) ?? unknownToken(token);
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
