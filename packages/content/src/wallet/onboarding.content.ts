/**
 * apps/wallet, the five-step setup: welcome, passkey, funds, rules, done.
 * Passkey only, no recovery phrase (docs/DECISIONS.md D-006, D-009).
 *
 * One hook and one main action per step. The copy leads with what is absent:
 * there is nothing to write down. It is also honest about the flip side: the
 * passkey is the only way in, so deleting it loses the account.
 *
 * Links to the showcase or the extension install page point at another
 * surface, so they carry a label and no href. The app wires them.
 */

export const onboarding = {
  steps: ["Welcome", "Passkey", "Funds", "Rules", "Done"],

  welcome: {
    title: "No recovery phrase. Your passkey is the key.",
    body: "Your Monad account is made from a passkey, the kind you open with Face ID, Touch ID, Windows Hello or a security key. There are no words to write down.",
    pillars: [
      {
        title: "Reads it",
        body: "Every sign request is simulated and checked before you can sign.",
      },
      {
        title: "Caps it",
        body: "Agents get a budget in a vault, never your key.",
      },
      {
        title: "Holds it",
        body: "A request that breaks your rules stops before you sign.",
      },
    ],
    action: { label: "Create a passkey" },
    existing: { label: "I already have a Baret passkey" },
    footnote: "Monad testnet only. Open source under the MIT licence.",
  },

  passkey: {
    title: "Create your passkey",
    body: "Your browser asks you to confirm with Face ID, Touch ID, Windows Hello or a security key. Baret uses Mera to turn that passkey into your Monad account.",
    action: { label: "Create the passkey" },
    working: "Waiting for your browser",
    success: {
      title: "Your account is ready",
      body: "This passkey is the only way into it. Keep it. If you delete it, there is no phrase to fall back on.",
      action: { label: "Continue" },
    },
    errors: {
      cancelled: {
        title: "No passkey yet",
        body: "You closed the browser prompt, so nothing was created. Try again when you are ready.",
        action: { label: "Try again" },
      },
      unsupported: {
        title: "This browser can't create passkeys",
        body: "Try a recent browser on a device with a screen lock. Or use the Baret extension, which works with a password instead.",
        action: { label: "Get the extension" },
      },
      notCompatible: {
        title: "This passkey can't make an account",
        body: "Your passkey provider lacks a feature Mera needs. Try another device or another password manager.",
        action: { label: "Try again" },
      },
      failed: {
        title: "The passkey was not created",
        body: "Your browser refused. Check that this device has a screen lock, then try again.",
        action: { label: "Try again" },
      },
    },
  },

  fund: {
    title: "Add some testnet MON",
    body: "Network fees are paid in MON. Testnet MON has no value, and the Monad faucet gives it away.",
    balanceLabel: "Your balance",
    addressLabel: "Your address",
    copy: "Copy the address",
    action: { label: "Open the faucet" },
    waiting: "Watching your address for the transfer",
    arrived: "{amount} MON arrived.",
    next: { label: "Continue" },
    minimum: "Continue needs at least 0.1 MON.",
    skip: {
      label: "Skip for now",
      note: "You can look around, but you can't send anything until you have MON.",
    },
    errors: {
      balance: {
        title: "Can't read your balance",
        body: "Monad did not answer. If you already used the faucet, check again in a moment.",
        action: { label: "Check again" },
      },
    },
  },

  /** Template names and descriptions come from shared/policy. */
  policy: {
    title: "Choose your starting rules",
    body: "Rules decide what Baret stops before you sign. Pick a template now and change any single rule later.",
    action: { label: "Use these rules" },
    customise: { label: "See all 25 rules first" },
  },

  done: {
    title: "Your wallet is ready",
    body: "From here on, every sign request is simulated and checked against your rules before you can sign it.",
    suggestions: [
      {
        title: "Watch a trap get caught",
        body: "The Baret showcase has six fake sites, each built around a common trap.",
        action: { label: "Open the showcase" },
      },
      {
        title: "Give an agent a budget",
        body: "Put a capped budget in a vault instead of handing over a key.",
        action: { label: "Set up an agent", href: "/agents" },
      },
      {
        title: "Read your rules",
        body: "See exactly what Baret stops before you sign.",
        action: { label: "Open your rules", href: "/policies" },
      },
    ],
    action: { label: "Open the wallet", href: "/" },
  },
} as const;

export type OnboardingContent = typeof onboarding;
