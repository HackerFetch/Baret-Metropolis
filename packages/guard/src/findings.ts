import type { GuardPolicyField } from "./policy.js";

/**
 * Every finding code the server can emit. The words for each code live in
 * @baret/content (shared/findings.content.ts); a test keeps the two lists equal.
 */
export const FINDING_CODES = [
  "SIMULATION_FAILED",
  "LOW_CONFIDENCE_INCOMPLETE_DATA",
  "ERC20_APPROVAL_GRANTED",
  "ERC20_APPROVAL_UNLIMITED",
  "NFT_OPERATOR_GRANTED",
  "PERMIT_SIGNATURE_DETECTED",
  "SIGNATURE_NOT_UNDERSTOOD",
  "SIGNATURE_UNRECOGNISED",
  "SIGNED_ORDER_DETECTED",
  "ORDER_PAYS_NOTHING",
  "RISKY_CONTRACT_INTERACTION",
  "UNKNOWN_CONTRACT_EXPOSURE",
  "VALUE_KEPT_BY_UNKNOWN_CONTRACT",
  "SELFDESTRUCT_CALL",
  "DELEGATECALL_DETECTED",
  "ACCOUNT_CODE_DELEGATION",
  "OWNERSHIP_TRANSFER",
  "KNOWN_MALICIOUS_ADDRESS",
  "NANSEN_FLAGGED_FRESH_WALLET",
  "NANSEN_FLAGGED_WHALE_COUNTERPARTY",
  "NANSEN_TRUST_BELOW_MINIMUM",
  "REPUTATION_DATA_UNAVAILABLE",
  "COMPLIANCE_NO_CREDENTIAL",
  "COMPLIANCE_EXPIRED",
  "COMPLIANCE_TIER_INSUFFICIENT",
  "COMPLIANCE_COUNTRY_DISALLOWED",
  "COMPLIANCE_DATA_UNAVAILABLE",
  "DEEP_CALL_NESTING",
  "HIGH_OPERATION_COUNT",
  "EXCESSIVE_GAS",
  "ESTIMATED_LOSS_EXCEEDS_MAX",
  "LOSS_PERCENT_UNAVAILABLE",
  "POST_BALANCE_TOO_LOW",
  "POST_BALANCE_UNAVAILABLE",
  "X402_DESTINATION_MISMATCH",
  "X402_ASSET_MISMATCH",
  "X402_NON_CANONICAL_ASSET",
  "X402_ASSET_NOT_ALLOWED",
  "X402_MEMO_MISSING",
  "X402_MERCHANT_NOT_ALLOWED",
  "X402_PER_TX_CAP_EXCEEDED",
  "X402_HOURLY_CAP_EXCEEDED",
  "X402_DAILY_CAP_EXCEEDED",
  "X402_SPEND_HISTORY_UNAVAILABLE",
] as const;

