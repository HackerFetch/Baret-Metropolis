import { policies, policy } from "@baret/content";
import { counted, fill } from "@baret/web-ui/lib/util";
import { decide } from "../data/rules.js";
import type { ActivityItem, GuardPolicy, GuardPolicyField } from "../data/types.js";

/**
 * The rule editor's pure parts: what kind of control each of the 25 fields
 * gets, how a value reads, how typed text becomes a value, and how the
 * preview compares two rule sets over recent requests. Tested in
 * rules.test.ts. The words all come from content shared/policy and
 * wallet/policies.
 */

export type FieldKind = "switch" | "number" | "amount" | "level" | "list";

/** Fields holding a whole number (null: off). */
const NUMBERS = new Set<GuardPolicyField>(["maxLossPercent", "maxGas", "minComplianceTier"]);
/** Fields holding a decimal amount as a string (null: off). */
const AMOUNTS = new Set<GuardPolicyField>([
  "minPostUsdcBalance",
  "minPostNativeBalance",
  "maxPerTxCap",
  "maxHourlyCap",
  "maxDailyCap",
]);
const LISTS = new Set<GuardPolicyField>([
  "allowedCountries",
  "allowedAssets",
  "allowedMerchantOrigins",
]);

export function kindOf(field: GuardPolicyField): FieldKind {
  if (field === "minNansenTrustLevel") return "level";
  if (LISTS.has(field)) return "list";
  if (NUMBERS.has(field)) return "number";
  if (AMOUNTS.has(field)) return "amount";
  return "switch";
}

/** Every field, in the editor's order, grouped as content shared/policy groups them. */
export const FIELDS = Object.keys(policy.fields) as GuardPolicyField[];

export function groupsOf(): { group: keyof typeof policy.groups; fields: GuardPolicyField[] }[] {
  const order = Object.keys(policy.groups) as (keyof typeof policy.groups)[];
  return order
    .map((group) => ({
      group,
      fields: FIELDS.filter((field) => policy.fields[field].group === group),
    }))
    .filter((entry) => entry.fields.length > 0);
}

/** A value as a sentence reads it: On, Off, No limit, a level, a count, or the number and its unit. */
export function valueText(field: GuardPolicyField, value: GuardPolicy[GuardPolicyField]): string {
  const words = policy.fields[field];
  if (typeof value === "boolean") return value ? policies.values.on : policies.values.off;
  if (Array.isArray(value)) {
    const display = "display" in words ? words.display : undefined;
    if (!display) return String(value.length);
    return value.length === 0
      ? "empty" in display
        ? display.empty
        : ""
      : "some" in display
        ? counted(value.length, display.some, "someOne" in display ? display.someOne : display.some)
        : "";
  }
  if (field === "minComplianceTier") {
    const display = "display" in words ? words.display : undefined;
    if (display && "any" in display && "some" in display) {
      return value === null ? display.any : fill(display.some, { limit: String(value) });
    }
  }
  if (value === null) return policies.values.none;
  if (field === "minNansenTrustLevel" && "options" in words && words.options) {
    const option = (words.options as Record<string, { label: string }>)[String(value)];
    return option ? option.label : String(value);
  }
  return "unit" in words && words.unit ? `${value} ${words.unit}` : String(value);
}

/** The text an input shows for a value. */
export function inputText(value: GuardPolicy[GuardPolicyField]): string {
  if (Array.isArray(value)) return value.join("\n");
  return value === null || typeof value === "boolean" ? "" : String(value);
}

/**
 * Typed text to a value for one field. Empty is off (null) for a threshold;
 * a list takes one entry per line. Returns undefined when the text can't be
 * read, so the editor keeps the last good value and the schema check names
 * the field on save.
 */
export function parseInput(
  field: GuardPolicyField,
  text: string,
): GuardPolicy[GuardPolicyField] | undefined {
  const value = text.trim();
  const kind = kindOf(field);
  if (kind === "list") {
    return value === ""
      ? []
      : value
          .split(/[\n,]+/)
          .map((entry) => entry.trim())
          .filter(Boolean);
  }
  if (value === "") return null;
  if (kind === "number") {
    if (!/^\d+$/.test(value)) return undefined;
    return Number(value);
  }
  if (kind === "amount") return /^\d+(\.\d+)?$/.test(value) ? value : undefined;
  return undefined;
}

/** A rule set from pasted or imported JSON: only the 25 fields, all present. */
export function fromJson(text: string): GuardPolicy | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const keys = Object.keys(parsed);
    if (keys.length !== FIELDS.length || !FIELDS.every((field) => keys.includes(field)))
      return null;
    return parsed as GuardPolicy;
  } catch {
    return null;
  }
}

export interface Preview {
  readonly count: number;
  readonly stricter: number;
  readonly looser: number;
}

/**
 * The recent checked requests, decided again under the saved rules and under
 * the draft: how many that went through would now be blocked, and how many
 * that were blocked would now go through.
 */
export function preview(
  activity: readonly Pick<ActivityItem, "verdict" | "findings">[],
  saved: GuardPolicy,
  draft: GuardPolicy,
): Preview {
  const checked = activity.filter((item) => item.verdict && item.verdict !== "unreachable");
  let stricter = 0;
  let looser = 0;
  for (const item of checked) {
    const before = decide(item.findings, saved).verdict === "blocked";
    const after = decide(item.findings, draft).verdict === "blocked";
    if (!before && after) stricter++;
    if (before && !after) looser++;
  }
  return { count: checked.length, stricter, looser };
}
