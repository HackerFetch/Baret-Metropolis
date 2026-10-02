import type { AppConfig, NetworkConfig } from "../config/env.js";
import { NansenHttpSource } from "./nansen.js";
import { OnchainRegistrySource } from "./registry.js";
import type { Sources } from "./types.js";

/**
 * Builds the reputation and identity sources for a network. A source that is
 * not configured is null; any rule that needs it then fails closed.
 *
 * The Cleanverse client is not wired yet, so compliance rules fail closed.
 */
export function createSources(config: AppConfig, network: NetworkConfig): Sources {
  return {
    nansen: config.nansenApiKey
      ? new NansenHttpSource({
          apiKey: config.nansenApiKey,
          mode: config.nansenMode,
          timeoutMs: config.requestTimeoutMs,
        })
      : null,
    registry: network.reputationRegistryAddress
      ? new OnchainRegistrySource(
          network.rpcUrl,
          network.reputationRegistryAddress,
          config.requestTimeoutMs,
        )
      : null,
    compliance: null,
  };
}
