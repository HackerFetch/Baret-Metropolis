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
import { type Address, bytesToHex, type Hex, type LocalAccount } from "viem";
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
 *   m/44'/60'/1'/0/n   agent keys: a key the owner can hand to an agent,
 *                      authorise on a PaymentGuard vault, and derive again
 *                      at any time to audit or revoke it. One passkey, many
 *                      keys, and none of them needs a backup.
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
