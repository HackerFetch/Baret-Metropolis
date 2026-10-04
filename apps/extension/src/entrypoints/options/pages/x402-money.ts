import { x402 } from "@baret/content";
import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import { fill } from "@baret/web-ui/lib/util";
import type { Caps, Payment } from "../../../data/types.js";

/**
 * The Payments page's sums and cap checks, kept apart from the page so they
 * can be tested. Amounts are added in base units as bigints, never as floats.
 */

const DAY = 86_400_000;
/** USDC's decimals: the finest a cap or an amount can be. */
export const DECIMALS = 6;
/**
 * The one token a PaymentGuard vault holds (docs/CONTRACTS.md 2.2). Used only
 * where the data names no asset: a facilitator's volume, an empty ledger.
 */
export const VAULT_ASSET = "USDC";

function decimal(value: bigint): string {
  return fromUnits(value, DECIMALS, { min: 2, max: DECIMALS });
}

/**
 * What the payments of the last `days` days add up to, one total per asset in
 * the order the assets first appear ("1.20 USDC"). An asset the ledger holds
 * but that was not used in the window reads 0.00, so the figure never blanks.
 * When a payment in the window has an amount that cannot be read, that
 * asset's total is unknown and reads as unavailable, never as a smaller sum.
 */
export function spentWithin(list: readonly Payment[], days: number, at: string): string {
  const end = Date.parse(at);
  const totals = new Map<string, bigint | null>();
  for (const p of list) {
    const sum = totals.has(p.asset) ? (totals.get(p.asset) ?? null) : 0n;
    const age = end - Date.parse(p.at);
    if (!(age >= 0 && age < days * DAY)) {
      totals.set(p.asset, sum);
      continue;
    }
    const units = toUnits(p.amount, DECIMALS);
    totals.set(p.asset, sum === null || units === null ? null : sum + units);
  }
  if (totals.size === 0) return `${decimal(0n)} ${VAULT_ASSET}`;
  return [...totals]
    .map(([asset, units]) =>
      units === null ? fill(x402.summary.unavailable, { asset }) : `${decimal(units)} ${asset}`,
    )
    .join(" + ");
}

export interface Draft {
  readonly perPayment: string;
  readonly hour: string;
  readonly day: string;
}

export type DraftErrors = Partial<Record<keyof Draft, string>>;

/** A cap as typed, in base units; null when it is not an amount above 0. */
function units(text: string): bigint | null {
  const value = toUnits(text, DECIMALS);
  return value !== null && value > 0n ? value : null;
}

/**
 * The caps a draft makes, or what is wrong with each field. The order checks
 * mirror PaymentGuard's InvalidCaps: the per-payment cap may not be above the
 * daily cap, nor above the hourly cap when one is set.
 */
export function readDraft(draft: Draft): { caps: Caps | null; errors: DraftErrors } {
  const words = x402.merchants.capsDialog.errors;
  const perPayment = units(draft.perPayment);
  const day = units(draft.day);
  const noHour = draft.hour.trim() === "";
  const hour = noHour ? null : units(draft.hour);
  const errors: DraftErrors = {};
  if (perPayment === null) errors.perPayment = words.amount;
  if (day === null) errors.day = words.amount;
  else if (perPayment !== null && perPayment > day) errors.day = words.dayBelowPayment;
  if (!noHour && hour === null) errors.hour = words.amount;
  else if (hour !== null && day !== null && hour > day) errors.hour = words.order;
  else if (hour !== null && perPayment !== null && hour < perPayment) {
    errors.hour = words.hourBelowPayment;
  }
  if (perPayment === null || day === null || Object.keys(errors).length > 0) {
    return { caps: null, errors };
  }
  return {
    caps: {
      perPayment: decimal(perPayment),
      hour: hour === null ? null : decimal(hour),
      day: decimal(day),
    },
    errors,
  };
}
