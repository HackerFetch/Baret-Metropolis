import type { MonadNetwork } from "@baret/guard";
import { buildApp } from "./api/app.js";
import { type AnalyzeDeps, analyze } from "./application/analyze.js";
import { kimiExplainer } from "./application/explain.js";
import { KimiBudget, kimiPolicyDrafter } from "./application/policy-draft.js";
import { monadSender, qwenReviewerFactory, ReviewService } from "./application/review.js";
import { ExplanationCache, VerdictCache } from "./application/verdicts.js";
import { loadConfig } from "./config/env.js";
import { type MonadRpc, ViemMonadRpc } from "./infra/rpc.js";
import { createSources } from "./sources/index.js";
import type { Sources } from "./sources/types.js";

const config = loadConfig();
const rpcs = new Map<MonadNetwork, MonadRpc>();
const sources = new Map<MonadNetwork, Sources>();

const deps: AnalyzeDeps = {
  config,
  explainer: config.explain ? kimiExplainer(config.explain) : null,
  policyDrafter: config.explain ? kimiPolicyDrafter(config.explain) : null,
  kimiBudget: new KimiBudget(config.kimiDailyLimit),
  verdicts: new VerdictCache(),
  explanations: new ExplanationCache(),
  rpcFor: (n) => {
    let rpc = rpcs.get(n.network);
    if (!rpc) {
      rpc = new ViemMonadRpc(n, config.requestTimeoutMs);
      rpcs.set(n.network, rpc);
    }
    return rpc;
  },
  sourcesFor: (n) => {
    let s = sources.get(n.network);
    if (!s) {
      s = createSources(config, n);
      sources.set(n.network, s);
    }
    return s;
  },
};

// The review demo reads this server's own API through its tools, with the
// first API key when keys are required, and sends only from the testnet vault.
const testnet = config.networks.testnet;
if (config.review && testnet) {
  const review = config.review;
  const qwen = qwenReviewerFactory(review, config.apiKeys[0]);
  deps.review = new ReviewService({
    config: review,
    analyze: (request) => analyze(request, deps),
    reviewer: qwen.reviewer,
    model: qwen.model,
    send: review.agentPrivateKey ? monadSender(testnet, review.agentPrivateKey) : null,
  });
}

const app = await buildApp(deps);

if (config.apiKeys.length === 0) {
  app.log.warn("BARET_API_KEYS is empty: /v1 endpoints are open. Set it before deploying.");
}

await app.listen({ port: config.port, host: config.host });
