import type { CheckApproval, CheckChange, CheckFinding } from "@baret/web-ui/lib/check-types";
// Imported by file, not through the @baret/guard barrel: these two modules
// import types only, so zod (the barrel's schemas) stays out of this chunk.
import { FINDING_SPECS } from "../../../../../packages/guard/src/findings.js";
import type { GuardPolicyField } from "../../../../../packages/guard/src/policy.js";
import { POLICY_TEMPLATES } from "../../../../../packages/guard/src/policy-templates.js";

/**
 * The playground's prepared answers. Each action the agent can try carries
 * the findings Baret's detectors would report for it, with their values, and
 * what would change. The verdict is NOT written per policy: `verdictFor`
 * applies the engine's own rule (DECISIONS D-014) to those findings under the
 * picked template, so switching Strict, Balanced and Permissive changes the
 * answer exactly where the real engine would.
 *
 * Addresses are sample data. Nothing here is sent anywhere.
 */

export const ACTIONS = [
  "pay",
  "unlimitedAllowance",
  "wrongPayee",
  "lookalikeToken",
  "operatorApproval",
  "flaggedAddress",
] as const;
export type ActionId = (typeof ACTIONS)[number];

export type PolicyName = keyof typeof POLICY_TEMPLATES;
export const POLICY_NAMES = ["strict", "balanced", "permissive"] as const satisfies PolicyName[];

/** The decision, and the rule that made it when one did. */
export interface Decision {
  readonly verdict: "safe" | "caution" | "blocked";
  /** The policy field that blocked it; "allowWarnings" when only warnings were found. */
  readonly rule: GuardPolicyField | null;
}

/** How one finding counts under one policy: blocking (by which field) or a warning. */
function weigh(
  finding: CheckFinding,
  name: PolicyName,
): { blocks: true; field: GuardPolicyField } | { blocks: false } {
  const rule = FINDING_SPECS[finding.code].rule;
  const policy = POLICY_TEMPLATES[name];
  const field = rule.fields[0] ?? "allowWarnings";
  if (rule.kind === "threshold" || rule.kind === "failClosed") return { blocks: true, field };
  if (rule.kind === "toggle" && policy[field] === true) return { blocks: true, field };
  return { blocks: false };
}

/**
 * The engine's rule, applied to findings: any blocking finding blocks; if
 * only warnings remain, they block when the policy does not let you sign a
 * Caution, and make a Caution when it does; no findings is Safe.
 */
export function verdictFor(findings: readonly CheckFinding[], name: PolicyName): Decision {
  for (const finding of findings) {
    const weight = weigh(finding, name);
    if (weight.blocks) return { verdict: "blocked", rule: weight.field };
  }
  if (findings.length === 0) return { verdict: "safe", rule: null };
  return POLICY_TEMPLATES[name].allowWarnings
    ? { verdict: "caution", rule: null }
    : { verdict: "blocked", rule: "allowWarnings" };
}

const ROUTER = "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4";
const MERCHANT = "0x9c4d7e1f2a3b5c6d8e9f0a1b2c3d4e5f6a7b8c9d";
const ASKED = "0x2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e";
const DRAINER = "0x7e2b44d1c0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5";
const COLLECTION = "0x3a9f6c2e8d1b7a4f0e5c9d2b6a8f1e3c7d0b4a92";
const FAKE_USDC = "0x8f3e2d1c0b9a7f6e5d4c3b2a1f0e9d8c7b6a5f40";

export interface SampleAnswer {
  readonly findings: readonly CheckFinding[];
  readonly changes: readonly CheckChange[];
  readonly approvals: readonly CheckApproval[];
}

/** What each action would report. "pay" is clean on purpose: a listed merchant, inside the caps. */
export const SAMPLES: Record<ActionId, SampleAnswer> = {
  pay: {
    findings: [],
    changes: [{ direction: "out", value: "0.25", unit: "USDC" }],
    approvals: [],
  },
  unlimitedAllowance: {
    findings: [
      { code: "ERC20_APPROVAL_UNLIMITED", values: { spender: ROUTER, asset: "USDC", amount: "" } },
      { code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract: ROUTER } },
    ],
    changes: [],
    approvals: [{ unit: "USDC", spender: ROUTER, unlimited: true, amount: null }],
  },
  wrongPayee: {
    findings: [
      { code: "X402_DESTINATION_MISMATCH", values: { expected: ASKED, actual: MERCHANT } },
    ],
    changes: [{ direction: "out", value: "0.25", unit: "USDC" }],
    approvals: [],
  },
  lookalikeToken: {
    findings: [
      { code: "X402_NON_CANONICAL_ASSET", values: { asset: "USDC", contract: FAKE_USDC } },
    ],
    changes: [{ direction: "out", value: "0.25", unit: "USDC" }],
    approvals: [],
  },
  operatorApproval: {
    findings: [
      { code: "NFT_OPERATOR_GRANTED", values: { operator: DRAINER, contract: COLLECTION } },
    ],
    changes: [],
    approvals: [],
  },
  flaggedAddress: {
    findings: [{ code: "KNOWN_MALICIOUS_ADDRESS", values: { address: DRAINER } }],
    changes: [{ direction: "out", value: "5", unit: "MON" }],
    approvals: [],
  },
};

/** A random Monad address for the agent field (sample data, never a key). */
export function randomAddress(random: () => number = Math.random): string {
  let hex = "";
  for (let i = 0; i < 40; i++) hex += Math.floor(random() * 16).toString(16);
  return `0x${hex}`;
}
