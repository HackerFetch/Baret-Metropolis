/**
 * The passphrase step's arithmetic: how strong a passphrase reads, and what
 * stops it. Length carries most of the strength (under 12 weak, 12 to 15
 * fair, 16 to 23 good, 24 or more strong); a passphrase built from very few
 * distinct characters drops one level, and one on the common list is weak
 * whatever its length.
 */

import { COMMON_PASSPHRASES, MIN_PASSPHRASE } from "./words.js";

export const LEVELS = ["weak", "fair", "good", "strong"] as const;

export type Strength = (typeof LEVELS)[number];

/** Fewer distinct characters than this reads as a repeated pattern. */
const MIN_VARIETY = 6;

export function isCommon(value: string): boolean {
  return COMMON_PASSPHRASES.has(value.toLowerCase().replace(/\s+/g, ""));
}

export function strengthOf(value: string): Strength {
  const length = [...value].length;
  if (length < MIN_PASSPHRASE || isCommon(value)) return "weak";
  const level = length >= 24 ? 3 : length >= 16 ? 2 : 1;
  const variety = new Set(value.toLowerCase()).size;
  return LEVELS[variety < MIN_VARIETY ? level - 1 : level] ?? "weak";
}

export interface PassphraseErrors {
  readonly passphrase: "tooShort" | "common" | null;
  readonly confirm: "mismatch" | null;
}

/** Each field's first problem, or null when it can be set. */
export function passphraseErrors(value: string, confirm: string): PassphraseErrors {
  return {
    passphrase: [...value].length < MIN_PASSPHRASE ? "tooShort" : isCommon(value) ? "common" : null,
    confirm: confirm === value ? null : "mismatch",
  };
}
