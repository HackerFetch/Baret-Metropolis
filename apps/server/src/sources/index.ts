import type { AppConfig, NetworkConfig } from "../config/env.js";
import { OnchainComplianceSource } from "./cleanverse.js";
import { NansenHttpSource } from "./nansen.js";
import { OnchainRegistrySource } from "./registry.js";
import type { Sources } from "./types.js";

/**
 * Builds the reputation and identity sources for a network. A source that is
 * not configured is null; any rule that needs it then fails closed.
 */
export function createSources(config: AppConfig, network: NetworkConfig): Sources {
  return {
    nansen: config.nansenApiKey
      ? new NansenHttpSource({
          apiKey: config.nansenApiKey,
          mode: config.nansenMode,
          labelsDailyLimit: config.nansenLabelsDailyLimit,
          timeoutMs: config.requestTimeoutMs,
          // Nansen indexes Monad mainnet only (sources/nansen.ts).
          absenceIsFresh: network.network === "mainnet",
        })
      : null,
    registry: network.reputationRegistryAddress
      ? new OnchainRegistrySource(
          network.rpcUrl,
          network.reputationRegistryAddress,
          config.requestTimeoutMs,
        )
      : null,
    compliance: network.cleanverse
      ? new OnchainComplianceSource(network.rpcUrl, network.cleanverse, config.requestTimeoutMs)
      : null,
  };
}
