/**
 * Extension options, full settings. Every option says what it does in one
 * line. Privacy names what leaves the device and where it goes. The danger
 * zone lists what a reset deletes and what it leaves behind before the button.
 */

export const optionsSettings = {
  title: "Settings",
  lead: "Your account, locking, network and notifications, and exactly what leaves this device.",

  identity: {
    title: "Account",
    rows: [
      { label: "Account name", hint: "Only you see it. It is stored on this device." },
      { label: "Address", hint: "Your Monad address. Share it to receive MON." },
      { label: "Accounts", hint: "All of them come from the same recovery phrase." },
    ],
    /** Under the account name field when it is saved empty. */
    nameEmpty: "Type a name for this account.",
  },

  security: {
    title: "Security",
    rows: [
      {
        label: "Change passphrase",
        hint: "Re-encrypts your key on this device. Your address stays the same.",
      },
      {
        label: "Lock after inactivity",
        hint: "15 minutes by default. Lower it on a shared computer.",
      },
      {
        label: "Show recovery phrase",
        hint: "Asks for your passphrase first. Do it where nobody can see your screen.",
      },
      { label: "Lock now", hint: "Baret asks for your passphrase next time." },
    ],
    passphrase: {
      title: "Change your passphrase",
      current: "Current passphrase",
      next: "New passphrase",
      confirm: "Type the new one again",
      action: "Change passphrase",
      done: "Changed. Use the new passphrase next time you open Baret.",
      wrong: "That is not your current passphrase.",
      tooShort: "Use at least 12 characters.",
      mismatch: "The two entries do not match. Type it again.",
    },
    reveal: {
      title: "Show your recovery phrase",
      body: "Anyone who sees these twelve words controls this account. Check that nobody is behind you and that you are not sharing your screen.",
      passphrase: "Your passphrase",
      confirm: "Nobody can see my screen",
      action: "Show the words",
      wrong: "That passphrase is not right. Try again.",
      /** Once the words show: marks the phrase as backed up. */
      written: "I wrote them down, in order",
      /**
       * What the preview shows in place of a real phrase: twelve words that
       * read as a sentence, so nobody takes them for a real one.
       */
      sample: [
        "this",
        "is",
        "a",
        "sample",
        "phrase",
        "for",
        "the",
        "preview",
        "and",
        "it",
        "opens",
        "nothing",
      ],
    },
  },

  rules: {
    title: "Rules",
    row: {
      label: "Rule set",
      hint: "{template} rules. Baret checks every transaction against them.",
    },
    action: { label: "Open Rules", href: "/rules" },
  },

  network: {
    title: "Network",
    rows: [
      {
        label: "Network",
        hint: "Monad testnet, chain 10143. Mainnet, chain 143, is not available in this version.",
      },
      { label: "Monad node", hint: "Where Baret reads your balances and allowances." },
      {
        label: "Analysis server",
        hint: "Where sign requests are simulated and checked, using Alchemy's Monad RPC. Change it only if you run your own.",
      },
    ],
    custom: {
      label: "Use my own",
      warning: "A node you do not control can report a false balance or a false simulation result.",
      /** The address field's label: "Monad node URL". */
      field: "{name} URL",
      placeholder: "https://",
      /** Until the settings seam stores these addresses. */
      pageOnly:
        "Kept on this page only for now. Baret keeps using its own node and server until this setting is wired.",
      test: {
        label: "Test the connection",
        ok: "Connected to Monad testnet, chain {chainId}.",
        wrongChain:
          "That node reports chain {chainId}. Baret runs only on Monad, so it will not use it.",
        fail: "No answer from that address. Check it and try again.",
        /** Shown for a well-formed address while nothing is contacted. */
        sample:
          "Not tested. This preview does not contact the address, so Baret can't confirm it is a Monad node.",
      },
    },
  },

  notifications: {
    title: "Notifications",
    rows: [
      {
        label: "Funds moved without you",
        hint: "Something left this wallet that Baret did not sign.",
      },
      { label: "Cap almost used", hint: "A permission has used 80 percent of its cap." },
      {
        label: "Cap reached",
        hint: "A site or agent used a whole cap. Its next payment stops and asks you.",
      },
      {
        label: "Payment not settled",
        hint: "A payment you authorized has not landed on Monad.",
      },
    ],
  },

  privacy: {
    title: "Privacy",
    body: "What leaves this device, and where it goes.",
    rows: [
      {
        label: "Sent to Baret for each check",
        hint: "The unsigned transaction, your address and your rules. Nothing else.",
      },
      {
        label: "Never leaves this device",
        hint: "Your key, your recovery phrase and your passphrase.",
      },
      {
        label: "Read from the Monad node",
        hint: "Balances and allowances for your address. The node sees which address it looks up.",
      },
      { label: "Usage data", hint: "Not collected. There is no switch, because nothing is sent." },
      {
        label: "Export your data",
        hint: "Activity, permissions, rules and sites in one file, saved on this device.",
      },
      {
        label: "Clear activity",
        hint: "Deletes the log on this device. On-chain history is public and stays public.",
      },
    ],
    clear: {
      title: "Clear the activity log? This cannot be undone.",
      body: "Every entry in the log on this device is deleted, including blocked and declined requests. Your transactions stay on Monad, where anyone can read them. Export your data first if you want a copy.",
      action: "Clear activity",
    },
  },

  advanced: {
    title: "Advanced",
    rows: [
      { label: "Show raw data", hint: "Adds the raw transaction panel to every sign request." },
      {
        label: "Request timeout",
        hint: "How long a sign request stays open before Baret declines it. 5 minutes by default. Payments follow the limit the site sets.",
      },
      { label: "Debug log", hint: "For bug reports. It contains addresses, never keys." },
    ],
  },

  about: {
    title: "About",
    rows: [
      { label: "Version", hint: "{version}" },
      { label: "Source code", hint: "Read the code that runs in this extension." },
      { label: "Security audit", hint: "Not audited yet. The code is open, so you can read it." },
      { label: "Known limits", hint: "What Baret does not check yet, in plain words." },
      { label: "Licence", hint: "MIT" },
    ],
  },

  danger: {
    title: "Danger zone",
    reset: {
      label: "Reset Baret on this device",
      hint: "Deletes your key and everything Baret stored in this browser.",
      consequences: {
        title: "What a reset does",
        /** Above the two lists, which carry the same weight. */
        labels: { deleted: "Deleted", kept: "Kept" },
        deleted: [
          "Your encrypted key is deleted from this browser.",
          "Your activity log, rules and site list are deleted.",
        ],
        kept: [
          "Your funds stay on Monad. Only your recovery phrase can reach them again.",
          "Allowances you granted stay active on-chain. Revoke them first if you want them gone.",
        ],
      },
      confirm: {
        title: "Reset Baret? This cannot be undone.",
        body: "Without your recovery phrase, there is no way back into this account.",
        acknowledge: "I have my recovery phrase written down",
        action: "Delete everything and reset",
        cancel: "Keep my wallet",
      },
    },
  },

  saved: "Saved.",

  /** The choices of Lock after inactivity and Request timeout. */
  minutes: "{count} minutes",
  minutesOne: "{count} minute",

  errors: {
    save: {
      title: "That setting did not save",
      body: "Your previous setting still applies. Try again.",
      action: { label: "Try again" },
    },
  },
} as const;

export type OptionsSettingsContent = typeof optionsSettings;
