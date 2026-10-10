import { MONAD_NETWORKS, type MonadNetwork } from "@baret/guard";
import { getPasskeyPrfOutput } from "@category-labs/mera";
import {
  type Address,
  bytesToHex,
  concatBytes,
  createPublicClient,
  type Hex,
  hexToBytes,
  http,
  keccak256,
  type LocalAccount,
  type PublicClient,
  parseAbi,
  sha256,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { PasskeyOptions, StoredCredential } from "./account.js";
import { WALLET_CONTRACTS } from "./constants.js";

/**
 * Sealed settings: state a passkey can open again on any device.
 *
 * The wallet's rules and the names it gave its merchants are not secret
 * enough to guard and too personal to publish, and until now they lived in
 * one browser's storage: a new device started from the defaults. Here they are
 * encrypted with a key that only the passkey can make, and the ciphertext is
 * kept where every device can read it (the SealedStore contract on Monad).
 *
 * This is a third PRF namespace, next to the wallet's and the agents'. The
 * passkey is asked with a salt that names it, and the 32 bytes that come back
 * are used for nothing else. Two keys come from them, each under its own HKDF
 * label so neither says anything about the other:
 *
 *   encrypt    AES-256-GCM, never extractable. Seals and opens the settings.
 *   identity   secp256k1. Its address is the entry's `id` in the store, and
 *              its signature is what the store accepts a write under. It holds
 *              no funds and signs no transaction: a relayer pays for the write.
 *
 * Neither key is the wallet account's, and the id cannot be linked to the
 * account's address. Nothing here is written to storage: the same passkey
 * makes the same two keys again, which is how a fresh browser finds and opens
 * the entry.
 */

/** Names this PRF namespace; changing it orphans every sealed entry. */
export const SEALED_NAMESPACE = "baret.sealed.v1";

/** The longest blob the store takes, in bytes (SealedStore.MAX_SIZE). */
export const SEALED_MAX_BYTES = 2048;

export const SEALED_STORE_ABI = parseAbi([
  "function put(address id, uint64 version, bytes blob, bytes signature)",
  "function get(address id) view returns (uint64 version, bytes blob)",
  "function digest(address id, uint64 version, bytes32 blobHash) view returns (bytes32)",
  "error EmptyBlob()",
  "error BlobTooLarge()",
  "error StaleVersion()",
  "error BadSignature()",
]);

/** The EIP-712 types the identity key signs a write with. */
export const SEALED_PUT_TYPES = {
  Put: [
    { name: "id", type: "address" },
    { name: "version", type: "uint64" },
    { name: "blobHash", type: "bytes32" },
  ],
} as const;

export function sealedDomain(store: Address, chainId: number) {
  return { name: "Baret SealedStore", version: "1", chainId, verifyingContract: store } as const;
}

/** The PRF salt of this namespace, 32 bytes. */
export function sealedSalt(): Uint8Array {
  return sha256(stringToBytes(SEALED_NAMESPACE), "bytes");
}

/** A write the store will accept, ready for a relayer. Nothing in it is secret. */
export interface SealedPut {
  id: Address;
  /** A decimal string: JSON has no 64-bit integers. */
  version: string;
  blob: Hex;
  signature: Hex;
}

/** What the store holds under an id. Version 0: nothing was ever written. */
export interface SealedEntry {
  version: bigint;
  blob: Hex;
}

const FORMAT = 1;
const NONCE_BYTES = 12;

function fresh(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

/** What the ciphertext is bound to: an entry cannot be opened as another id's or another version's. */
function bound(id: Address, version: bigint): Uint8Array<ArrayBuffer> {
  return fresh(stringToBytes(`${SEALED_NAMESPACE}:${id.toLowerCase()}:${version}`));
}

/**
 * The two keys of the sealed namespace, in memory until `forget()`. Made
 * from that namespace's PRF output and from nothing else.
 */
export class SealedKeys {
  /** The entry's id in the store: the identity key's address. */
  readonly id: Address;
  private encrypt: CryptoKey | null;
  private identity: LocalAccount | null;

  private constructor(encrypt: CryptoKey, identity: LocalAccount) {
    this.encrypt = encrypt;
    this.identity = identity;
    this.id = identity.address;
  }

  static async fromPrf(prfOutput: Uint8Array): Promise<SealedKeys> {
    if (prfOutput.length !== 32) throw new Error("PRF output must be 32 bytes");
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error("this browser has no WebCrypto");
    const root = await subtle.importKey("raw", fresh(prfOutput), "HKDF", false, [
      "deriveKey",
      "deriveBits",
    ]);
    const hkdf = (label: string) => ({
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: fresh(stringToBytes(`${SEALED_NAMESPACE}:${label}`)),
    });
    const encrypt = await subtle.deriveKey(
      hkdf("encrypt"),
      root,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const scalar = new Uint8Array(await subtle.deriveBits(hkdf("identity"), root, 256));
    try {
      return new SealedKeys(encrypt, privateKeyToAccount(bytesToHex(scalar)));
    } finally {
      scalar.fill(0);
    }
  }

  private keys(): { encrypt: CryptoKey; identity: LocalAccount } {
    if (!this.encrypt || !this.identity) throw new Error("the sealed keys were forgotten");
    return { encrypt: this.encrypt, identity: this.identity };
  }

  /** Encrypts `plain` as this id's entry `version`: one format byte, the nonce, the ciphertext. */
  async seal(plain: Uint8Array, version: bigint): Promise<Hex> {
    const { encrypt } = this.keys();
    const nonce = globalThis.crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
    const sealed = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: bound(this.id, version) },
      encrypt,
      fresh(plain),
    );
    const blob = concatBytes([Uint8Array.of(FORMAT), nonce, new Uint8Array(sealed)]);
    if (blob.length > SEALED_MAX_BYTES) throw new Error("too large to seal");
    return bytesToHex(blob);
  }

  /** Opens this id's entry `version`. Throws when it was not sealed by these keys for that slot. */
  async open(blob: Hex, version: bigint): Promise<Uint8Array> {
    const { encrypt } = this.keys();
    const bytes = hexToBytes(blob);
    if (bytes.length <= 1 + NONCE_BYTES || bytes[0] !== FORMAT) {
      throw new Error("not a sealed entry");
    }
    const plain = await globalThis.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fresh(bytes.subarray(1, 1 + NONCE_BYTES)),
        additionalData: bound(this.id, version),
      },
      encrypt,
      fresh(bytes.subarray(1 + NONCE_BYTES)),
    );
    return new Uint8Array(plain);
  }

  /** Seals `plain` as `version` and signs the write the store at `store` will accept. */
  async put(
    target: { store: Address; chainId: number },
    version: bigint,
    plain: Uint8Array,
  ): Promise<SealedPut> {
    const { identity } = this.keys();
    const blob = await this.seal(plain, version);
    const signature = await identity.signTypedData({
      domain: sealedDomain(target.store, target.chainId),
      types: SEALED_PUT_TYPES,
      primaryType: "Put",
      message: { id: this.id, version, blobHash: keccak256(blob) },
    });
    return { id: this.id, version: version.toString(), blob, signature };
  }

  /** Drops both keys. The object cannot seal, open or sign afterwards. */
  forget(): void {
    this.encrypt = null;
    this.identity = null;
  }

  get forgotten(): boolean {
    return this.encrypt === null;
  }
}

