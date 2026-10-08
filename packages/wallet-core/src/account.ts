import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  type PasskeyCredentialMetadata,
  type WebAuthnClient,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  type Address,
  bytesToHex,
  concatBytes,
  type Hex,
  type LocalAccount,
  sha256,
  stringToBytes,
} from "viem";
import { privateKeyToAddress } from "viem/accounts";

/**
 * The wallet's account, from a passkey (Mera).
 *
 * A passkey with the WebAuthn PRF extension returns the same 32 bytes every
 * time its owner approves with Face ID, a fingerprint or a security key.
 * Those bytes are the root of everything: there is no seed phrase to write
 * down and nothing is stored on a server. Baret derives two families of keys
 * from them, on separate BIP-44 branches so they can never collide:
 *
 *   m/44'/60'/0'/0/n   the person's own accounts (n = 0 is the wallet)
 *   m/44'/60'/1'/0/n   agent keys on a branch of the same output: kept for
 *                      scripts that hold the output and cannot run a passkey
 *                      prompt (`WalletSession.agentKey`).
 *
 * The wallet app does not use that branch for agents. It gives every agent
 * its own PRF namespace instead (`agentKeyFromPasskey`): the passkey is asked
 * again with a salt that names the agent, and the answer, unrelated to the
 * wallet's output, becomes the agent's key. The wallet's own secret is never
 * an input, so handing an agent its key says nothing about the account, and
 * the same passkey on any device mints the same agent again. One passkey,
 * many keys, none stored anywhere.
 */

/** What the browser must remember to ask for the same passkey again. Not secret. */
export type StoredCredential = PasskeyCredentialMetadata;

export interface PasskeyOptions {
  /** The site the passkey belongs to: `location.hostname`. A passkey never works on another domain. */
  rpId: string;
  /** Tests pass a fake; the browser's WebAuthn is the default. */
  webAuthnClient?: WebAuthnClient;
}

const ACCOUNT_BRANCH = 0;
const AGENT_BRANCH = 1;

function derive(prfOutput: Uint8Array, branch: number, index: number): Uint8Array {
  if (prfOutput.length !== 32) throw new Error("PRF output must be 32 bytes");
  if (!Number.isInteger(index) || index < 0) throw new Error("index must be a whole number");
  const seed = mnemonicToSeedSync(entropyToMnemonic(prfOutput, wordlist));
  const key = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/${branch}'/0/${index}`).privateKey;
  if (!key) throw new Error("key derivation failed");
  return key;
}

/** An agent key the owner can hand over. Treat `privateKey` like any key. */
export interface AgentKey {
  index: number;
  address: Address;
  privateKey: Hex;
}

/**
 * An unlocked wallet. It holds the passkey's output in memory until `lock()`;
 * nothing here is ever written to storage.
 */
export class WalletSession {
  readonly address: Address;
  private readonly session: ReturnType<typeof createSecp256k1SigningSession>;
  private prfOutput: Uint8Array | null;
  private readonly viemAccount: LocalAccount;

  constructor(prfOutput: Uint8Array) {
    this.prfOutput = Uint8Array.from(prfOutput);
    this.session = createSecp256k1SigningSession({
      privateKey: derive(this.prfOutput, ACCOUNT_BRANCH, 0),
    });
    this.viemAccount = toViemAccount(this.session);
    this.address = this.viemAccount.address;
  }

  /** The account as viem sees it, for signing transactions and messages. */
  get account(): LocalAccount {
    if (!this.prfOutput) throw new Error("the wallet is locked");
    return this.viemAccount;
  }

  /** The address of agent key `index`, without exposing the key. */
  agentAddress(index: number): Address {
    return this.agentKey(index).address;
  }

  /** Agent key `index`, to hand to an agent. The same passkey always gives the same key. */
  agentKey(index: number): AgentKey {
    if (!this.prfOutput) throw new Error("the wallet is locked");
    const privateKey = bytesToHex(derive(this.prfOutput, AGENT_BRANCH, index));
    return { index, address: privateKeyToAddress(privateKey), privateKey };
  }

