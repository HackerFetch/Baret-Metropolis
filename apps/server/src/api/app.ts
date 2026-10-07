import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type { AnalyzeDeps } from "../application/analyze.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { auditRoutes } from "./routes/audit.js";
import { explainRoutes } from "./routes/explain.js";
import { healthRoutes } from "./routes/health.js";

export async function buildApp(deps: AnalyzeDeps): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({
    logger: { level: config.logLevel },
    bodyLimit: 256 * 1024,
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
  return app;
}
