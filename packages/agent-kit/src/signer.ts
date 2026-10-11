import type { Address, Hex, TransactionSerializable } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Whatever holds the agent's key. AgentWallet only ever asks it to sign a
 * transaction Baret has already cleared.
 */
export interface AgentSigner {
  readonly address: Address;
  /** Returns the signed, serialized transaction, ready to broadcast. */
  signTransaction(tx: TransactionSerializable): Promise<Hex>;
}

/** An EIP-712 message, as `eth_signTypedData_v4` takes it (without EIP712Domain in `types`). */
export interface TypedMessage {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

/** A key that signs x402 payments. payX402 only asks it about a payment Baret has cleared. */
export interface PaymentSigner {
  readonly address: Address;
  signTypedData(typed: TypedMessage): Promise<Hex>;
}

/** A key held in memory. For tests and local runs; a deployed agent uses Dynamic. */
export function localSigner(privateKey: Hex): AgentSigner & PaymentSigner {
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    signTransaction: (tx) => account.signTransaction(tx),
    signTypedData: (typed) => account.signTypedData(typed as never),
  };
}
