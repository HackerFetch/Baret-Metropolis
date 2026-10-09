import { z } from "zod";
import { analyzeResponseSchema, DECISIONS } from "./analyze.js";

/**
 * The /v1/explain contract: a verdict this server returned, in plain language.
 * The explanation is written by a language model from the verdict's finding
 * codes and values. It adds words, never a decision: `decision` in the answer
 * is copied from the verdict the server itself cached, not produced by the
 * model and not taken from the request.
 */

export const EXPLAIN_LANGUAGES = ["en", "tr", "zh"] as const;

const language = z.enum(EXPLAIN_LANGUAGES).optional();

export const explainRequestSchema = z.union([
  /** The `meta.requestId` of a verdict `/v1/analyze` returned. */
  z.object({ requestId: z.string().min(1).max(128), language }).strict(),
  /**
   * A verdict as `/v1/analyze` returned it. Kept for API users; the server
   * reads only `verdict.meta.requestId` from it and explains its own copy.
   */
  z.object({ verdict: analyzeResponseSchema, language }).strict(),
]);

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
