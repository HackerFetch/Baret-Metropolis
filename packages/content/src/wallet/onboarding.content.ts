/**
 * apps/wallet, the five-step setup. Passkey only, no recovery phrase.
 *
 * The whole point of this surface is the Mera passkey account layer, so the
 * copy leads with what is absent: there is nothing to write down.
 */

export const onboarding = {
  steps: ["Welcome", "Passkey", "Funds", "Rules", "Done"],

  welcome: {
    title: "No recovery phrase. Just this device.",
    body: "Your account is created from a passkey, so there are no twelve words to write down and lose. Your device and your fingerprint are the key.",
    points: [
      "Nothing to write down",
      "Every transaction checked before you sign",
      "Works with the same rules as the extension",
    ],
    action: { label: "Create a passkey" },
    footnote: "Monad testnet only. Open source under the MIT licence.",
  },

  passkey: {
    title: "Create your passkey",
    body: "Your browser will ask you to confirm with your fingerprint, your face or a security key. That is the whole setup.",
    action: { label: "Continue" },
    working: "Waiting for your browser",
    success: {
      title: "Your account is ready",
      body: "Your device is your key. There is no phrase to store and no password to forget.",
    },
    errors: {
      cancelled: {
        title: "Cancelled",
        body: "You closed the browser prompt, so nothing was created. Press continue to try again.",
      },
      unsupported: {
        title: "This browser cannot do it",
        body: "Passkeys need a recent browser with a screen lock or a security key. The extension works without one.",
        action: { label: "Install the extension", href: "/install" },
      },
      failed: {
        title: "That did not work",
        body: "Your browser refused to create the passkey. Check that a screen lock is set up, then try again.",
      },
    },
  },

  fund: {
    title: "Add some testnet MON",
    body: "You need a small amount to pay network fees. Testnet MON has no value and the faucet gives it away.",
    balanceLabel: "Current balance",
    addressLabel: "Your address",
    action: { label: "Open the faucet" },
    waiting: "Watching for the transfer",
    arrived: "Funds arrived.",
    skip: {
      label: "Skip for now",
      note: "You can look around, but you cannot send anything until you have a balance.",
    },
    minimum: "You need at least 0.1 MON to continue.",
  },

  policy: {
    title: "Pick your rules",
    body: "This decides what Baret blocks on its own. Change any single rule later from Policies.",
    action: { label: "Use this rule set" },
    customise: { label: "See every rule first" },
  },

  done: {
    title: "You are protected.",
    body: "Every transaction from here on is decoded, simulated and checked against the rules you just picked.",
    suggestions: [
      {
        title: "Try the showcase",
        body: "Six sites, six attacks, all caught live.",
        action: { label: "Open it", href: "/showcase" },
      },
      {
        title: "Set up an agent",
        body: "Give a bot a spending limit instead of a key.",
        action: { label: "Agent delegation" },
      },
      {
        title: "Read your rules",
        body: "See exactly what you just agreed to block.",
        action: { label: "Policies" },
      },
    ],
    action: { label: "Open the wallet" },
  },
} as const;

export type OnboardingContent = typeof onboarding;
