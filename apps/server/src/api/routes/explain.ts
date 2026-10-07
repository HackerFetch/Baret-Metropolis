import { randomUUID } from "node:crypto";
import { type ExplainResponse, explainRequestSchema } from "@baret/guard";
import { LlmUnavailableError } from "@baret/llm";
import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";

export const explainRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * A verdict in plain language. The words come from a model; the decision is
   * copied from the verdict in the request. No model, or no usable answer from
   * it: 503, and the client keeps showing the findings as it does today.
   */
  app.post("/v1/explain", async (req, reply) => {
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

    const { verdict } = body.data;
    const language = body.data.language ?? "en";
    try {
      const answer: ExplainResponse = {
        decision: verdict.decision,
        explanation: await explainer.explain(verdict, language),
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
