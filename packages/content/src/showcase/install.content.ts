/**
 * /install on apps/showcase.
 *
 * Section order (page plan, 2026-09-28): hero, download card, three steps
 * (extract, open the extensions page, load unpacked), developer-mode warning,
 * trust, after install, feature trio, troubleshooting, CTA.
 *
 * Research notes:
 *  - The best extension listings lead with what the user does not have to do:
 *    no account, nothing to connect. Say the equivalent early.
 *  - Developer mode scares people. Explain why it is needed in one sentence
 *    and say what it does not do.
 *  - Quote the browser's own wording (buttons, warnings) exactly, so the
 *    reader can match the page to the screen in front of them.
 *
 * Minimum versions come from apps/extension/wxt.config.ts
 * (minimum_chrome_version, gecko strict_min_version). Keep them in sync.
 */

export const install = {
  meta: {
    title: "Install the extension · Baret",
    description:
      "Install the Baret extension for Chrome, Brave, Edge or Firefox. It is a Monad wallet that simulates every sign request and checks it before you sign.",
  },

  hero: {
    /** Not rendered on /install since 2026-10-03. */
    eyebrow: "Install",
    title: "Add the check to your browser.",
    body: "Baret is a Monad wallet that simulates each sign request and checks it against your rules before you sign. It is not in the browser stores yet, so it loads as a developer build. No account, no email.",
    actions: {
      primary: { label: "Download for Chrome, Brave and Edge" },
      secondary: { label: "Download for Firefox" },
    },
    detected: {
      chromium:
        "You are on a Chromium browser, such as Chrome, Brave or Edge. This build is yours.",
      firefox: "You are on Firefox. This build is yours.",
      unknown: "Pick the build that matches your browser.",
    },
  },

  download: {
    /** Not rendered on /install since 2026-10-03. */
    title: "Download the build",
    body: "A zip archive with the extension inside. Nothing installs on its own, and nothing runs until you load it.",
    builds: {
      chromium: { title: "Baret for Chrome, Brave and Edge", requires: "Version 111 or later" },
      firefox: { title: "Baret for Firefox", requires: "Version 128 or later" },
    },
    meta: { version: "Version", size: "Size", updated: "Updated", manifest: "Manifest V3" },
    other: "Also available for",
    status:
      "Not in the Chrome Web Store or Firefox Add-ons yet. Until it is, download it here or build it from source.",
    /** Shown in place of the download until a build is published. */
    pending: {
      body: "No downloadable build is published yet. Build it from source in a few minutes, then load the folder the same way.",
      action: {
        label: "Build it from source",
        href: "https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/DEPLOYMENT.md",
      },
    },
  },

  steps: {
    /** Not rendered on /install since 2026-10-03. */
    eyebrow: "Steps",
    title: "Load it in three steps.",
    /** Legend of the browser picker above the steps. */
    browser: "Show the steps for",
    /** A page cannot link to a browser's internal pages, so each address
     *  gets a copy button instead. */
    copy: { label: "Copy the address", done: "Copied" },
    chrome: {
      title: "Chrome, Brave or Edge",
      items: [
        {
          short: "Extract",
          title: "Extract the zip",
          body: "Extract the archive to a folder you will keep. The browser loads Baret from that folder, so do not move or delete it.",
        },
        {
          short: "Open",
          title: "Open the extensions page",
          body: "Paste chrome://extensions into the address bar and press Enter. Turn on Developer mode in the top right corner. In Edge, the switch is in the left sidebar.",
          address: "chrome://extensions",
        },
        {
          short: "Load",
          title: "Load unpacked",
          body: "Press Load unpacked and pick the folder you extracted. Pin Baret from the puzzle-piece icon in the toolbar, then click it to set up your wallet.",
        },
      ],
    },
    firefox: {
      title: "Firefox",
      items: [
        {
          short: "Extract",
          title: "Extract the zip",
          body: "Extract the archive to a folder you will keep.",
        },
        {
          short: "Open",
          title: "Open the debugging page",
          body: "Paste about:debugging#/runtime/this-firefox into the address bar and press Enter.",
          address: "about:debugging#/runtime/this-firefox",
        },
        {
          short: "Load",
          title: "Load a temporary add-on",
          body: "Press Load Temporary Add-on and pick manifest.json inside the folder you extracted. Firefox removes temporary add-ons when it quits, so load it again after each restart.",
        },
      ],
      warning:
        "Back up your recovery phrase before you quit Firefox. If your wallet is gone after you load Baret again, restore it from that backup.",
    },
  },

  developerMode: {
    title: "About developer mode",
    body: "Chrome loads an extension from a folder only when developer mode is on. It gives Baret no extra access and changes nothing about your other extensions.",
    warning:
      "Developer mode lets any folder load as an extension. Load only a build you downloaded yourself, from a source you trust.",
    note: "Once Baret is in the store, install it from there instead.",
  },

  /** The section that does the most work on this page. Honest about the
   *  broad site access, the server, and who else sees what. */
  trust: {
    /** Not rendered on /install since 2026-10-03. */
    eyebrow: "Trust",
    title: "What Baret can and cannot do",
    siteAccess: {
      /** Not rendered on /install since 2026-10-03. */
      title: "Why it asks for every site",
      body: "Any site can send a sign request, so Baret runs on every page to catch it. Chrome words this as 'Read and change all your data on all websites'.",
    },
    can: {
      title: "It can",
      points: [
        "Read the sign request a site sends, before you sign it",
        "Send the unsigned transaction, your address and the site's origin to the Baret server",
        "Refuse to sign when one of your rules blocks it",
        "Pay x402 requests on its own, but only inside caps you approved",
        "Watch your address and alert you when something moves without you",
      ],
    },
    cannot: {
      title: "It cannot",
      points: [
        "Send your key or recovery phrase off this device",
        "Sign anything you did not approve, or pay past a cap you set",
        "Add a fee to your transactions",
        "Work on any chain other than Monad",
      ],
    },
    others: {
      title: "Who else sees what",
      points: [
        "Alchemy RPC runs the simulation, so it sees the unsigned transaction.",
        "Nansen and Cleanverse see the addresses Baret asks them about.",
        "Your key and recovery phrase stay on this device.",
      ],
    },
    audit: {
      body: "No audit yet. The code is open. Read it.",
      action: {
        label: "Read the source",
        href: "https://github.com/HackerFetch/Baret-Metropolis",
      },
    },
  },

  /** Not rendered on /install since 2026-10-03 (cut for simplicity). */
  afterInstall: {
    eyebrow: "After",
    title: "What happens next",
    body: "Setup opens in its own tab. The popup is too small for it.",
    items: [
      {
        title: "Set a password",
        body: "It encrypts your wallet on this device. There is no account and no recovery email, so pick one you will remember.",
      },
      {
        title: "Back up your recovery phrase",
        body: "Write it down once and keep it offline. It is the only way back in if you lose this browser.",
      },
      {
        title: "Get testnet MON",
        body: "Setup links to the Monad faucet. Testnet MON has no value and exists for exactly this.",
      },
      {
        title: "Pick your rules",
        body: "Start from Strict, Balanced or Permissive, and change any rule later. Balanced is the default.",
      },
    ],
  },

  /** Not rendered on /install since 2026-10-03 (cut for simplicity). */
  features: {
    title: "What you get",
    items: [
      {
        title: "A check before every signature",
        body: "Each sign request is simulated, run through nine detectors and your rules, then explained one finding at a time.",
      },
      {
        title: "Every allowance in one list",
        body: "See which contracts can spend your tokens or move your NFTs, and revoke any of them.",
      },
      {
        title: "Caps on agent payments",
        body: "Payments over HTTP 402 stop at the per-payment, hourly and daily caps you set.",
      },
    ],
  },

  /** Symptom, then fix. Symptoms use the browser's own words where it has
   *  them. */
  troubleshooting: {
    /** Not rendered on /install since 2026-10-03. */
    eyebrow: "Help",
    title: "If something goes wrong",
    items: [
      {
        symptom: "Chrome says the manifest file is missing or unreadable",
        fix: "You picked the zip or a parent folder. Pick the folder that has manifest.json directly inside it.",
      },
      {
        symptom: "There is no Load unpacked button",
        fix: "Developer mode is off. Turn it on in the top right corner of the extensions page, or in the left sidebar in Edge.",
      },
      {
        symptom: "Baret is gone after Firefox restarted",
        fix: "Firefox removes temporary add-ons when it quits. Load it again from the debugging page. If your wallet is empty, restore it from your recovery phrase.",
      },
      {
        symptom: "The Baret icon is not in the toolbar",
        fix: "Browsers hide new extensions behind the puzzle-piece icon. Open it and pin Baret.",
      },
      {
        symptom: "The browser refuses to load Baret",
        fix: "Baret needs a Chromium browser from version 111, or Firefox 128 or later. Update the browser, then load it again.",
      },
      {
        symptom: "Every sign request says Can't reach Baret",
        fix: "Baret could not finish its check, so it treats the request as Blocked. Check your connection and try again in a moment.",
      },
    ],
  },

  cta: {
    title: "Take it for a run.",
    body: "Six fake sites set six traps. Open one with Baret installed and read the sign request before you decide.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Read the docs", href: "/docs" },
    },
  },
} as const;

export type InstallContent = typeof install;
