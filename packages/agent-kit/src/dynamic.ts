import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type Address, getAddress, type Hex, type TransactionSerializable } from "viem";
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

/**
 * The SDK is an optional peer dependency: `@dynamic-labs-wallet/node-evm`
 * is loaded the first time a Dynamic wallet is created or signs, and a
 * wallet with a local signer never needs it. The types it hands over are
 * kept opaque here, so the package's own declarations do not reach for it.
 */
export const DYNAMIC_PACKAGE = "@dynamic-labs-wallet/node-evm";

/** Dynamic's description of a wallet: stored as is, handed back as is. */
export type DynamicWalletMetadata = object;
/** This machine's share of the wallet's key: stored as is, handed back as is. */
export type DynamicServerKeyShare = object;

/** The part of Dynamic's EVM client this file uses. */
export interface DynamicClient {
  authenticateApiToken(token: string): Promise<unknown>;
  createWalletAccount(args: {
    thresholdSignatureScheme: "TWO_OF_TWO";
    password?: string;
    onError?: (error: Error) => void;
    backUpToDynamic?: boolean;
  }): Promise<{
    walletMetadata: DynamicWalletMetadata & { accountAddress: string };
    externalServerKeyShares: DynamicServerKeyShare[];
  }>;
  signTransaction(args: {
    walletMetadata: DynamicWalletMetadata;
    transaction: TransactionSerializable;
    password?: string;
    externalServerKeyShares?: DynamicServerKeyShare[];
  }): Promise<string>;
}

/** What `baret wallet create` saves. */
export interface StoredDynamicWallet {
  address: Address;
  walletMetadata: DynamicWalletMetadata;
  externalServerKeyShares: DynamicServerKeyShare[];
}

export interface DynamicCredentials {
  /** From the Dynamic dashboard: Developer → SDK & API keys. */
  environmentId: string;
  /** A server API token. Never ship it to a browser. */
  authToken: string;
  /**
   * Encrypts the wallet's backup at Dynamic. Dynamic requires one to create a
   * wallet, and the same one to sign with it.
   */
  password: string;
}

/** Loads the SDK on demand, and says what to install when it is not there. */
async function loadDynamic(): Promise<
  new (options: {
    environmentId: string;
    enableMPCAccelerator: boolean;
  }) => unknown
> {
  try {
    const sdk = await import(DYNAMIC_PACKAGE);
    return sdk.DynamicEvmWalletClient;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
      throw new Error(
        `the Dynamic signer needs ${DYNAMIC_PACKAGE}, which is not installed: npm install ${DYNAMIC_PACKAGE}@1.1.28 (a local signer does not need it)`,
      );
    }
    throw err;
  }
}

async function connect(c: DynamicCredentials): Promise<DynamicClient> {
  const DynamicEvmWalletClient = await loadDynamic();
  const client = new DynamicEvmWalletClient({
    environmentId: c.environmentId,
    enableMPCAccelerator: false,
  }) as DynamicClient;
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
    thresholdSignatureScheme: "TWO_OF_TWO",
    backUpToDynamic: true,
    password: options.password,
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
  let client: Promise<DynamicClient> | null = null;
  return {
    address: wallet.address,
    async signTransaction(transaction) {
      client ??= connect(credentials);
      const signed = await (await client).signTransaction({
        walletMetadata: wallet.walletMetadata,
        externalServerKeyShares: wallet.externalServerKeyShares,
        password: credentials.password,
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
