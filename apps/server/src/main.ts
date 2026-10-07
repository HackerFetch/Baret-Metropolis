import type { MonadNetwork } from "@baret/guard";
import { buildApp } from "./api/app.js";
import { kimiExplainer } from "./application/explain.js";
import { loadConfig } from "./config/env.js";
import { type MonadRpc, ViemMonadRpc } from "./infra/rpc.js";
import { createSources } from "./sources/index.js";
import type { Sources } from "./sources/types.js";

const config = loadConfig();
const rpcs = new Map<MonadNetwork, MonadRpc>();
const sources = new Map<MonadNetwork, Sources>();

const app = await buildApp({
  config,
  explainer: config.explain ? kimiExplainer(config.explain) : null,
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
});

if (config.apiKeys.length === 0) {
  app.log.warn("BARET_API_KEYS is empty: /v1 endpoints are open. Set it before deploying.");
}

await app.listen({ port: config.port, host: config.host });
