import { BALANCED_POLICY, policyDraftRequestSchema } from "@baret/guard";
import { LlmUnavailableError } from "@baret/llm";
import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import { buildPolicyDraft, PolicyDraftInvalidError } from "../../application/policy-draft.js";

export const policyDraftRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * Rules from a sentence. The model proposes, the server checks every change
   * against the policy schema and marks the ones that loosen a rule. Nothing
   * is applied: the answer is a proposal the person ticks through. Each call
   * spends paid model credit: a per-minute limit here and a daily cap shared
   * with /v1/explain.
   */
  const limit = { max: deps.config.policyDraftRateLimitPerMinute, timeWindow: "1 minute" };
  app.post("/v1/policy/draft", { config: { rateLimit: limit } }, async (req, reply) => {
    const body = policyDraftRequestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const drafter = deps.policyDrafter;
    if (!drafter) {
      return reply.code(503).send({
        error: "policy_draft_unavailable",
        message: "no model for rule drafts is configured",
      });
    }
    if (deps.kimiBudget && !deps.kimiBudget.take()) {
      return reply.code(429).send({
        error: "policy_draft_daily_limit",
        message: "today's rule drafts are used up; try again tomorrow",
      });
    }

    const current = body.data.current ?? BALANCED_POLICY;
    const language = body.data.language ?? "en";
    try {
      const answer = await drafter.draft(body.data.sentence, current, language);
      return buildPolicyDraft(answer, current, drafter.model);
    } catch (err) {
      if (err instanceof PolicyDraftInvalidError) {
        return reply.code(422).send({ error: "policy_draft_invalid", message: err.message });
      }
      if (err instanceof LlmUnavailableError) {
        req.log.warn({ err: err.message, status: err.status }, "policy draft model unavailable");
        return reply.code(503).send({
          error: "policy_draft_unavailable",
          message: "the model did not answer",
        });
      }
      throw err;
    }
  });
};
