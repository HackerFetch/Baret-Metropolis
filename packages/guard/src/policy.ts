import { z } from "zod";

/** A decimal amount in whole units, e.g. "12.5" USDC. Strings, so no float drift. */
export const decimalAmount = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'must be a non-negative decimal number, e.g. "12.5"');

export const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x address");

export const NANSEN_TRUST_LEVELS = ["new", "established", "identified"] as const;
export type NansenTrustLevel = (typeof NANSEN_TRUST_LEVELS)[number];

/**
 * The user's rules, as pure data. Every key here has a label in
 * @baret/content shared/policy.content.ts and is read by the policy engine.
 * A null threshold means the rule is off.
 */
export const guardPolicySchema = z
  .object({
    // Simulation
    requireSuccessfulSimulation: z.boolean(),

    // Contracts
    blockRiskyContracts: z.boolean(),
    blockUnknownContractExposure: z.boolean(),

    // Allowances
    blockUnlimitedApprovals: z.boolean(),
    blockSetApprovalForAll: z.boolean(),
    blockPermit: z.boolean(),

    // Dangerous calls
    blockSelfdestruct: z.boolean(),
    blockDelegatecall: z.boolean(),
    blockOwnershipTransfer: z.boolean(),

    // Loss limits
    maxLossPercent: z.number().min(0).max(100).nullable(),
    minPostUsdcBalance: decimalAmount.nullable(),
    minPostNativeBalance: decimalAmount.nullable(),

    // Reputation
    blockKnownMalicious: z.boolean(),
    /** "new" sets no minimum. */
    minNansenTrustLevel: z.enum(NANSEN_TRUST_LEVELS),

    // Compliance (Cleanverse)
    /** Both sides of a transfer must hold a valid credential. */
    requireComplianceCheck: z.boolean(),
    /** ISO 3166-1 alpha-2 codes of the other account. Empty: any country. */
    allowedCountries: z.array(z.string().regex(/^[A-Z]{2}$/)),
    /** Lowest Cleanverse verification level of the other account. Null: any level. */
    minComplianceTier: z.number().int().min(0).nullable(),

    // Gas
    maxGas: z.number().int().positive().nullable(),

    // Payments (x402)
    requireMemo: z.boolean(),
    maxPerTxCap: decimalAmount.nullable(),
    maxHourlyCap: decimalAmount.nullable(),
    maxDailyCap: decimalAmount.nullable(),
    /** Token contract addresses an agent may pay with. Empty: every payment is blocked. */
    allowedAssets: z.array(address),
    /** Origins (https://shop.example) an agent may pay. Empty: any site, within the caps. */
    allowedMerchantOrigins: z.array(z.string().url()),

    // Caution
    allowWarnings: z.boolean(),
  })
  .strict();

export type GuardPolicy = z.infer<typeof guardPolicySchema>;
export type GuardPolicyField = keyof GuardPolicy;

export const GUARD_POLICY_FIELDS = Object.keys(guardPolicySchema.shape) as GuardPolicyField[];
