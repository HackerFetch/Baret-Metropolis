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

/** A key held in memory. For tests and local runs; a deployed agent uses Dynamic. */
export function localSigner(privateKey: Hex): AgentSigner {
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address,
    signTransaction: (tx) => account.signTransaction(tx),
  };
}
