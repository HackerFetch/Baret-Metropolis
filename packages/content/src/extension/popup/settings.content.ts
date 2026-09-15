/** Extension popup, Settings tab. Compact rows, each linking to the full page. */

export const popupSettings = {
  title: "Settings",

  rows: [
    { label: "Network", hint: "Monad testnet" },
    { label: "Rules", hint: "{template} rule set" },
    { label: "Security", hint: "Locks after {minutes} minutes" },
    { label: "Sites", hint: "{count} connected" },
    { label: "Agent payments", hint: "{count} merchants with a cap" },
    { label: "About", hint: "Version {version}, open source" },
  ],

  actions: {
    openFull: "Open the full settings",
    lock: "Lock now",
    reset: "Reset this wallet",
  },

  reset: {
    title: "Reset this wallet",
    body: "Everything on this device is deleted: the account, the activity and the rules. Without your recovery phrase you cannot get back in.",
    acknowledge: "I have my recovery phrase",
    action: "Reset it",
    cancel: "Cancel",
  },
} as const;

export type PopupSettingsContent = typeof popupSettings;
