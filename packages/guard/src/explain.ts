import { z } from "zod";
import { analyzeResponseSchema, DECISIONS } from "./analyze.js";

/**
 * The /v1/explain contract: a verdict in, the same verdict in plain language
 * out. The explanation is written by a language model from the verdict's
 * finding codes and values. It adds words, never a decision: `decision` in the
 * answer is copied from the verdict that was sent, not produced by the model.
 */

export const EXPLAIN_LANGUAGES = ["en", "tr"] as const;

export const explainRequestSchema = z
  .object({
    /** A verdict as `/v1/analyze` returned it. */
    verdict: analyzeResponseSchema,
    language: z.enum(EXPLAIN_LANGUAGES).optional(),
  })
  .strict();

export const explanationSchema = z
  .object({
    /** One line: what Baret decided and the main reason. */
    headline: z.string().min(1).max(160),
    /** Two to four sentences for someone who has never read a transaction. */
    summary: z.string().min(1).max(900),
    /** One short point per finding that matters, most serious first. */
    points: z.array(z.string().min(1).max(320)).max(8),
    /** What the reader can do next. */
    advice: z.string().min(1).max(320),
  })
  .strict();

export const explainResponseSchema = z
  .object({
    decision: z.enum(DECISIONS),
    explanation: explanationSchema,
    language: z.enum(EXPLAIN_LANGUAGES),
    /** Which model wrote the words. */
    model: z.object({ provider: z.string(), name: z.string() }).strict(),
    requestId: z.string(),
  })
  .strict();

export type ExplainRequest = z.infer<typeof explainRequestSchema>;
export type Explanation = z.infer<typeof explanationSchema>;
export type ExplainResponse = z.infer<typeof explainResponseSchema>;
export type ExplainLanguage = (typeof EXPLAIN_LANGUAGES)[number];
