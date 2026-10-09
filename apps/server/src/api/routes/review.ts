import type { OutgoingHttpHeaders } from "node:http";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import {
  type ReviewEvent,
  ReviewLimitError,
  reviewRequestSchema,
} from "../../application/review.js";

/** The headers set so far (CORS among them), which a hijacked reply must send itself. */
function headersOf(reply: FastifyReply, extra: OutgoingHttpHeaders): OutgoingHttpHeaders {
  const out: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(reply.getHeaders())) {
    if (value !== undefined) out[name] = value;
  }
  return { ...out, ...extra };
}

/** Writes a JSON body on a reply that was hijacked before anything was sent. */
function rawJson(reply: FastifyReply, status: number, body: unknown) {
  reply.raw.writeHead(status, headersOf(reply, { "content-type": "application/json" }));
  reply.raw.end(JSON.stringify(body));
}

export const reviewRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * The agent reviewer on Baret's own demo vault, one of three fixed
   * scenarios. Every fresh run spends model credit and can send a testnet
   * payment, so the route has its own rate limit on top of the service's
   * daily cap and half-hour cache. With `accept: text/event-stream` the steps
   * stream as they happen.
   */
  const limit = { max: deps.config.reviewRateLimitPerMinute, timeWindow: "1 minute" };
  app.post("/v1/review", { config: { rateLimit: limit } }, async (req, reply) => {
    const body = reviewRequestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    const service = deps.review;
    if (!service) {
      return reply
        .code(503)
        .send({ error: "review_unavailable", message: "the review demo is not configured" });
    }
    const { scenario } = body.data;

    if (!(req.headers.accept ?? "").includes("text/event-stream")) {
      try {
        return await service.run(scenario);
      } catch (err) {
        if (err instanceof ReviewLimitError) {
          return reply.code(429).send({ error: "review_daily_limit", message: err.message });
        }
        req.log.warn({ err }, "review run failed");
        return reply
          .code(503)
          .send({ error: "review_failed", message: "the review run did not finish" });
      }
    }

    // Server-sent events: the headers go out with the first event, so a
    // run refused before it starts still gets a plain status code.
    reply.hijack();
    let open = false;
    const write = ({ event, data }: ReviewEvent | { event: "error"; data: unknown }) => {
      if (!open) {
        reply.raw.writeHead(
          200,
          headersOf(reply, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          }),
        );
        open = true;
      }
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      const answer = await service.run(scenario, write);
      write({ event: "done", data: answer });
    } catch (err) {
      if (!open && err instanceof ReviewLimitError) {
        rawJson(reply, 429, { error: "review_daily_limit", message: err.message });
        return;
      }
      req.log.warn({ err }, "review run failed");
      write({ event: "error", data: { message: "the review run did not finish" } });
    }
    reply.raw.end();
  });
};
