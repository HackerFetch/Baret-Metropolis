/** apps/wallet, settings. Every option gets a one-line plain explanation. */

export const settings = {
  title: "Settings",

  groups: [
    {
      title: "Account",
      rows: [
        { label: "Account name", hint: "Only you see this. It is stored on this device." },
        { label: "Address", hint: "Your Monad address. Safe to share." },
        { label: "Passkey", hint: "The key lives on this device and in your password manager if you sync one." },
      ],
    },
    {
      title: "Security",
      rows: [
        { label: "Lock after inactivity", hint: "Locks the wallet when you walk away. Fifteen minutes by default." },
        { label: "Require a passkey to sign", hint: "Ask for your fingerprint or face on every signature, not just on unlock." },
        { label: "Rules", hint: "What Baret blocks on its own." },
      ],
    },
    {
      title: "Network",
      rows: [
        { label: "Network", hint: "Monad testnet. Mainnet is not enabled yet." },
        { label: "Node", hint: "Where balances and simulations are read from. Change only if you run your own." },
        { label: "Analysis server", hint: "Where transactions are checked. Change only if you run your own." },
      ],
    },
    {
      title: "Privacy",
      rows: [
        { label: "Usage data", hint: "Off, and there is no switch to turn it on. Nothing is collected." },
        { label: "Export your data", hint: "Activity, permissions and rules as a single file on your device." },
      ],
    },
    {
      title: "About",
      rows: [
        { label: "Version", hint: "Open source under the MIT licence." },
        { label: "Source", hint: "Read the code that is running." },
        { label: "What it cannot do", hint: "The honest list of limits." },
      ],
    },
  ],

  danger: {
    title: "Danger zone",
    reset: {
      label: "Reset this wallet",
      hint: "Removes the account, the activity and the rules from this device.",
      confirm: {
        title: "This cannot be undone",
        body: "The passkey stays in your browser, but everything Baret stored here is deleted. If you have funds on this account, move them first.",
        acknowledge: "I have moved anything I want to keep",
        action: "Reset the wallet",
        cancel: "Keep it",
      },
    },
  },

  saved: "Saved.",
} as const;

export type SettingsContent = typeof settings;
