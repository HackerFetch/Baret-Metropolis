/**
 * Numbers and dates as the wallet prints them. Amounts are decimal strings
 * end to end and are compared in integer base units, so a balance never
 * picks up a floating-point cent.
 */

/** "12.5" -> 12500000n at 6 decimals; null when it is not a plain decimal. */
export function toUnits(amount: string, decimals: number): bigint | null {
  const text = amount.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  const [, whole = "0", fraction = ""] = match;
  if (fraction.length > decimals) return null;
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

/**
 * Base units back to a plain decimal string with at least `min` and at most
 * `max` decimals (cut, never rounded up). `group` adds thousands separators,
 * for display only: a grouped string does not parse back.
 */
export function fromUnits(
  units: bigint,
  decimals: number,
  { min = 2, max = 4, group = false }: { min?: number; max?: number; group?: boolean } = {},
): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = (abs % base).toString().padStart(decimals, "0").slice(0, max).replace(/0+$/, "");
  const shown = fraction.padEnd(Math.min(min, max), "0");
  const head = group ? whole.toLocaleString("en-US") : whole.toString();
  return `${negative ? "-" : ""}${head}${shown ? `.${shown}` : ""}`;
}

/** A decimal string as the screens print it: grouped, 2 to 4 decimals. */
export function amount(text: string, decimals = 18): string {
  const units = toUnits(text, decimals);
  return units === null ? text : fromUnits(units, decimals, { group: true });
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "3 Oct, 13:42" (UTC, so sample dates read the same everywhere). */
export function when(iso: string): string {
  return DATE.format(new Date(iso));
}

/** "30 Sept 2026". */
export function day(iso: string): string {
  return DAY.format(new Date(iso));
}
