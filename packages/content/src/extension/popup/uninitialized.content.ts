/** Extension popup, first run. No wallet exists yet. */

export const uninitialized = {
  title: "Set up Baret",
  body: "A Monad wallet that reads every transaction before you sign it. Setup takes about three minutes and happens in a full tab.",
  points: [
    "No account and no email",
    "Your keys stay on this device",
    "You choose what gets blocked",
  ],
  action: { label: "Start setup" },
  restore: { label: "I already have a recovery phrase" },
  footnote: "Monad testnet only.",
} as const;

export type UninitializedContent = typeof uninitialized;
