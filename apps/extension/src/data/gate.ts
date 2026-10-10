import { createContext, use } from "react";

/**
 * What a live page knows that the sample store does not hold: whether the
 * real wallet is locked, and the keystore's own operations. Null on a sample
 * page, where the screens keep their stand-ins.
 *
 * A context, not an import of the live code: the screens stay free of the
 * extension's APIs, so the sample and the tests load them as before.
 */
export interface Gate {
  readonly locked: boolean;
  readonly lockReason: "manual" | "idle" | "restart";
  /** Locks the wallet now. */
  lock(): void;
  /** Call after the passphrase opened it: the pages come back. */
  opened(): void;
  /** Removes the vault and everything stored, then opens setup. */
  wipe(restore: boolean): void;
  /**
   * Makes the wallet: seals a phrase (a new one, or the reader's own) under
   * the passphrase and adds its first account. An error message on failure.
   */
  create(passphrase: string, phrase?: string): Promise<{ address: string } | { error: string }>;
  /** The recovery phrase of the open wallet, for the backup step; null while locked. */
  phrase(): Promise<readonly string[] | null>;
  /** The phrase, once the passphrase was typed again (Settings). Null on a wrong one. */
  reveal(passphrase: string): Promise<readonly string[] | null>;
  /** Seals the vault under a new passphrase. False when the current one is wrong. */
  rekey(current: string, next: string): Promise<boolean>;
  /**
   * Setup's account check, for real: reads the balance from Monad, then signs
   * a test message with the open key and confirms the signature is the
   * account's. Nothing is sent. False when either step fails.
   */
  checkAccount(step: (line: number) => void): Promise<boolean>;
}

export const GateContext = createContext<Gate | null>(null);

export function useGate(): Gate | null {
  return use(GateContext);
}
