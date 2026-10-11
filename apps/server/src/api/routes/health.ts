import type { FastifyPluginAsync } from "fastify";
import type { AnalyzeDeps } from "../../application/analyze.js";
import { ANALYSIS_VERSION } from "../../application/analyze.js";
import type { NetworkConfig } from "../../config/env.js";

/**
 * Which optional settings a network has. Booleans and counts only: never a
 * URL, key or address, so this is safe on an open endpoint.
 */
function configured(n: NetworkConfig, deps: AnalyzeDeps) {
  const { config } = deps;
  return {
    nansen: config.nansenApiKey !== null,
    // The mode set, the mode the next new address is answered in, and the
    // label lookups left today: a switch of NANSEN_MODE is visible here.
    ...nansenState(n, deps),
    cleanverse: n.cleanverse !== null,
    indexer: config.envioEndpoint !== null,
    explain: config.explain !== null,
    policyDraft: deps.policyDrafter != null,
    review: deps.review != null,
    reviewSends: deps.review?.sends ?? false,
    sealed: deps.sealed != null,
    // Signed messages the server could not read since it started, and how
    // many different kinds: numbers only, the names stay in the log.
    unreadSignatures: deps.unreadKinds?.messages ?? 0,
    unreadSignatureKinds: deps.unreadKinds?.kinds ?? 0,
    separateTraceRpc: n.traceRpcUrl !== n.rpcUrl,
    usdc: n.usdcAddress !== null,
    reputationRegistry: n.reputationRegistryAddress !== null,
    knownContracts: n.knownContracts.length,
    paymentGuardFactory: n.paymentGuardFactoryAddress !== null,
  };
}

function nansenState(n: NetworkConfig, deps: AnalyzeDeps) {
  let state = null;
  try {
    state = deps.sourcesFor(n).nansen?.describe?.() ?? null;
  } catch {
    // A source that cannot be built reads as off.
  }
  return {
    nansenMode: state?.mode ?? null,
    nansenAnswering: state?.answering ?? null,
    nansenLabelsLeftToday: state?.labelsLeftToday ?? null,
  };
}

export const healthRoutes: FastifyPluginAsync<AnalyzeDeps> = async (app, deps) => {
  /** The commit Render built, so a deploy can be confirmed from outside. */
  const commit = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null;

  app.get("/health", async () => ({ status: "ok", analysisVersion: ANALYSIS_VERSION, commit }));

  /** Ready when every configured network answers with the chain id it should have. */
  app.get("/health/ready", async (_req, reply) => {
    const checks = await Promise.all(
      Object.values(deps.config.networks).map(async (n) => {
        try {
          const chainId = await deps.rpcFor(n).getChainId();
          return {
            network: n.network,
            ok: chainId === n.chainId,
            chainId,
            configured: configured(n, deps),
          };
        } catch {
          return {
            network: n.network,
            ok: false,
            chainId: null,
            configured: configured(n, deps),
          };
        }
      }),
    );
    const ready = checks.every((c) => c.ok);
    return reply
      .code(ready ? 200 : 503)
      .send({ status: ready ? "ready" : "not_ready", networks: checks });
  });
};
