import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DynamicEvmWalletClient } from "@dynamic-labs-wallet/node-evm";
import { type Address, getAddress, type Hex } from "viem";
import type { AgentSigner } from "./signer.js";

/**
 * The agent's wallet as a Dynamic server wallet (D-019).
 *
 * The key never exists in one place: Dynamic's MPC splits it between
 * Dynamic and this machine, and every signature needs both. What this
 * machine holds (the wallet's metadata and its key share) is written to one
 * file with owner-only permissions. Losing the file loses the wallet;
 * leaking it alone does not, since Dynamic's share and the API token are
 * needed too.
 */

type SignArgs = Parameters<DynamicEvmWalletClient["signTransaction"]>[0];
type CreateArgs = Parameters<DynamicEvmWalletClient["createWalletAccount"]>[0];

/** What `baret wallet create` saves. */
export interface StoredDynamicWallet {
  address: Address;
  walletMetadata: SignArgs["walletMetadata"];
  externalServerKeyShares: NonNullable<SignArgs["externalServerKeyShares"]>;
}

export interface DynamicCredentials {
  /** From the Dynamic dashboard: Developer → SDK & API keys. */
  environmentId: string;
  /** A server API token. Never ship it to a browser. */
  authToken: string;
}

async function connect(c: DynamicCredentials): Promise<DynamicEvmWalletClient> {
  // Loaded on demand: the SDK ships native code, and a wallet with a local
  // signer should not need it.
  const { DynamicEvmWalletClient } = await import("@dynamic-labs-wallet/node-evm");
  const client = new DynamicEvmWalletClient({
    environmentId: c.environmentId,
    enableMPCAccelerator: false,
  });
  await client.authenticateApiToken(c.authToken);
  return client;
}

/** Creates a server wallet for the agent and saves it to `file`. */
export async function createDynamicWallet(
  options: DynamicCredentials & { file: string },
): Promise<StoredDynamicWallet> {
  const client = await connect(options);
  let failure: Error | null = null;
  const created = await client.createWalletAccount({
    thresholdSignatureScheme: "TWO_OF_TWO" as CreateArgs["thresholdSignatureScheme"],
    backUpToDynamic: true,
    onError: (error) => {
      failure = error;
    },
  });
  if (failure) throw failure;

  const stored: StoredDynamicWallet = {
    address: getAddress(created.walletMetadata.accountAddress),
    walletMetadata: created.walletMetadata,
    externalServerKeyShares: created.externalServerKeyShares,
  };
  await mkdir(dirname(options.file), { recursive: true, mode: 0o700 });
  await writeFile(options.file, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
  await chmod(options.file, 0o600);
  return stored;
}

/** A signer backed by a saved Dynamic server wallet. */
export function dynamicSigner(
  credentials: DynamicCredentials,
  wallet: StoredDynamicWallet,
): AgentSigner {
  let client: Promise<DynamicEvmWalletClient> | null = null;
  return {
    address: wallet.address,
    async signTransaction(transaction) {
      client ??= connect(credentials);
      const signed = await (await client).signTransaction({
        walletMetadata: wallet.walletMetadata,
        externalServerKeyShares: wallet.externalServerKeyShares,
        transaction,
      });
      return signed as Hex;
    },
  };
}

export async function dynamicSignerFromFile(
  options: DynamicCredentials & { file: string },
): Promise<AgentSigner> {
  let text: string;
  try {
    text = await readFile(options.file, "utf8");
  } catch {
    throw new Error(`no agent wallet at ${options.file}: run \`baret wallet create\` first`);
  }
  return dynamicSigner(options, JSON.parse(text) as StoredDynamicWallet);
}
