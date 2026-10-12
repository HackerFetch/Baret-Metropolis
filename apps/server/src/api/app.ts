import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type { AnalyzeDeps } from "../application/analyze.js";
import { clientOf } from "./client.js";
import { analyzeRoutes } from "./routes/analyze.js";
import { auditRoutes } from "./routes/audit.js";
import { explainRoutes } from "./routes/explain.js";
import { healthRoutes } from "./routes/health.js";
import { mcpRoutes } from "./routes/mcp.js";
import { paywallRoutes } from "./routes/paywall.js";
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
    // X-Forwarded-For. A direct caller can forge that entry; once the proxy
    // hops are configured the limits key on an entry a proxy wrote instead
    // (client.ts).
    trustProxy: true,
  });

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? [...config.corsOrigins] : true,
    // x402: a browser on another origin has to be able to read the receipt.
    exposedHeaders: ["x-payment-response"],
  });
  await app.register(rateLimit, {
    max: config.rateLimitPerMinute,
    timeWindow: "1 minute",
    keyGenerator: (req) => clientOf(req, config.proxyTrust),
  });

  // A body the framework cannot read is answered in the API's own error
  // shape (`{ error, message }`), like a body the routes refuse. Everything
  // else keeps the framework's answer (the rate limiter's 429, a 404).
  app.setErrorHandler((err, _req, reply) => {
    const code = (err as { code?: string }).code;
    if (code === "FST_ERR_CTP_INVALID_JSON_BODY" || code === "FST_ERR_CTP_EMPTY_JSON_BODY") {
      return reply.code(400).send({ error: "invalid_request", message: "the body is not JSON" });
    }
    if (code === "FST_ERR_CTP_BODY_TOO_LARGE") {
      return reply
        .code(413)
        .send({ error: "payload_too_large", message: "the body is over 256 KiB" });
    }
    return reply.send(err);
  });

  // Every answer is data, never a page: no sniffing it into one, no framing
  // it, no referrer out of it, no browser feature for it.
  app.addHook("onSend", async (_req, reply) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  });

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
  await app.register(paywallRoutes, deps);
  return app;
}
