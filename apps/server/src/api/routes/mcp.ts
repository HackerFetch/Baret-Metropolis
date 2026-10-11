import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import { handleMcp, isRpcRequest } from "../../application/mcp.js";

export const mcpRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /**
   * Baret's tools for AI agents (Model Context Protocol, Streamable HTTP):
   * one JSON-RPC message in, one JSON answer out. A tool call runs the same
   * analysis as /v1/analyze, so it shares that route's cost and gets a
   * limit of its own.
   */
  const limit = { max: deps.config.mcpRateLimitPerMinute, timeWindow: "1 minute" };
  app.post("/mcp", { config: { rateLimit: limit } }, async (req, reply) => {
    if (!isRpcRequest(req.body)) {
      return reply.code(400).send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "send one JSON-RPC 2.0 message" },
      });
    }
    const answer = await handleMcp(req.body, deps);
    // A notification has no answer: accepted, nothing in the body.
    if (answer === null) return reply.code(202).send();
    return reply.header("content-type", "application/json").send(answer);
  });

  // No server-to-client stream and no session to end.
  const noStream = { error: "method_not_allowed", message: "POST one JSON-RPC message to /mcp" };
  app.get("/mcp", async (_req, reply) => reply.code(405).header("allow", "POST").send(noStream));
  app.delete("/mcp", async (_req, reply) => reply.code(405).header("allow", "POST").send(noStream));
};
