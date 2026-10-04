import { policy } from "@baret/content";
import { FIELDS, kindOf } from "@baret/wallet-ui/rules/fields";
import type { GuardPolicy, GuardPolicyField } from "./types.js";

/**
 * The rules page's pure parts: whether a change makes a rule stricter or
 * looser, and what is wrong with a rule set typed as JSON (the line of a
 * syntax error, a key Baret does not know, a value of the wrong kind, a key
 * that is missing). Tested in data.test.ts. The words live in content
 * extension/options/policies.
 */

/** The trust levels, weakest first, in the order the content lists them. */
const LEVELS = Object.keys(
  (policy.fields.minNansenTrustLevel as { options?: Record<string, unknown> }).options ?? {},
);

type Value = GuardPolicy[GuardPolicyField];

function rank(value: Value, field: GuardPolicyField): number | null {
  if (value === null) return null;
  if (field === "minNansenTrustLevel") return LEVELS.indexOf(String(value));
  const number = Number.parseFloat(String(value));
  return Number.isFinite(number) ? number : null;
}

/**
 * Stricter or looser, or null when the change has no direction (a list that
 * changed its entries). A switch that blocks is stricter on; letting
 * warnings through is looser on. A "max" limit is stricter lower, a "min"
 * limit is stricter higher; setting a limit where there was none is stricter.
 */
export function direction(
  field: GuardPolicyField,
  before: Value,
  after: Value,
): "stricter" | "looser" | null {
  if (typeof before === "boolean" && typeof after === "boolean") {
    if (before === after) return null;
    const loosens = field === "allowWarnings";
    return after !== loosens ? "stricter" : "looser";
  }
  if (Array.isArray(before) || Array.isArray(after)) return null;
  const a = rank(before, field);
  const b = rank(after, field);
  if (a === b) return null;
  if (a === null) return "stricter";
  if (b === null) return "looser";
  const higherIsStricter = field.startsWith("min");
  return b > a === higherIsStricter ? "stricter" : "looser";
}

export type JsonIssue =
  | { readonly kind: "syntax"; readonly line: number }
  | { readonly kind: "unknownKey"; readonly key: string }
  | {
      readonly kind: "invalidValue";
      readonly key: GuardPolicyField;
      readonly expected: ReturnType<typeof kindOf>;
    }
  | { readonly kind: "missingKey"; readonly key: GuardPolicyField };

function lineOf(text: string, message: string): number {
  const line = /line (\d+)/.exec(message);
  if (line?.[1]) return Number(line[1]);
  const position = /position (\d+)/.exec(message);
  if (position?.[1]) return text.slice(0, Number(position[1])).split("\n").length;
  return 1;
}

function fits(field: GuardPolicyField, value: unknown): boolean {
  const kind = kindOf(field);
  if (kind === "switch") return typeof value === "boolean";
  if (kind === "list") return Array.isArray(value) && value.every((v) => typeof v === "string");
  if (kind === "level") return typeof value === "string" && LEVELS.includes(value);
  if (value === null) return true;
  if (kind === "number") return typeof value === "number" && value >= 0;
  return typeof value === "string" && /^\d+(\.\d+)?$/.test(value);
}

/** The rule set in a piece of JSON, or the first thing wrong with it. */
export function checkJson(
  text: string,
): { ok: true; policy: GuardPolicy } | { ok: false; issue: JsonIssue } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      issue: { kind: "syntax", line: lineOf(text, error instanceof Error ? error.message : "") },
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, issue: { kind: "syntax", line: 1 } };
  }
  const record = parsed as Record<string, unknown>;
  const unknown = Object.keys(record).find((key) => !(FIELDS as readonly string[]).includes(key));
  if (unknown) return { ok: false, issue: { kind: "unknownKey", key: unknown } };
  for (const field of FIELDS) {
    if (!(field in record)) return { ok: false, issue: { kind: "missingKey", key: field } };
    if (!fits(field, record[field])) {
      return { ok: false, issue: { kind: "invalidValue", key: field, expected: kindOf(field) } };
    }
  }
  return { ok: true, policy: record as unknown as GuardPolicy };
}
