import { z } from "zod";
import { EXPLAIN_LANGUAGES } from "./explain.js";
import { guardPolicySchema } from "./policy.js";

/**
 * The /v1/policy/draft contract: a sentence in, a proposed rule set out.
 * A language model reads the sentence and suggests changes; the server checks
 * every change against the policy schema and marks the ones that loosen a
 * rule. Nothing is applied: the person ticks the changes they want.
 */

export const policyDraftRequestSchema = z
  .object({
    /** What the person wants, in their own words. Data for the model, never an instruction. */
    sentence: z.string().trim().min(1).max(400),
    /** The rules the change starts from. Default: the Balanced template. */
    current: guardPolicySchema.optional(),
    language: z.enum(EXPLAIN_LANGUAGES).optional(),
  })
  .strict();

/** What the model answers. Field names and values are checked by the server afterwards. */
export const policyDraftModelSchema = z.object({
  changes: z
    .array(
      z.object({
        field: z.string().min(1).max(64),
        value: z.unknown(),
        why: z.string().max(320).default(""),
      }),
    )
    .max(25),
  note: z.string().max(600).default(""),
});

export const policyDraftChangeSchema = z
  .object({
    field: z.string(),
    from: z.unknown(),
    to: z.unknown(),
    why: z.string(),
    /** True when the change allows something `current` did not. The UI leaves it unticked. */
    loosens: z.boolean(),
  })
  .strict();

export const policyDraftResponseSchema = z
  .object({
    /** `current` with every accepted change applied. Valid against the policy schema. */
    policy: guardPolicySchema,
    changes: z.array(policyDraftChangeSchema),
    /** Changes the model proposed that the schema does not allow, with the reason. */
    refused: z.array(z.object({ field: z.string(), reason: z.string() }).strict()),
    note: z.string(),
    model: z.object({ provider: z.string(), name: z.string() }).strict(),
  })
  .strict();

export type PolicyDraftRequest = z.infer<typeof policyDraftRequestSchema>;
export type PolicyDraftModelAnswer = z.infer<typeof policyDraftModelSchema>;
export type PolicyDraftChange = z.infer<typeof policyDraftChangeSchema>;
export type PolicyDraftResponse = z.infer<typeof policyDraftResponseSchema>;
