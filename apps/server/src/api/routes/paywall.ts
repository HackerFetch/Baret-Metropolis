import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import {
  answerFor,
  PaymentRefusedError,
  SettlementFailedError,
  X402_NETWORK,
  X402_VERSION,
  X402LimitError,
} from "../../application/x402.js";

export const paywallRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * Scrybe's paid answer, over x402. Without a payment: 402 and what to pay.
   * With one in X-PAYMENT: the payment is settled on Monad first, and the
   * answer is served only once the transfer is in a block. Every settlement
   * spends the facilitator's gas, so the route has its own rate limit on top
   * of the paywall's daily cap.
   */
  const limit = { max: deps.config.x402RateLimitPerMinute, timeWindow: "1 minute" };
  app.get<{ Querystring: { q?: string } }>(
    "/demo/paywall",
    { config: { rateLimit: limit } },
    async (req, reply) => {
      const paywall = deps.paywall;
      if (!paywall) {
        return reply
          .code(503)
          .send({ error: "paywall_unavailable", message: "the x402 demo is not configured" });
      }
      const question = (req.query.q ?? "").slice(0, 300);
      // The resource as the payer names it: the path, whatever host forwarded it.
      const resource = `/demo/paywall${question ? `?q=${encodeURIComponent(question)}` : ""}`;
      const demand = (error: string) =>
        reply
          .code(402)
          .send({ x402Version: X402_VERSION, error, accepts: [paywall.requirements(resource)] });

      const header = req.headers["x-payment"];
      if (typeof header !== "string" || header === "")
        return demand("X-PAYMENT header is required");

      try {
        const settled = await paywall.settle(header);
        const receipt = {
          success: true,
          transaction: settled.transaction,
          network: X402_NETWORK,
          payer: settled.payer,
        };
        return reply
          .header("x-payment-response", Buffer.from(JSON.stringify(receipt)).toString("base64"))
          .send({ answer: answerFor(question), payment: { ...receipt, amount: settled.amount } });
      } catch (err) {
        // x402: a payment that is not accepted is answered with 402 and the reason.
        if (err instanceof PaymentRefusedError) return demand(err.message);
        if (err instanceof X402LimitError) {
          return reply.code(429).send({ error: "paywall_daily_limit", message: err.message });
        }
        if (err instanceof SettlementFailedError) {
          req.log.warn({ err: err.message }, "x402 settlement failed");
          return reply.code(502).send({ error: "settlement_failed", message: err.message });
        }
        throw err;
      }
    },
  );
};