  /** Forgets the keys. The session cannot sign afterwards. */
  lock(): void {
    this.prfOutput?.fill(0);
    this.prfOutput = null;
    this.session.end();
  }

  get locked(): boolean {
    return this.prfOutput === null;
  }
}

/** Names the agent family of PRF namespaces; changing it changes every agent key. */
export const AGENT_NAMESPACE = "baret.agent.v1";

/** The PRF salt of agent `index`: its own namespace, 32 bytes. */
export function agentSalt(index: number): Uint8Array {
  if (!Number.isInteger(index) || index < 0) throw new Error("index must be a whole number");
  return sha256(stringToBytes(`${AGENT_NAMESPACE}:${index}`), "bytes");
}

/**
 * The agent key that comes from one namespace's PRF output. The output is
 * hashed under a label, so it is never used raw and never equals a key some
 * other use of the same output would make.
 */
export function agentKeyFromPrf(prfOutput: Uint8Array, index: number): AgentKey {
  if (prfOutput.length !== 32) throw new Error("PRF output must be 32 bytes");
  const privateKey = sha256(concatBytes([stringToBytes(`${AGENT_NAMESPACE}:key`), prfOutput]));
  return { index, address: privateKeyToAddress(privateKey), privateKey };
}

/**
 * Agent key `index`, from its own PRF namespace. Shows one passkey prompt.
 * Nothing is stored: the same passkey gives the same key on any device.
 */
export async function agentKeyFromPasskey(
  options: PasskeyOptions & { credential?: StoredCredential },
  index: number,
): Promise<AgentKey> {
  const got = await getPasskeyPrfOutput({
    rpId: options.rpId,
    prfSalt: agentSalt(index),
    ...(options.credential ? { credential: options.credential } : {}),
    ...(options.webAuthnClient ? { webAuthnClient: options.webAuthnClient } : {}),
  });
  try {
    return agentKeyFromPrf(got.prfOutput, index);
  } finally {
    got.prfOutput.fill(0);
  }
}

/** Creates a passkey and the wallet that comes from it. Shows the platform's passkey prompt. */
export async function createWallet(
  options: PasskeyOptions & { rpName: string; userName: string; displayName?: string },
): Promise<{ session: WalletSession; credential: StoredCredential }> {
  const created = await createPasskeyWithPrfOutput({
    rp: { id: options.rpId, name: options.rpName },
    user: { name: options.userName, displayName: options.displayName ?? options.userName },
    ...(options.webAuthnClient ? { webAuthnClient: options.webAuthnClient } : {}),
  });
  const session = new WalletSession(created.prfOutput);
  created.prfOutput.fill(0);
  return {
    session,
    credential: {
      credentialId: created.credentialId,
      ...(created.transports ? { transports: created.transports } : {}),
    },
  };
}

/**
 * Unlocks the wallet with its passkey. With `credential` the browser asks
 * for that passkey; without, it offers every passkey this site has.
 */
export async function unlockWallet(
  options: PasskeyOptions & { credential?: StoredCredential },
): Promise<{ session: WalletSession; credential: StoredCredential }> {
  const got = await getPasskeyPrfOutput({
    rpId: options.rpId,
    ...(options.credential ? { credential: options.credential } : {}),
    ...(options.webAuthnClient ? { webAuthnClient: options.webAuthnClient } : {}),
  });
  const session = new WalletSession(got.prfOutput);
  got.prfOutput.fill(0);
  // Signing in reports only the id; keep the transports stored at creation.
  const known = options.credential;
  return {
    session,
    credential:
      known && known.credentialId === got.credentialId ? known : { credentialId: got.credentialId },
  };
}

export { isMeraError, type MeraErrorCode } from "@category-labs/mera";
