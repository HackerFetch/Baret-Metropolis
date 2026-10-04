/**
 * Extension popup, Settings tab. Compact rows, each opening its full version
 * on the options page.
 *
 * `rows.rules.hint` shows the template the rules started from, or `custom`
 * once they no longer match any template. Never claim a template the rules
 * have drifted away from. {count} in `rows.security` is the auto-lock setting,
 * in minutes.
 */

export const popupSettings = {
  title: "Settings",

  rows: {
    network: { label: "Network" },
    rules: {
      label: "Rules",
      hint: {
        strict: "Strict template",
        balanced: "Balanced template",
        permissive: "Permissive template",
        custom: "Custom rules",
      },
    },
    security: {
      label: "Security",
      hint: "Locks after {count} minutes idle",
      hintOne: "Locks after 1 minute idle",
    },
    sites: { label: "Sites", hint: "{count} connected" },
    payments: {
      label: "Payments",
      hint: "{count} sites with caps",
      hintOne: "1 site with caps",
    },
    about: { label: "About", hint: "Open source under the MIT licence" },
  },

  actions: {
    openFull: "Open all settings",
    lock: "Lock now",
    reset: "Reset wallet",
  },

  reset: {
    title: "Reset this wallet?",
    body: "This deletes the wallet, activity and rules from this device. Only your recovery phrase brings the wallet back.",
    funds: "Your funds stay on Monad. You need the recovery phrase to reach them again.",
    acknowledge: "I have my recovery phrase",
    action: "Reset wallet",
    cancel: "Cancel",
    working: "Resetting",
  },

  errors: {
    reset: {
      title: "Reset didn't finish",
      body: "Some data may still be on this device. Close the popup and try again.",
    },
  },
} as const;

export type PopupSettingsContent = typeof popupSettings;
