import type { CheckFinding } from "@baret/web-ui/lib/check-types";
// By file, not through the @baret/guard barrel: these modules import types
// only, so zod stays out of the wallet's first chunk.
import { FINDING_SPECS } from "../../../../packages/guard/src/findings.js";
import {
  POLICY_TEMPLATES,
  type PolicyTemplateName,
} from "../../../../packages/guard/src/policy-templates.js";
import type { GuardPolicy, GuardPolicyField } from "./types.js";

/**
 * The engine's decision rule (DECISIONS D-014), for the screens that weigh
 * findings under rules the reader is still editing: the rules page's preview
 * and the activity log's "check it again". A finding blocks when its toggle
 * is on, or when its threshold is set; what is left are warnings, which
 * block only when the rules don't let you sign a Caution. Fail-closed
 * findings always block. No findings is Safe.
 */

export interface Decision {
  readonly verdict: "safe" | "caution" | "blocked";
  /** The field that blocked it; "allowWarnings" when only warnings were found. */
  readonly rule: GuardPolicyField | null;
}

function weigh(finding: CheckFinding, policy: GuardPolicy): GuardPolicyField | null {
  const { rule } = FINDING_SPECS[finding.code];
  const field = rule.fields[0] ?? "allowWarnings";
  if (rule.kind === "failClosed") return field;
  if (rule.kind === "threshold") return policy[field] === null ? null : field;
  if (rule.kind === "toggle") return policy[field] === true ? field : null;
  return null;
}

export function decide(findings: readonly CheckFinding[], policy: GuardPolicy): Decision {
  for (const finding of findings) {
    const field = weigh(finding, policy);
    if (field) return { verdict: "blocked", rule: field };
  }
  if (findings.length === 0) return { verdict: "safe", rule: null };
  return policy.allowWarnings
    ? { verdict: "caution", rule: null }
    : { verdict: "blocked", rule: "allowWarnings" };
}

export const TEMPLATE_NAMES = [
  "strict",
  "balanced",
  "permissive",
] as const satisfies readonly PolicyTemplateName[];

/** A fresh copy of a template, with the account's payment assets kept. */
export function fromTemplate(name: PolicyTemplateName, assets: readonly string[]): GuardPolicy {
  const base = POLICY_TEMPLATES[name];
  return {
    ...base,
    allowedCountries: [...base.allowedCountries],
    allowedMerchantOrigins: [...base.allowedMerchantOrigins],
    allowedAssets: [...assets],
  };
}

function same(a: GuardPolicy[GuardPolicyField], b: GuardPolicy[GuardPolicyField]): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => value === b[i]);
  }
  return a === b;
}

/** The fields where `policy` differs from the template (the payment assets are the account's own). */
export function changedFields(policy: GuardPolicy, name: PolicyTemplateName): GuardPolicyField[] {
  const base = POLICY_TEMPLATES[name];
  return (Object.keys(base) as GuardPolicyField[]).filter(
    (field) => field !== "allowedAssets" && !same(policy[field], base[field]),
  );
}

/** The fields where two rule sets differ. */
export function diffFields(a: GuardPolicy, b: GuardPolicy): GuardPolicyField[] {
  return (Object.keys(a) as GuardPolicyField[]).filter((field) => !same(a[field], b[field]));
}
