/**
 * Extension popup, locked. One field, nothing else.
 *
 * The button never says "unlock" (docs/BRAND.md section 09). `reason` is the
 * small line under the title that says why the wallet is locked right now.
 * {count} in `reason.idle` is the auto-lock setting, in minutes. The pause
 * after too many tries is announced once; its countdown is shown, not read.
 */

export const locked = {
  title: "Welcome back",
  body: "Enter your passphrase to open your wallet.",
  field: { label: "Passphrase", placeholder: "Your passphrase", show: "Show", hide: "Hide" },
  action: { label: "Open wallet" },
  working: "Opening",

  reason: {
    idle: "Locked after {count} minutes without activity.",
    idleOne: "Locked after 1 minute without activity.",
    manual: "You locked it.",
    restart: "Locked when the browser restarted.",
    signRequest: "{origin} is waiting for your signature. Open the wallet to review it.",
    connectRequest: "{origin} wants to connect. Open the wallet to review it.",
  },

  errors: {
    wrong: { title: "Wrong passphrase", body: "Check Caps Lock and try again." },
    throttled: {
      title: "Too many tries",
      body: "Wait {count} seconds, then try again. The pause slows down anyone guessing.",
      bodyOne: "Wait 1 second, then try again. The pause slows down anyone guessing.",
      countdown: "{count} seconds left",
      countdownOne: "1 second left",
      over: "The pause is over. You can try again.",
    },
  },

  forgot: {
    label: "Forgot your passphrase?",
    title: "It can't be recovered",
    body: "Your passphrase encrypts the wallet on this device. Nobody can recover it, including us.",
    restore: "With your recovery phrase, you can reset Baret and restore the wallet.",
    noPhrase: "Without that phrase, this wallet can't be opened again.",
    resetNote: "Resetting erases the wallet, activity and rules on this device.",
    reset: { label: "Reset and restore" },
    cancel: { label: "Try again" },
  },
} as const;

export type LockedContent = typeof locked;
