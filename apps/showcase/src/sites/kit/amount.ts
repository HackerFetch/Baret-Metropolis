// By file, not through the @baret/guard barrel: this module imports types
// only, so zod stays out of the demo sites' chunks.
import { BALANCED_POLICY } from "../../../../../packages/guard/src/policy-templates.js";

/**
 * The MON amount on a demo card (OrbitYield's stake, LaunchPad's
 * contribution), and the loss rule a deposit with nothing priced in return
 * runs into: Balanced blocks a request that costs more than half the balance.
 */

/** "12.5", "12,5" -> 12.5; anything that is not a positive number -> null. */
export function parseAmount(raw: string): number | null {
  const value = Number(raw.replace(",", ".").trim());
  return raw.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * The same amount in wei, for a live request: plain digits with at most 18
 * decimals ("12.5", "12,5"). Exponents, hex and signs are refused (null),
 * so what Baret checks is exactly what the visitor typed.
 */
export function toWei(raw: string): bigint | null {
  const text = raw.replace(",", ".").trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(text)) return null;
  const [whole = "0", fraction = ""] = text.split(".");
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
  return wei > 0n ? wei : null;
}

/** Two decimals, no grouping: what the cards and the panel print. */
export function format(value: number): string {
  return value.toFixed(2);
}

/** The most of the balance a request may cost under Balanced, in percent. */
export const LOSS_LIMIT = BALANCED_POLICY.maxLossPercent ?? 100;

/** The share of the balance a request costs, in percent. */
export function lossPercent(amount: number, balance: number): number {
  return (amount / balance) * 100;
}

/** "50.4%", "60%": at most one decimal, as the loss finding prints it. */
export function percent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}
