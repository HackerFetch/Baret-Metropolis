import type { GuardPolicy } from "./policy.js";

/**
 * The three starting rule sets. Their descriptions are in @baret/content
 * shared/policy.content.ts (`templates`) and these values must keep matching
 * them: Strict blocks the most and turns every Caution into a block, Balanced
 * is the production default, Permissive still blocks listed addresses and
 * requests that would fail.
 *
 * `allowedAssets` is empty here because asset addresses differ per network.
 * Use `createPolicy()` to get a template with the network's USDC filled in;
 * an empty list blocks every agent payment.
 */
export const STRICT_POLICY: GuardPolicy = {
  requireSuccessfulSimulation: true,
  blockRiskyContracts: true,
  blockUnknownContractExposure: true,
  blockUnlimitedApprovals: true,
  blockSetApprovalForAll: true,
  blockPermit: true,
  blockSelfdestruct: true,
  blockDelegatecall: true,
  blockOwnershipTransfer: true,
  maxLossPercent: 10,
  minPostUsdcBalance: null,
  minPostNativeBalance: "0.5",
  blockKnownMalicious: true,
  minNansenTrustLevel: "established",
  requireComplianceCheck: false,
  allowedCountries: [],
  minComplianceTier: null,
  maxGas: 2_000_000,
  requireMemo: true,
  maxPerTxCap: "1",
  maxHourlyCap: "5",
  maxDailyCap: "20",
  allowedAssets: [],
  allowedMerchantOrigins: [],
  allowWarnings: false,
};

export const BALANCED_POLICY: GuardPolicy = {
  requireSuccessfulSimulation: true,
  blockRiskyContracts: true,
  blockUnknownContractExposure: false,
  blockUnlimitedApprovals: true,
  blockSetApprovalForAll: true,
  blockPermit: true,
  blockSelfdestruct: true,
  blockDelegatecall: true,
  blockOwnershipTransfer: true,
  maxLossPercent: 50,
  minPostUsdcBalance: null,
  minPostNativeBalance: "0.1",
  blockKnownMalicious: true,
  minNansenTrustLevel: "new",
  requireComplianceCheck: false,
  allowedCountries: [],
  minComplianceTier: null,
  maxGas: 10_000_000,
  requireMemo: false,
  maxPerTxCap: "5",
  maxHourlyCap: "25",
  maxDailyCap: "100",
  allowedAssets: [],
  allowedMerchantOrigins: [],
  allowWarnings: true,
};

export const PERMISSIVE_POLICY: GuardPolicy = {
  requireSuccessfulSimulation: true,
  blockRiskyContracts: false,
  blockUnknownContractExposure: false,
  blockUnlimitedApprovals: false,
  blockSetApprovalForAll: false,
  blockPermit: false,
  blockSelfdestruct: true,
  blockDelegatecall: false,
  blockOwnershipTransfer: false,
  maxLossPercent: null,
  minPostUsdcBalance: null,
  minPostNativeBalance: null,
  blockKnownMalicious: true,
  minNansenTrustLevel: "new",
  requireComplianceCheck: false,
  allowedCountries: [],
  minComplianceTier: null,
  maxGas: null,
  requireMemo: false,
  maxPerTxCap: "50",
  maxHourlyCap: "250",
  maxDailyCap: "1000",
  allowedAssets: [],
  allowedMerchantOrigins: [],
  allowWarnings: true,
};

export const POLICY_TEMPLATES = {
  strict: STRICT_POLICY,
  balanced: BALANCED_POLICY,
  permissive: PERMISSIVE_POLICY,
} as const;

export type PolicyTemplateName = keyof typeof POLICY_TEMPLATES;

/** A fresh copy of a template with the network's payment assets filled in. */
export function createPolicy(
  template: PolicyTemplateName,
  options: { allowedAssets: readonly string[] },
): GuardPolicy {
  const base = POLICY_TEMPLATES[template];
  return {
    ...base,
    allowedCountries: [...base.allowedCountries],
    allowedMerchantOrigins: [...base.allowedMerchantOrigins],
    allowedAssets: [...options.allowedAssets],
  };
}
