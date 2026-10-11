import { analyzeRequestSchema } from "@baret/guard";
import type { FastifyPluginAsync } from "fastify";
import { type AnalyzeDeps, AnalyzeInputError, analyze } from "../../application/analyze.js";
import { RpcUnavailableError } from "../../infra/rpc.js";

const UNREAD: ReadonlySet<string> = new Set(["SIGNATURE_NOT_UNDERSTOOD", "SIGNATURE_UNRECOGNISED"]);

export const analyzeRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  app.post("/v1/analyze", async (req, reply) => {
    const body = analyzeRequestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: "invalid_request",
        issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    try {
      const result = await analyze(body.data, deps);
      deps.verdicts?.remember(result);
      // A signed message the server could not read: counted by kind, so the
      // next kinds to read are chosen from what sites ask for.
      const typed = body.data.typedData;
      if (typed && result.findings.some((f) => UNREAD.has(f.code))) {
        const seen = deps.unreadKinds?.note(typed.primaryType) ?? 0;
        req.log.info({ primaryType: typed.primaryType.slice(0, 64), seen }, "typed data not read");
      }
      return result;
    } catch (err) {
      if (err instanceof AnalyzeInputError) {
        return reply.code(400).send({ error: "invalid_request", message: err.message });
      }
      if (err instanceof RpcUnavailableError) {
        // Fail closed: no verdict. The client shows "Can't reach Baret" (Blocked).
        req.log.warn({ err }, "rpc unavailable");
        return reply
          .code(503)
          .send({ error: "rpc_unavailable", message: "Monad RPC did not answer" });
      }
      throw err;
    }
  });
};
