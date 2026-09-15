/** Extension options, full settings. Every option gets a plain explanation. */

export const optionsSettings = {
  title: "Settings",

  identity: {
    title: "Identity",
    rows: [
      { label: "Account name", hint: "Only you see this. It is stored on this device." },
      { label: "Address", hint: "Your Monad address. Safe to share." },
      { label: "Accounts", hint: "All derived from the same recovery phrase." },
    ],
  },

  security: {
    title: "Security",
    rows: [
      { label: "Change your passphrase", hint: "Re-encrypts the wallet on this device. Your address does not change." },
      { label: "Lock after inactivity", hint: "Fifteen minutes by default. Lower it if you share the machine." },
      { label: "Show your recovery phrase", hint: "Needs your passphrase. Do this somewhere nobody can see the screen." },
      { label: "Rules", hint: "What Baret blocks on its own." },
    ],
    reveal: {
      title: "Show your recovery phrase",
      body: "Anyone who sees these twelve words owns this account. Make sure nobody is behind you and that you are not sharing your screen.",
      confirm: "Nobody can see my screen",
      action: "Show it",
    },
  },

  network: {
    title: "Network",
    rows: [
      { label: "Network", hint: "Monad testnet. Mainnet is not enabled yet." },
      { label: "Node", hint: "Where balances and simulations are read from." },
      { label: "Analysis server", hint: "Where transactions are checked. Change only if you run your own." },
    ],
    custom: {
      label: "Use my own",
      warning: "A node you do not control can lie to you about your balance and about what a transaction does.",
      test: { label: "Test the connection", ok: "Connected. Chain ID {chainId}.", fail: "Could not reach it." },
    },
  },

  notifications: {
    title: "Notifications",
    rows: [
      { label: "Unsigned movement", hint: "When something leaves the account that Baret did not sign." },
      { label: "Caps", hint: "When a site or agent reaches its limit." },
      { label: "Payments that never settle", hint: "Signed and sent, never confirmed." },
      { label: "Expiring permissions", hint: "A day before one stops working." },
    ],
  },

  privacy: {
    title: "Privacy",
    rows: [
      { label: "Usage data", hint: "Off, and there is no switch. Nothing is collected and nothing is sent." },
      { label: "What the analysis server sees", hint: "The unsigned transaction and the address it came from. Never a key." },
      { label: "Export your data", hint: "Activity, permissions and rules as one file on this device." },
      { label: "Clear activity", hint: "Deletes the local log. On-chain history is public and stays public." },
    ],
  },

  advanced: {
    title: "Advanced",
    rows: [
      { label: "Show raw transaction data", hint: "Adds the calldata panel to every sign screen." },
      { label: "Request timeout", hint: "How long a site may keep a request open before it is declined." },
      { label: "Debug log", hint: "For reporting a bug. It contains addresses but never keys." },
    ],
  },

  about: {
    title: "About",
    rows: [
      { label: "Version", hint: "{version}" },
      { label: "Source", hint: "Read the code that is running." },
      { label: "What it cannot do", hint: "The honest list of limits." },
      { label: "Licence", hint: "MIT" },
    ],
  },

  danger: {
    title: "Danger zone",
    reset: {
      label: "Reset this wallet",
      hint: "Deletes the account, the activity and the rules from this device.",
      confirm: {
        title: "This cannot be undone",
        body: "Everything Baret stored here is deleted. Without your recovery phrase there is no way back in. On-chain funds stay where they are and need the phrase to reach.",
        acknowledge: "I have my recovery phrase written down",
        action: "Reset it",
        cancel: "Cancel",
      },
    },
  },

  saved: "Saved.",
} as const;

export type OptionsSettingsContent = typeof optionsSettings;
