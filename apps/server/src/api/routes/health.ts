import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import { ANALYSIS_VERSION } from "../../application/analyze.js";

export const healthRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  app.get("/health", async () => ({ status: "ok", analysisVersion: ANALYSIS_VERSION }));

  /** Ready when every configured network answers with the chain id it should have. */
  app.get("/health/ready", async (_req, reply) => {
    const checks = await Promise.all(
      Object.values(deps.config.networks).map(async (n) => {
        try {
          const chainId = await deps.rpcFor(n).getChainId();
          return { network: n.network, ok: chainId === n.chainId, chainId };
        } catch {
          return { network: n.network, ok: false, chainId: null };
        }
      }),
    );
    const ready = checks.every((c) => c.ok);
    return reply
      .code(ready ? 200 : 503)
      .send({ status: ready ? "ready" : "not_ready", networks: checks });
  });
};
