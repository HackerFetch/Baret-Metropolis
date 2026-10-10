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
 * The extension is a preview (G-02 option (a), 2026-10-10): every screen runs
 * on a sample wallet, and provider.content.ts, relay.content and background.ts
 * are still stubs. It holds no key, never appears in a site's wallet list and
 * sees no sign request. The working product is the web wallet. Nothing on
 * this page may claim more than that.
 *
 * Minimum versions come from apps/extension/wxt.config.ts
 * (minimum_chrome_version, gecko strict_min_version). Keep them in sync.
 */

export const install = {
  meta: {
    description:
      "Load the Baret extension preview in Chrome, Brave, Edge or Firefox. Every screen runs on a sample wallet. To check real sign requests, use the Baret web wallet.",
  },

  hero: {
    /** Not rendered on /install since 2026-10-03. */
    eyebrow: "Extension preview",
    title: "Try the extension preview.",
    body: "The preview shows every screen of the Baret extension on a sample wallet. It cannot connect to sites, hold a key or see a sign request yet. For real checks, open the web wallet at https://baret-wallet.vercel.app or try a demo site.",
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
    /** The detected line while no build is published: there is nothing to pick. */
    detectedPending: {
      chromium:
        "You are on a Chromium browser, such as Chrome, Brave or Edge. Build the preview for it from the source.",
      firefox: "You are on Firefox. Build the preview for it from the source.",
      unknown:
        "The preview runs in Chrome, Brave, Edge and Firefox. Build it for yours from the source.",
    },
  },

  download: {
    /** Not rendered on /install since 2026-10-03. */
    title: "Download the build",
    body: "A zip archive with the extension inside. Nothing installs on its own, and nothing runs until you load it.",
    builds: {
      chromium: { title: "Baret for Chrome, Brave and Edge", requires: "Chrome 111 or later" },
      firefox: { title: "Baret for Firefox", requires: "Firefox 128 or later" },
    },
    meta: { version: "Version", size: "Size", updated: "Updated", manifest: "Manifest V3" },
    other: "Also available for",
    /** Under a published build. */
    status:
      "The preview is not in the Chrome Web Store or Firefox Add-ons. Download it here or build it from source.",
    /** Under the source link while no build is published. */
    statusPending: "The preview is not in the Chrome Web Store or Firefox Add-ons.",
    /** Shown in place of the download until a build is published. */
    pending: {
      body: "No downloadable build is published yet. Build it from source in a few minutes, then load the folder the same way.",
      action: {
        label: "Build it from source",
        href: "https://github.com/HackerFetch/Baret-Metropolis/blob/main/apps/extension/SOURCE_BUILD.md",
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
    /** Step 1 while no build is published: build the folder instead of
     *  extracting a zip. Folders come from apps/extension/SOURCE_BUILD.md. */
    pending: {
      chrome: {
        short: "Build",
        title: "Build it from source",
        body: "Clone the repository, run pnpm install, then pnpm --filter @baret/extension build. The folder to load is apps/extension/.output/chrome-mv3.",
      },
      firefox: {
        short: "Build",
        title: "Build it from source",
        body: "Clone the repository, run pnpm install, then pnpm --filter @baret/extension build:firefox. The folder to load is apps/extension/.output/firefox-mv3.",
      },
    },
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
          body: "Press Load unpacked and pick the Baret folder from step 1. Pin Baret from the puzzle-piece icon in the toolbar, then click it to open the preview.",
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
          body: "Press Load Temporary Add-on and pick manifest.json inside the Baret folder from step 1. Firefox removes temporary add-ons when it quits, so load it again after each restart.",
        },
      ],
      warning:
        "Firefox removes Baret when it quits. To load it again, open the debugging page and repeat step 3. The preview holds no key, so nothing is lost.",
    },
  },

  developerMode: {
    title: "About developer mode",
    body: "Chrome loads an extension from a folder only when developer mode is on. It gives Baret no extra access and changes nothing about your other extensions.",
    warning:
      "Developer mode lets any folder load as an extension. Load only a build you made or downloaded yourself, from a source you trust.",
    note: "The preview is not in any browser store, so a folder is the only way to load it.",
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
      body: "Catching a sign request means being on the page that sends it, so the manifest declares scripts for every page. Chrome words this as 'Read and change all your data on all websites'. In the preview those scripts load and do nothing.",
    },
    can: {
      title: "It can",
      points: [
        "Show every screen of the extension: popup, sign request, rules, allowances, activity and settings",
        "Walk through each screen with a sample wallet and sample sign requests",
        "Show how a Safe, Caution or Blocked verdict reads before you sign",
      ],
    },
    cannot: {
      title: "It cannot",
      points: [
        "Appear in a site's wallet list or connect to a site",
        "Hold a key or a recovery phrase, or sign anything",
        "See a sign request from a site, or send one anywhere",
        "Make payments or watch a real address",
        "Work on any chain other than Monad",
      ],
    },
    others: {
      title: "Who else sees what",
      points: [
        "No one. The preview reads only its sample data and sends nothing to the Baret server or anyone else.",
        "The web wallet does send checks. There, Alchemy RPC sees the unsigned transaction, and Nansen and Cleanverse see the addresses Baret asks about.",
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
    body: "Onboarding opens in its own tab. The popup is too small for it.",
    items: [
      {
        title: "Walk through onboarding",
        body: "Every step runs on a sample wallet. The preview holds no real key.",
      },
      {
        title: "Open the popup",
        body: "Pin Baret and click it to see the home screen and a sample sign request.",
      },
      {
        title: "Look at your rules",
        body: "Strict, Balanced and Permissive are all there. Balanced is the default.",
      },
    ],
  },

  /** Not rendered on /install since 2026-10-03 (cut for simplicity). */
  features: {
    title: "What you get",
    items: [
      {
        title: "The sign request screen",
        body: "See how a sample request reads: the verdict, each finding, and what changes in the wallet.",
      },
      {
        title: "The allowance list",
        body: "See how a sample wallet's allowances are listed, one contract per line.",
      },
      {
        title: "The payment caps",
        body: "See where the per-payment, hourly and daily caps for HTTP 402 payments are set.",
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
        fix: "Firefox removes temporary add-ons when it quits. Load it again from the debugging page. The preview holds no key, so nothing is lost.",
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
        symptom: "A site does not list Baret as a wallet",
        fix: "That is expected. The preview cannot connect to sites yet. To check a real sign request, use the web wallet at https://baret-wallet.vercel.app.",
      },
      {
        symptom: "The web wallet says Can't reach Baret",
        fix: "Baret could not finish its check, so it treats the request as Blocked. Check your connection and try again in a moment.",
      },
    ],
  },

  cta: {
    title: "Take it for a run.",
    body: "Six fake sites set six traps. Open one in any browser and read the check before you decide. No extension needed.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Read the docs", href: "/docs" },
    },
  },
} as const;

export type InstallContent = typeof install;
