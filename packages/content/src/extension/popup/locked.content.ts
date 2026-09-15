/** Extension popup, locked state. One input, nothing else. */

export const locked = {
  title: "Welcome back",
  body: "Enter your passphrase to unlock.",
  field: { label: "Passphrase", placeholder: "Your passphrase" },
  action: { label: "Unlock" },
  unlocking: "Unlocking",

  reason: {
    idle: "Locked after 15 minutes without activity.",
    manual: "You locked it.",
    restart: "The browser restarted.",
    signRequest: "A site is waiting for a signature. Unlock to see it.",
  },

  errors: {
    wrong: { title: "That passphrase is not right", body: "Check your capitals and try again." },
    throttled: {
      title: "Too many attempts",
      body: "Wait {time} before trying again. This slows down anyone guessing.",
    },
  },

  forgot: {
    label: "I forgot my passphrase",
    title: "There is no reset",
    body: "The passphrase is what encrypts the wallet on this device. Nobody, including us, can recover it. If you have your recovery phrase you can reset and restore. If you do not, the account on this device is gone.",
    reset: { label: "Reset and restore from a recovery phrase" },
    cancel: { label: "Let me try again" },
  },
} as const;

export type LockedContent = typeof locked;
