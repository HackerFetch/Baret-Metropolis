import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type { AnalyzeDeps } from "../application/analyze.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { auditRoutes } from "./routes/audit.js";
import { explainRoutes } from "./routes/explain.js";
import { healthRoutes } from "./routes/health.js";
import { mcpRoutes } from "./routes/mcp.js";
import { policyDraftRoutes } from "./routes/policy-draft.js";
import { reviewRoutes } from "./routes/review.js";
import { sealedRoutes } from "./routes/sealed.js";

export async function buildApp(deps: AnalyzeDeps): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({
    logger: { level: config.logLevel },
    bodyLimit: 256 * 1024,
    // The server sits behind its host's proxy, and the sites reach it through
    // their own: without this every visitor has the proxy's address and shares
    // one rate-limit bucket. With it a client is the first address in
    // X-Forwarded-For. A direct caller can forge that header to get a fresh
    // per-minute bucket; the daily caps on the paid routes do not key on it.
    trustProxy: true,
  });

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? [...config.corsOrigins] : true,
  });
  await app.register(rateLimit, { max: config.rateLimitPerMinute, timeWindow: "1 minute" });

  // API keys: required when configured. Health stays open for uptime checks.
  app.addHook("onRequest", async (req, reply) => {
    if (config.apiKeys.length === 0 || req.url.startsWith("/health")) return;
    const key = req.headers["x-api-key"];
    if (typeof key !== "string" || !config.apiKeys.includes(key)) {
      return reply
        .code(401)
        .send({ error: "unauthorized", message: "missing or unknown x-api-key" });
    }
  });

  await app.register(healthRoutes, deps);
  await app.register(analyzeRoutes, deps);
  await app.register(auditRoutes, deps);
  await app.register(explainRoutes, deps);
  await app.register(reviewRoutes, deps);
  await app.register(policyDraftRoutes, deps);
  await app.register(sealedRoutes, deps);
  await app.register(mcpRoutes, deps);
  return app;
}
