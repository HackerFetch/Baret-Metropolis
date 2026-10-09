import { randomUUID } from "node:crypto";
import { type ExplainResponse, explainRequestSchema } from "@baret/guard";
import { LlmUnavailableError } from "@baret/llm";
import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";

export const explainRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * A verdict this server returned, in plain language. The words come from a
   * model; the decision is copied from the server's own cached verdict, never
   * from the request. No model, or no usable answer from it: 503, and the
   * client keeps showing the findings as it does today. Every call can spend
   * paid model credit, so the route has a tighter rate limit of its own.
   */
  const limit = { max: deps.config.explainRateLimitPerMinute, timeWindow: "1 minute" };
  app.post("/v1/explain", { config: { rateLimit: limit } }, async (req, reply) => {
    const body = explainRequestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const explainer = deps.explainer;
    if (!explainer) {
      return reply
        .code(503)
        .send({ error: "explain_unavailable", message: "no explanation model is configured" });
    }

    const requestId =
      "requestId" in body.data ? body.data.requestId : body.data.verdict.meta.requestId;
    const verdict = deps.verdicts?.get(requestId);
    if (!verdict) {
      return reply.code(404).send({
        error: "verdict_unknown",
        message: "this server has no verdict with that requestId; analyze the transaction again",
      });
    }
    const language = body.data.language ?? "en";
    const write = () => explainer.explain(verdict, language);
    try {
      const explanation = deps.explanations
        ? await deps.explanations.getOrCreate(requestId, language, write)
        : await write();
      const answer: ExplainResponse = {
        decision: verdict.decision,
        explanation,
        language,
        model: explainer.model,
        requestId: randomUUID(),
      };
      return answer;
    } catch (err) {
      if (err instanceof LlmUnavailableError) {
        req.log.warn({ err: err.message, status: err.status }, "explanation model unavailable");
        return reply.code(503).send({
          error: "explain_unavailable",
          message: "the explanation model did not answer",
        });
      }
      throw err;
    }
  });
};
