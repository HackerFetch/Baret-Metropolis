/**
 * Where setup picks up when it is opened again, and when it first asks for
 * the passphrase. Pure, tested in resume.test.ts.
 *
 * A browser restart locks the keystore, and setup can come back on a step
 * that needs the open wallet: the backup reads the phrase, funds reads the
 * balance (the page reads it only while the wallet is open) and the account
 * check signs. Those steps ask for the passphrase on the page first.
 *
 * "Finish setup" on the welcome of a wallet that already exists goes back to
 * the backup while it was never confirmed. A wallet restored from a phrase
 * counts as backed up (the reader typed the words from their own copy), so
 * it goes to funds, as before.
 */

export type Screen =
  | "welcome"
  | "restore"
  | "passphrase"
  | "key"
  | "backup"
  | "fund"
  | "account"
  | "rules"
  | "done";

/** The steps that cannot work on a locked wallet. */
export const NEEDS_OPEN: readonly Screen[] = ["backup", "fund", "account"];

/** True when this step must ask for the passphrase before it shows. */
export function needsUnlock(screen: Screen, gate: { readonly locked: boolean } | null): boolean {
  return gate?.locked === true && NEEDS_OPEN.includes(screen);
}

export interface Resume {
  readonly step: Screen;
  /** Whether the indicator draws the key and the backup as skipped. */
  readonly restored: boolean;
}

/** Where "Finish setup" goes, from the wallet's backup flag. */
export function resumeAt(backedUp: boolean): Resume {
  return backedUp ? { step: "fund", restored: true } : { step: "backup", restored: false };
}