export type FindingCode = (typeof FINDING_CODES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * How the policy engine decides a code.
 *
 *   toggle      a boolean block field decides it. On: blocks. Off: the finding
 *               still shows and falls to `allowWarnings`.
 *   threshold   the emitter only produces the code when the user's rule is set
 *               and broken, so the code always blocks.
 *   failClosed  a data source did not answer for a rule that needed it. Always
 *               blocks; no field turns this off.
 *   warning     no rule of its own. Blocks only when `allowWarnings` is off.
 *
 * `fields` lists every GuardPolicy field that can produce the code. It must
 * match the `codes` lists in @baret/content shared/policy.content.ts (tested).
 */
export type FindingRule =
  | { kind: "toggle"; fields: readonly [GuardPolicyField] }
  | { kind: "threshold"; fields: readonly GuardPolicyField[] }
  | { kind: "failClosed"; fields: readonly GuardPolicyField[] }
  | { kind: "warning"; fields: readonly ["allowWarnings"] };

export interface FindingSpec {
  severity: Severity;
  rule: FindingRule;
}

const warning = { kind: "warning", fields: ["allowWarnings"] } as const;
const toggle = (field: GuardPolicyField) => ({ kind: "toggle", fields: [field] }) as const;

export const FINDING_SPECS = {
  SIMULATION_FAILED: { severity: "high", rule: toggle("requireSuccessfulSimulation") },
  LOW_CONFIDENCE_INCOMPLETE_DATA: { severity: "low", rule: warning },
  ERC20_APPROVAL_GRANTED: { severity: "low", rule: warning },
  ERC20_APPROVAL_UNLIMITED: { severity: "high", rule: toggle("blockUnlimitedApprovals") },
  NFT_OPERATOR_GRANTED: { severity: "high", rule: toggle("blockSetApprovalForAll") },
  PERMIT_SIGNATURE_DETECTED: { severity: "high", rule: toggle("blockPermit") },
  // Not a toggle: a signature Baret cannot read blocks under every policy.
  SIGNATURE_NOT_UNDERSTOOD: {
    severity: "high",
    rule: { kind: "failClosed", fields: ["blockPermit"] },
  },
  SIGNATURE_UNRECOGNISED: { severity: "medium", rule: warning },
  SIGNED_ORDER_DETECTED: { severity: "low", rule: warning },
  ORDER_PAYS_NOTHING: { severity: "critical", rule: toggle("blockPermit") },
  RISKY_CONTRACT_INTERACTION: { severity: "high", rule: toggle("blockRiskyContracts") },
  UNKNOWN_CONTRACT_EXPOSURE: { severity: "medium", rule: toggle("blockUnknownContractExposure") },
  VALUE_KEPT_BY_UNKNOWN_CONTRACT: { severity: "high", rule: toggle("blockRiskyContracts") },
  SELFDESTRUCT_CALL: { severity: "critical", rule: toggle("blockSelfdestruct") },
  DELEGATECALL_DETECTED: { severity: "medium", rule: toggle("blockDelegatecall") },
  // Not a toggle: the simulation does not apply a delegation, so its effect is unknown.
  ACCOUNT_CODE_DELEGATION: {
    severity: "critical",
    rule: { kind: "failClosed", fields: ["blockDelegatecall"] },
  },
  OWNERSHIP_TRANSFER: { severity: "high", rule: toggle("blockOwnershipTransfer") },
  KNOWN_MALICIOUS_ADDRESS: { severity: "critical", rule: toggle("blockKnownMalicious") },
  NANSEN_FLAGGED_FRESH_WALLET: { severity: "medium", rule: warning },
  NANSEN_FLAGGED_WHALE_COUNTERPARTY: { severity: "low", rule: warning },
  NANSEN_TRUST_BELOW_MINIMUM: {
    severity: "medium",
    rule: { kind: "threshold", fields: ["minNansenTrustLevel"] },
  },
  REPUTATION_DATA_UNAVAILABLE: {
    severity: "high",
    rule: {
      kind: "failClosed",
      fields: ["blockRiskyContracts", "blockKnownMalicious", "minNansenTrustLevel"],
    },
  },
  COMPLIANCE_NO_CREDENTIAL: {
    severity: "high",
    rule: {
      kind: "threshold",
      fields: ["requireComplianceCheck", "allowedCountries", "minComplianceTier"],
    },
  },
  COMPLIANCE_EXPIRED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["requireComplianceCheck"] },
  },
  COMPLIANCE_TIER_INSUFFICIENT: {
    severity: "high",
    rule: { kind: "threshold", fields: ["minComplianceTier"] },
  },
  COMPLIANCE_COUNTRY_DISALLOWED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["allowedCountries"] },
  },
  COMPLIANCE_DATA_UNAVAILABLE: {
    severity: "high",
    rule: {
      kind: "failClosed",
      fields: ["requireComplianceCheck", "allowedCountries", "minComplianceTier"],
    },
  },
  DEEP_CALL_NESTING: { severity: "low", rule: warning },
  HIGH_OPERATION_COUNT: { severity: "low", rule: warning },
  EXCESSIVE_GAS: { severity: "medium", rule: { kind: "threshold", fields: ["maxGas"] } },
  ESTIMATED_LOSS_EXCEEDS_MAX: {
    severity: "high",
    rule: { kind: "threshold", fields: ["maxLossPercent"] },
  },
  LOSS_PERCENT_UNAVAILABLE: {
    severity: "high",
    rule: { kind: "failClosed", fields: ["maxLossPercent"] },
  },
  POST_BALANCE_TOO_LOW: {
    severity: "high",
    rule: { kind: "threshold", fields: ["minPostUsdcBalance", "minPostNativeBalance"] },
  },
  POST_BALANCE_UNAVAILABLE: {
    severity: "high",
    rule: { kind: "failClosed", fields: ["minPostUsdcBalance", "minPostNativeBalance"] },
  },
  X402_DESTINATION_MISMATCH: { severity: "high", rule: warning },
  X402_ASSET_MISMATCH: { severity: "high", rule: warning },
  X402_NON_CANONICAL_ASSET: {
    severity: "high",
    rule: { kind: "threshold", fields: ["allowedAssets"] },
  },
  X402_ASSET_NOT_ALLOWED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["allowedAssets"] },
  },
  X402_MEMO_MISSING: { severity: "medium", rule: { kind: "threshold", fields: ["requireMemo"] } },
  X402_MERCHANT_NOT_ALLOWED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["allowedMerchantOrigins"] },
  },
  X402_PER_TX_CAP_EXCEEDED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["maxPerTxCap"] },
  },
  X402_HOURLY_CAP_EXCEEDED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["maxHourlyCap"] },
  },
  X402_DAILY_CAP_EXCEEDED: {
    severity: "high",
    rule: { kind: "threshold", fields: ["maxDailyCap"] },
  },
  X402_SPEND_HISTORY_UNAVAILABLE: {
    severity: "high",
    rule: { kind: "failClosed", fields: ["maxHourlyCap", "maxDailyCap"] },
  },
} as const satisfies Record<FindingCode, FindingSpec>;
