/**
 * apps/wallet, settings. Order: grouped settings, the danger zone, and the
 * record notice (what Baret keeps and who sees what). Every row gets one
 * plain line. The danger zone states every consequence before the button.
 */

export const settings = {
  title: "Settings",

  groups: [
    {
      title: "Account",
      rows: [
        { label: "Account name", hint: "Only you see it. It is stored in this browser." },
        { label: "Address", hint: "Your Monad address. Share it to get paid." },
        {
          label: "Passkey",
          hint: "Created with Mera. It is the only way into this account, so keep it.",
        },
      ],
    },
    {
      title: "Security",
      rows: [
        { label: "Lock after inactivity", hint: "Locks the wallet after 15 minutes without use." },
        {
          label: "Ask for your passkey on every signature",
          hint: "On, every signature needs Face ID, Touch ID, Windows Hello or your security key. Off, only opening the wallet does.",
        },
        { label: "Rules", hint: "What Baret stops before you sign." },
      ],
    },
    {
      title: "Network",
      rows: [
        { label: "Network", hint: "Monad testnet. Mainnet is not available yet." },
        {
          label: "Node",
          hint: "Your balances are read and your transactions are sent through the public Monad testnet node.",
        },
        {
          label: "Analysis server",
          hint: "Baret's server checks every request before you sign.",
        },
      ],
    },
    {
      title: "Privacy",
      rows: [
        {
          label: "Usage analytics",
          hint: "Off. Baret collects no analytics, and there is no switch to turn it on.",
        },
        {
          label: "Export your data",
          hint: "Your activity, permissions and rules, as one file saved on this device.",
        },
      ],
    },
    {
      title: "About",
      rows: [
        { label: "Version", hint: "Open source under the MIT licence." },
        { label: "Source code", hint: "Read the code this wallet runs." },
        { label: "Known limits", hint: "What Baret can't do yet, listed plainly." },
      ],
    },
  ],

  danger: {
    title: "Danger zone",
    reset: {
      label: "Reset this wallet",
      consequences: [
        "Deletes the activity log, rules and settings stored in this browser.",
        "Leaves your funds where they are, on your Monad address.",
        "Leaves your agent key active. Revoke it first if payments should stop.",
        "Keeps your passkey. Use it to open the same account again.",
      ],
      confirm: {
        title: "Reset this wallet?",
        body: "This can't be undone. Your funds and your vault stay on Monad.",
        acknowledge: "I have revoked anything I want stopped",
        action: "Reset the wallet",
        cancel: "Keep everything",
      },
    },
  },

  /** What is recorded, and who sees the request. */
  record: {
    title: "What Baret keeps",
    body: "Checks run on the Baret server. It sees the unsigned request, your address and the site that asked, and keeps an audit record of each check.",
    points: [
      "Every verdict goes into your activity log, with the rule that fired.",
      "Every override is logged with the rule it went past.",
      "Baret never receives your passkey or your keys.",
    ],
  },

  /** Live only: the read-only row that replaces the lock switch. */
  session: {
    label: "This session",
    hint: "Signing needs no prompt until {time}. Then the wallet locks itself and the keys leave memory.",
    /** With the passkey asked on every signature. */
    hintAsk: "Your session ends at {time}. Then the wallet locks itself and the keys leave memory.",
  },
  /** Live only: the hint of the passkey-on-every-signature row. */
  passkeyHintLive:
    "On, every signature asks for your passkey. Off, only opening the wallet does. Showing the agent key always asks.",

  /**
   * Live only: the sealed copy of the rules, the merchants' names and the
   * account's name, encrypted with a key from the passkey and kept on Monad.
   */
  sealed: {
    title: "Your rules on every device",
    body: "Your rules and the names you gave your merchants are stored in this browser. Save an encrypted copy and the same passkey brings them back on any device.",
    points: [
      "The copy is encrypted here, with a key only your passkey can make. The key is never stored.",
      "The encrypted copy is kept on Monad, filed under an id that is not your address.",
      "Baret's server pays for the save. It cannot read the copy or change it.",
    ],
    save: "Save an encrypted copy",
    restore: "Bring them back here",
    prompt: "The first of these in a session asks for your passkey.",
    busy: "Waiting for your passkey and Monad.",
    state: {
      current: "The encrypted copy matches what you see here.",
      changed: "You changed something since the last copy. Save again to keep it.",
    },
    outcome: {
      saved: "Saved. Encrypted copy number {version} is on Monad.",
      restored: "Your rules and merchant names are back, from copy number {version}.",
      empty: "This passkey has no encrypted copy yet. Nothing was changed.",
      cancelled: "The passkey prompt was closed. Nothing was changed.",
      failed: "That did not work. Nothing was changed. Try again.",
    },
  },

  saved: "Saved.",

  errors: {
    save: {
      title: "That setting was not saved",
      body: "The previous value still applies. Try again.",
      action: { label: "Try again" },
    },
  },
} as const;

export type SettingsContent = typeof settings;
