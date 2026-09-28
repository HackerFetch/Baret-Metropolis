/**
 * Extension popup, first run. No wallet exists yet.
 *
 * Setup does not fit in 360 by 600, so this screen makes the case in three
 * verbs and hands off to the options page, where the eight steps live.
 * `restore` goes to the same setup, starting from a recovery phrase.
 */

export const uninitialized = {
  title: "Read first. Then sign.",
  body: "Baret checks every Monad transaction before you sign it. Setup opens in a full tab.",
  points: [
    "Reads it. Every transaction is simulated and checked before you sign.",
    "Caps it. Agent payments stay inside the caps you set.",
    "Holds it. Anything over a cap stops and asks you first.",
  ],
  action: { label: "Set up Baret" },
  restore: { label: "Restore a wallet", note: "Have your recovery phrase ready." },
  footnote: "Your keys stay on this device.",
} as const;

export type UninitializedContent = typeof uninitialized;
