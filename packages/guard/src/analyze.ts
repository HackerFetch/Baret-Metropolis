import { z } from "zod";
import { MONAD_NETWORK_KEYS } from "./chains.js";
import { FINDING_CODES, SEVERITIES } from "./findings.js";
import { address, GUARD_POLICY_FIELDS, guardPolicySchema } from "./policy.js";

/** The three starting rule sets, by name (values in policy-templates.ts). */
export const POLICY_TEMPLATE_NAMES = ["strict", "balanced", "permissive"] as const;

const hex = z.string().regex(/^0x[0-9a-fA-F]*$/, "must be 0x-prefixed hex");
/** An integer in base units (wei, or a token's smallest unit), decimal or 0x hex. */
const rawAmount = z.union([z.string().regex(/^\d+$/), z.string().regex(/^0x[0-9a-fA-F]+$/)]);

/** An unsigned call, as a dApp hands it to `eth_sendTransaction`. */
export const callRequestSchema = z
  .object({
    from: address,
    to: address.nullable().optional(),
    value: rawAmount.optional(),
    data: hex.optional(),
    gas: rawAmount.optional(),
    maxFeePerGas: rawAmount.optional(),
    maxPriorityFeePerGas: rawAmount.optional(),
    gasPrice: rawAmount.optional(),
    nonce: z.number().int().nonnegative().optional(),
  })
  .strict();

/**
 * A serialized transaction as hex. Signed: the sender is recovered from the
 * signature. Unsigned: the sender is `userWallet`, which is then required.
 */
export const rawTransactionSchema = z.object({ raw: hex }).strict();

/** An EIP-712 message, as a dApp hands it to `eth_signTypedData_v4`. */
export const typedDataSchema = z
  .object({
    signer: address,
    domain: z.record(z.string(), z.unknown()),
    types: z.record(z.string(), z.array(z.object({ name: z.string(), type: z.string() }).strict())),
    primaryType: z.string(),
    message: z.record(z.string(), z.unknown()),
  })
  .strict();

/** A past agent payment, used for the rolling hourly and daily caps. */
export const spendRecordSchema = z
  .object({
    /** Base units of the payment asset. */
    amount: rawAmount,
    /** Unix seconds. */
    timestamp: z.number().int().nonnegative(),
  })
  .strict();

/**
 * The x402 context of a payment: what the merchant's 402 response asked for,
 * which the x402 detector compares with what the transaction actually does.
 */
export const paymentContextSchema = z
  .object({
    origin: z.string().url(),
    payTo: address,
    asset: address,
    /** Base units the merchant asked for. */
    amount: rawAmount,
    memo: z.string().nullable().optional(),
    /**
     * Earlier payments in the last 24 hours. Required when an hourly or daily
     * cap is set; without it the caps fail closed.
     */
    spendHistory: z.array(spendRecordSchema).optional(),
  })
  .strict();

export const analyzeRequestSchema = z
  .object({
    network: z.enum(MONAD_NETWORK_KEYS),
    transaction: callRequestSchema.or(rawTransactionSchema).optional(),
    typedData: typedDataSchema.optional(),
    /** Whose balances the loss rules protect. Defaults to the sender. */
    userWallet: address.optional(),
    /** The full rules. Without them and without a template: Balanced. */
    policy: guardPolicySchema.optional(),
    /**
     * A template by name instead of full rules. The server fills in the
     * network's own USDC as the allowed payment asset.
     */
    policyTemplate: z.enum(POLICY_TEMPLATE_NAMES).optional(),
    payment: paymentContextSchema.optional(),
    integratorRequestId: z.string().max(128).optional(),
  })
  .strict()
  .refine((r) => (r.transaction === undefined) !== (r.typedData === undefined), {
    message: "send exactly one of `transaction` or `typedData`",
  })
  .refine((r) => r.policy === undefined || r.policyTemplate === undefined, {
    message: "send `policy` or `policyTemplate`, not both",
  });

