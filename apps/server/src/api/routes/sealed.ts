import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import {
  SealedFailedError,
  SealedLimitError,
  SealedRejectedError,
  sealedRequestSchema,
} from "../../application/sealed.js";

export const sealedRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * Relays one signed write to the SealedStore and pays its gas. The body is
   * ciphertext and a signature; this server can neither read the entry nor
   * forge one. Every fresh write spends testnet gas, so the route has its own
   * rate limit on top of the relay's daily cap.
   */
  const limit = { max: deps.config.sealedRateLimitPerMinute, timeWindow: "1 minute" };
  app.post("/v1/sealed", { config: { rateLimit: limit } }, async (req, reply) => {
    const body = sealedRequestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const relay = deps.sealed;
    if (!relay) {
      return reply
        .code(503)
        .send({ error: "sealed_unavailable", message: "the sealed store relay is not configured" });
    }
    try {
      return await relay.relay(body.data);
    } catch (err) {
      if (err instanceof SealedRejectedError) {
        return reply
          .code(err.reason === "stale_version" ? 409 : 400)
          .send({ error: `sealed_${err.reason}`, message: err.message });
      }
      if (err instanceof SealedLimitError) {
        return reply.code(429).send({ error: "sealed_daily_limit", message: err.message });
      }
      if (err instanceof SealedFailedError) {
        req.log.warn({ err: err.message }, "sealed write failed");
        return reply.code(502).send({ error: "sealed_failed", message: err.message });
      }
      throw err;
    }
  });
};
