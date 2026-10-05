import type { CallRequest, RawTransaction } from "@baret/guard";
import {
  type Address,
  getAddress,
  type Hex,
  parseTransaction,
  recoverTransactionAddress,
  type TransactionSerialized,
} from "viem";

/** A transaction in one shape, whatever the client sent. */
export interface NormalizedTx {
  from: Address;
  to: Address | null;
  value: bigint;
  data: Hex;
  /** The gas limit the sender set, if any. Monad charges for all of it. */
  gas: bigint | null;
  /** Price per gas the sender will pay at most, if set. */
  gasPrice: bigint | null;
}

export class TxDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TxDecodeError";
  }
}

const big = (v: string | undefined): bigint | null => (v === undefined ? null : BigInt(v));

/**
 * @param sender who sends an unsigned serialized transaction (the request's
 *   `userWallet`). A signed one names its own sender and ignores this.
 */
export async function decodeTransaction(
  input: CallRequest | RawTransaction,
  chainId: number,
  sender: Address | null = null,
): Promise<NormalizedTx> {
  if ("raw" in input) {
    let parsed: ReturnType<typeof parseTransaction>;
    try {
      parsed = parseTransaction(input.raw as TransactionSerialized);
    } catch (err) {
      throw new TxDecodeError(
        `not a serialized transaction: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const signed = parsed.r !== undefined && parsed.s !== undefined;
    let from: Address;
    if (signed) {
      try {
        from = await recoverTransactionAddress({
          serializedTransaction: input.raw as TransactionSerialized,
        });
      } catch (err) {
        throw new TxDecodeError(
          `bad signature: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else if (sender) {
      from = sender;
    } else {
      throw new TxDecodeError("an unsigned transaction needs `userWallet` as its sender");
    }
    if (parsed.chainId !== undefined && parsed.chainId !== chainId) {
      throw new TxDecodeError(`signed for chain ${parsed.chainId}, expected ${chainId}`);
    }
    return {
      from,
      to: parsed.to ? getAddress(parsed.to) : null,
      value: parsed.value ?? 0n,
      data: parsed.data ?? "0x",
      gas: parsed.gas ?? null,
      gasPrice: parsed.maxFeePerGas ?? parsed.gasPrice ?? null,
    };
  }

  return {
    from: getAddress(input.from),
    to: input.to ? getAddress(input.to) : null,
    value: big(input.value) ?? 0n,
    data: (input.data ?? "0x") as Hex,
    gas: big(input.gas),
    gasPrice: big(input.maxFeePerGas) ?? big(input.gasPrice),
  };
}