export type CallRequest = z.infer<typeof callRequestSchema>;
export type RawTransaction = z.infer<typeof rawTransactionSchema>;
export type TypedDataRequest = z.infer<typeof typedDataSchema>;
export type PaymentContext = z.infer<typeof paymentContextSchema>;
export type SpendRecord = z.infer<typeof spendRecordSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// ---------------------------------------------------------------------------
// Response

export const DECISIONS = ["safe", "caution", "blocked"] as const;
export type Decision = (typeof DECISIONS)[number];

/**
 * A finding: a code and the values its sentence interpolates. The sentence
 * itself lives in @baret/content. `blocking` says whether this finding alone
 * is enough to block under the policy that was applied.
 */
export const findingSchema = z
  .object({
    code: z.enum(FINDING_CODES),
    severity: z.enum(SEVERITIES),
    values: z.record(z.string(), z.string()),
    blocking: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** A rule that blocked: "Requested {actual}. Your rule allows {limit}." */
export const firedRuleSchema = z
  .object({
    rule: z.enum(GUARD_POLICY_FIELDS as [string, ...string[]]),
    code: z.enum(FINDING_CODES),
    limit: z.string().nullable(),
    actual: z.string().nullable(),
  })
  .strict();

export const assetRefSchema = z
  .object({
    kind: z.enum(["native", "erc20"]),
    /** Null for MON. */
    address: address.nullable(),
    symbol: z.string(),
    decimals: z.number().int().nonnegative(),
  })
  .strict();

/** A balance change for one account and one asset, in base units. */
export const balanceChangeSchema = z
  .object({
    account: address,
    asset: assetRefSchema,
    before: z.string().nullable(),
    after: z.string().nullable(),
    delta: z.string(),
  })
  .strict();

export const approvalChangeSchema = z
  .object({
    owner: address,
    kind: z.enum(["erc20", "operator", "permit"]),
    /** The token or collection contract. */
    contract: address,
    symbol: z.string().nullable(),
    decimals: z.number().int().nonnegative().nullable(),
    spender: address,
    /** Base units; null for collection-wide operator access. */
    amount: z.string().nullable(),
    unlimited: z.boolean(),
  })
  .strict();

export const suggestionSchema = z
  .object({
    /** The finding code the suggestion fixes; the words are its `fix` line. */
    code: z.enum(FINDING_CODES),
    values: z.record(z.string(), z.string()),
  })
  .strict();

export const SOURCE_NAMES = ["alchemy", "nansen", "reputation-registry", "cleanverse"] as const;
export const sourceStatusSchema = z
  .object({
    name: z.enum(SOURCE_NAMES),
    /** skipped: no rule in this policy needed it. */
    status: z.enum(["ok", "unavailable", "skipped"]),
  })
  .strict();

export const analyzeResponseSchema = z
  .object({
    decision: z.enum(DECISIONS),
    findings: z.array(findingSchema),
    firedRules: z.array(firedRuleSchema),
    suggestions: z.array(suggestionSchema),
    confidence: z.enum(["high", "medium", "low"]),
    estimatedChanges: z.array(balanceChangeSchema),
    approvals: z.array(approvalChangeSchema),
    sources: z.array(sourceStatusSchema),
    /** ISO time after which the verdict should be re-checked before signing. */
    expiresAt: z.string(),
    meta: z
      .object({
        requestId: z.string(),
        analysisVersion: z.string(),
        network: z.enum(MONAD_NETWORK_KEYS),
        chainId: z.number().int(),
        analyzedAt: z.string(),
        blockNumber: z.string().nullable(),
        traced: z.boolean(),
        integratorRequestId: z.string().optional(),
      })
      .strict(),
  })
  .strict();

export type Finding = z.infer<typeof findingSchema>;
export type FiredRule = z.infer<typeof firedRuleSchema>;
export type AssetRef = z.infer<typeof assetRefSchema>;
export type BalanceChange = z.infer<typeof balanceChangeSchema>;
export type ApprovalChange = z.infer<typeof approvalChangeSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SourceName = (typeof SOURCE_NAMES)[number];
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