/**
 * The sealed namespace's keys, from the passkey. Shows one passkey prompt.
 * The same passkey gives the same keys on any device.
 */
export async function sealedKeysFromPasskey(
  options: PasskeyOptions & { credential?: StoredCredential },
): Promise<SealedKeys> {
  const got = await getPasskeyPrfOutput({
    rpId: options.rpId,
    prfSalt: sealedSalt(),
    ...(options.credential ? { credential: options.credential } : {}),
    ...(options.webAuthnClient ? { webAuthnClient: options.webAuthnClient } : {}),
  });
  try {
    return await SealedKeys.fromPrf(got.prfOutput);
  } finally {
    got.prfOutput.fill(0);
  }
}

/** Reads the entry under `id` from the store. An id never written reads as version 0. */
export async function readSealed(options: {
  store: Address;
  id: Address;
  rpcUrl?: string;
  client?: PublicClient;
}): Promise<SealedEntry> {
  const client = options.client ?? createPublicClient({ transport: http(options.rpcUrl) });
  const [version, blob] = await client.readContract({
    address: options.store,
    abi: SEALED_STORE_ABI,
    functionName: "get",
    args: [options.id],
  });
  return { version, blob };
}

/** The store and chain a wallet on `network` seals to, or null where there is no store. */
export function sealedTarget(
  network: MonadNetwork = "testnet",
): { store: Address; chainId: number } | null {
  const store = WALLET_CONTRACTS[network]?.sealedStore;
  return store ? { store, chainId: MONAD_NETWORKS[network].chainId } : null;
}
