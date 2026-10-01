import type { AppConfig, NetworkConfig } from "../config/env.js";
import { OnchainRegistrySource } from "./registry.js";
import type { Sources } from "./types.js";

/**
 * Builds the reputation and identity sources for a network. A source that is
 * not configured is null; any rule that needs it then fails closed.
 *
 * Nansen and Cleanverse clients are wired in Week 3 (docs/ROADMAP.md).
 */
export function createSources(config: AppConfig, network: NetworkConfig): Sources {
  return {
    nansen: null,
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
