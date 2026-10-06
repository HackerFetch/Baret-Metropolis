import { createTestIndexer } from "envio";
import { describe, expect, it } from "vitest";

/**
 * Runs the handlers over real Monad testnet blocks: the wallet check of
 * 2026-10-05 (apps/server/scripts/verify-wallet.ts), which opened a vault
 * through the factory and took it through its whole life.
 *
 *   68470144  VaultCreated          68470162  MerchantCapSet
 *   68470154  Deposited             68470166  Paid
 *   68470158  AgentSignerSet        68470171  AgentSignerRevoked
 *
 * Needs ENVIO_API_TOKEN (HyperSync) and the network, so it is not part of
 * the workspace test run: `pnpm --filter @baret/indexer test:chain`.
 */

const VAULT = "0xe0b411e9f1f48194a9aa426b2f955e16b4b8a8bd";
const OWNER = "0x346cfae706b395af444e9bc36a1e72d45c32051a";
const AGENT = "0xa81b07986c1ee8ea8764fe09f951f164001b4511";
const MERCHANT = "0x1365566191baa9872a64acdce963751d5343ff49";
const USDC = "0x534b2f3a21130d7a60830c2df862319e593943a3";

type Change = Record<string, { sets?: Record<string, unknown>[] } | number | undefined>;

/** Every row written to `entity` across the processed blocks, in order. */
function sets(changes: readonly Change[], entity: string): Record<string, unknown>[] {
  return changes.flatMap((c) => {
    const entry = c[entity];
    return typeof entry === "object" && entry?.sets ? entry.sets : [];
  });
}

describe("a vault's life, from real blocks", () => {
  it("follows a factory vault from creation to the agent's revocation", async () => {
    const indexer = createTestIndexer();
    const { changes } = (await indexer.process({
      chains: { 10143: { startBlock: 68_470_144, endBlock: 68_470_171 } },
    })) as unknown as { changes: Change[] };

    const vault = sets(changes, "Vault");
    expect(vault[0]).toMatchObject({ id: VAULT, owner: OWNER, token: USDC, paymentCount: 0 });
    // The last write is the revocation: no agent, one payment of 0.1 USDC on record.
    expect(vault.at(-1)).toMatchObject({
      id: VAULT,
      owner: OWNER,
      deposited: 500_000n,
      paid: 100_000n,
      paymentCount: 1,
    });
    expect(vault.at(-1)?.agent).toBeUndefined();
    expect(vault.some((row) => row.agent === AGENT)).toBe(true);

    expect(sets(changes, "Merchant").at(-1)).toMatchObject({
      id: `${VAULT}-${MERCHANT}`,
      address: MERCHANT,
      perTxCap: 200_000n,
      hourlyCap: 0n,
      dailyCap: 400_000n,
      active: true,
      paused: false,
      paid: 100_000n,
      paymentCount: 1,
    });

    const payments = sets(changes, "Payment");
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      vault_id: VAULT,
      merchant: MERCHANT,
      agent: AGENT,
      amount: 100_000n,
      block: 68_470_166,
    });

    expect(sets(changes, "VaultActivity").map((a) => a.kind)).toEqual([
      "created",
      "deposited",
      "agentSet",
      "merchantCapSet",
      "paid",
      "agentRevoked",
    ]);
  });
});
