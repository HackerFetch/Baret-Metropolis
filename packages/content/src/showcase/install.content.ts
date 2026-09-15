/**
 * /install on apps/showcase.
 *
 * Research notes:
 *  - The best extension listings lead with what the user does not have to do:
 *    "It takes one click to install and you don't need to connect your wallet."
 *  - The strongest trust line in the category is Wallet Guard's flat
 *    "Wallet Guard never has access to your wallet." Say the equivalent early.
 *  - Developer mode scares people. Explain why it is needed in one sentence
 *    and say what it does not do.
 */

export const install = {
  meta: {
    title: "Install Baret",
    description:
      "Install the Baret wallet for Chrome or Firefox. Takes about three minutes, no account needed.",
  },

  hero: {
    eyebrow: "Install",
    title: "Three minutes and you are protected.",
    body: "A Monad wallet that reads every transaction before you sign it. There is no account, no email and nothing to connect. Until the store listings are approved it installs as a developer build.",
    actions: {
      primary: { label: "Download for Chrome" },
      secondary: { label: "Download for Firefox" },
    },
    detected: {
      chromium: "You are on a Chromium browser, so the Chrome build is the one you want.",
      firefox: "You are on Firefox, so the Firefox build is the one you want.",
      unknown: "Pick the build that matches your browser.",
    },
  },

  download: {
    title: "Download the build",
    body: "A zip archive with the extension inside. Nothing is installed automatically and nothing runs until you load it.",
    meta: { version: "Version", size: "Size", updated: "Updated", manifest: "Manifest V3" },
    other: "Also available for",
  },

  steps: {
    chrome: {
      title: "Chrome, Brave or Edge",
      items: [
        {
          title: "Unzip it",
          body: "Extract the archive somewhere you will not delete by accident. The folder has to stay where it is.",
        },
        {
          title: "Open the extensions page",
          body: "Paste chrome://extensions into the address bar, then turn on Developer mode in the top right.",
        },
        {
          title: "Load unpacked",
          body: "Press Load unpacked and pick the folder you extracted. Baret appears in the toolbar. Click it to create your wallet.",
        },
      ],
    },
    firefox: {
      title: "Firefox",
      items: [
        {
          title: "Unzip it",
          body: "Extract the archive somewhere you will not delete by accident.",
        },
        {
          title: "Open the debugging page",
          body: "Paste about:debugging#/runtime/this-firefox into the address bar.",
        },
        {
          title: "Load a temporary add-on",
          body: "Press Load Temporary Add-on and pick manifest.json inside the folder. Firefox removes temporary add-ons when it restarts, so you will need to load it again after a restart.",
        },
      ],
    },
  },

  developerMode: {
    title: "Why developer mode?",
    body: "Chrome only allows unpacked extensions when developer mode is on. It does not give Baret any extra access and it does not change anything about your other extensions. You can turn it off again once the store listing is live.",
  },

  /** The line that does the most work on this page. */
  trust: {
    title: "What Baret can and cannot do",
    can: {
      title: "It can",
      points: [
        "Read the transaction a site wants you to sign",
        "Send that unsigned transaction to the analysis server",
        "Refuse to sign when one of your rules blocks it",
        "Watch your address and tell you when something moves",
      ],
    },
    cannot: {
      title: "It cannot",
      points: [
        "See or send your keys anywhere",
        "Sign anything without you pressing the button",
        "Take a fee from your transactions",
        "Work on any chain other than Monad",
      ],
    },
  },

  afterInstall: {
    title: "What happens next",
    items: [
      {
        title: "Set a passphrase",
        body: "It encrypts the wallet on this device. There is no account and no recovery email, so pick one you will remember.",
      },
      {
        title: "Back up your recovery phrase",
        body: "Twelve words, written down once. This is the only way back in if you lose the device.",
      },
      {
        title: "Get some testnet MON",
        body: "The faucet link is in the setup flow. Testnet MON has no value and exists for exactly this.",
      },
      {
        title: "Pick a rule set",
        body: "Strict, Balanced or Permissive. Balanced is the one most people should start with.",
      },
    ],
  },

  features: {
    title: "What you get",
    items: [
      {
        title: "A check before every signature",
        body: "Decoded, simulated and explained in one sentence per finding.",
      },
      {
        title: "Caps on standing permissions",
        body: "Every approval becomes a row with a limit, a clock and a revoke button.",
      },
      {
        title: "A ceiling for agent payments",
        body: "Automatic payments over HTTP 402 stop at an hourly and a daily cap you set.",
      },
    ],
  },

  troubleshooting: {
    title: "If something goes wrong",
    items: [
      {
        question: "Chrome says the manifest is invalid",
        answer:
          "You probably picked the archive instead of the extracted folder. Pick the folder that contains manifest.json.",
      },
      {
        question: "Baret disappeared after I restarted Firefox",
        answer:
          "Firefox clears temporary add-ons on restart. Load it again from the debugging page. Your wallet and settings are still there.",
      },
      {
        question: "The toolbar icon is not showing",
        answer: "Chrome hides new extensions behind the puzzle-piece icon. Open it and pin Baret.",
      },
      {
        question: "It says it cannot reach the analysis server",
        answer:
          "The hosted server is rate limited. Wait a moment and try again, or run your own and point the extension at it in advanced settings.",
      },
    ],
  },

  cta: {
    title: "Take it for a run.",
    body: "Six demo sites trigger six different attacks. Watch Baret catch each one before anything is signed.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Read the docs", href: "/docs" },
    },
  },
} as const;

export type InstallContent = typeof install;
