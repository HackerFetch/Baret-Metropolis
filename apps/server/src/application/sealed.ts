import {
  type Address,
  createPublicClient,
  encodeFunctionData,
  type Hex,
  http,
  isAddressEqual,
  keccak256,
  parseAbi,
  recoverTypedDataAddress,
  size,
} from "viem";
import { z } from "zod";
import type { NetworkConfig } from "../config/env.js";
import { KimiBudget } from "./policy-draft.js";
import type { PaymentSender } from "./review.js";

/**
 * The relayer for sealed settings (contracts/src/SealedStore.sol).
 *
 * A wallet seals its owner's rules with a key from the passkey and signs the
 * write with a second key from the same passkey namespace
 * (packages/wallet-core/src/sealed.ts). That signing key holds no funds, so
 * this server pays the gas. It is a courier and nothing more: it sees
 * ciphertext, an id that is not a wallet address, and a signature. It cannot
 * read an entry, cannot write one the key did not sign, and cannot put an
 * older entry back, because the contract checks the signature and the version
 * again. Every write costs testnet gas, so fresh writes have a daily cap on
 * top of the route's rate limit.
 */

/** SealedStore.MAX_SIZE. */
export const SEALED_MAX_BYTES = 2048;

const SEALED_STORE_ABI = parseAbi([
  "function put(address id, uint64 version, bytes blob, bytes signature)",
  "function get(address id) view returns (uint64 version, bytes blob)",
]);

const PUT_TYPES = {
  Put: [
    { name: "id", type: "address" },
    { name: "version", type: "uint64" },
    { name: "blobHash", type: "bytes32" },
  ],
} as const;

const UINT64_MAX = (1n << 64n) - 1n;

export const sealedRequestSchema = z
  .object({
    id: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    /** A decimal string: JSON has no 64-bit integers. */
    version: z.string().regex(/^[1-9]\d{0,19}$/),
    blob: z.string().regex(/^0x([0-9a-fA-F]{2})+$/),
    signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
  })
  .strict();

export type SealedRequest = z.infer<typeof sealedRequestSchema>;

export interface SealedAnswer {
  id: Address;
  version: string;
  /** The transaction that stored the entry. */
  hash: Hex;
}

/** The request is not one the store would take: nothing was sent. */
export class SealedRejectedError extends Error {
  constructor(
    readonly reason: "too_large" | "bad_signature" | "stale_version",
    message: string,
  ) {
    super(message);
  }
}

export class SealedLimitError extends Error {}

/** The write was sent or tried and did not land. */
export class SealedFailedError extends Error {}

export interface SealedRelayOptions {
  store: Address;
  chainId: number;
  dailyLimit: number;
  /** The version the store holds under an id; 0 when there is none. */
  current: (id: Address) => Promise<bigint>;
  send: PaymentSender;
  now?: () => number;
}

export class SealedRelay {
  private readonly budget: KimiBudget;

  constructor(private readonly options: SealedRelayOptions) {
    // The same per-UTC-day counter the model routes use.
    this.budget = new KimiBudget(options.dailyLimit, options.now);
  }

  async relay(request: SealedRequest): Promise<SealedAnswer> {
    const { store, chainId } = this.options;
    const id = request.id as Address;
    const blob = request.blob as Hex;
    const signature = request.signature as Hex;
    const version = BigInt(request.version);
    if (version > UINT64_MAX) {
      throw new SealedRejectedError("stale_version", "the version does not fit 64 bits");
    }
    if (size(blob) > SEALED_MAX_BYTES) {
      throw new SealedRejectedError(
        "too_large",
        `a sealed entry is at most ${SEALED_MAX_BYTES} bytes`,
      );
    }

    // Checked here before any gas is spent; the contract checks all of it again.
    let signer: Address;
    try {
      signer = await recoverTypedDataAddress({
        domain: { name: "Baret SealedStore", version: "1", chainId, verifyingContract: store },
        types: PUT_TYPES,
        primaryType: "Put",
        message: { id, version, blobHash: keccak256(blob) },
        signature,
      });
    } catch {
      throw new SealedRejectedError("bad_signature", "the signature is not valid");
    }
    if (!isAddressEqual(signer, id)) {
      throw new SealedRejectedError("bad_signature", "the entry is not signed by its id's key");
    }

    let stored: bigint;
    try {
      stored = await this.options.current(id);
    } catch {
      throw new SealedFailedError("the store could not be read");
    }
    if (version <= stored) {
      throw new SealedRejectedError(
        "stale_version",
        `the store already holds version ${stored} for this id`,
      );
    }

    if (!this.budget.take()) throw new SealedLimitError("today's sealed writes are used up");
    const sent = await this.options.send({
      to: store,
      data: encodeFunctionData({
        abi: SEALED_STORE_ABI,
        functionName: "put",
        args: [id, version, blob, signature],
      }),
      value: 0n,
    });
    if (sent.status !== "confirmed" || !sent.hash) {
      throw new SealedFailedError(`the write was not confirmed (${sent.status})`);
    }
    return { id, version: request.version, hash: sent.hash };
  }
}

/** Reads an id's stored version from the SealedStore on `network`. */
export function storedVersionReader(network: NetworkConfig, store: Address) {
  const client = createPublicClient({ transport: http(network.rpcUrl) });
  return async (id: Address): Promise<bigint> => {
    const [version] = await client.readContract({
      address: store,
      abi: SEALED_STORE_ABI,
      functionName: "get",
      args: [id],
    });
    return version;
  };
}
