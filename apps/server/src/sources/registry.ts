import { type Address, createPublicClient, http, parseAbi } from "viem";
import type { RegistryEntry, RegistrySource } from "./types.js";

const REGISTRY_ABI = parseAbi([
  "function isFlagged(address target) view returns (bool flagged, uint8 severity, string reasonCode)",
]);

/** Reads contracts/src/ReputationRegistry.sol. Throws if any read fails. */
export class OnchainRegistrySource implements RegistrySource {
  private readonly client;

  constructor(
    rpcUrl: string,
    private readonly registry: Address,
    timeoutMs: number,
  ) {
    this.client = createPublicClient({ transport: http(rpcUrl, { timeout: timeoutMs }) });
  }

  async lookup(addresses: readonly Address[]): Promise<Map<Address, RegistryEntry>> {
    const results = await Promise.all(
      addresses.map((target) =>
        this.client.readContract({
          address: this.registry,
          abi: REGISTRY_ABI,
          functionName: "isFlagged",
          args: [target],
        }),
      ),
    );
    return new Map(
      addresses.map((a, i) => {
        const [flagged, severity, reasonCode] = results[i] as readonly [boolean, number, string];
        return [a, { flagged, severity, reasonCode }];
      }),
    );
  }
}
