/**
 * /showcase on apps/showcase. The index of the six threat scenarios, plus the
 * frame copy the six scenario pages share (`frame`).
 *
 * Page order (Meric, 2026-09-28): hero, stats, filter strip, six cards, four
 * steps, detector grid, comparison, CTA.
 *
 * Rules this page keeps:
 *  - Every number traces to the docs: 9 detector modules (ARCHITECTURE 6),
 *    25 rule fields (ARCHITECTURE 7). No usage counts, no "attacks stopped".
 *  - A card's "Watch for" lines map to finding codes or rule fields the
 *    scenario really produces. The mapping sits in each scenario file's header.
 *  - The expected verdict is always framed as expected. The live verdict comes
 *    from the analysis server, with findings rendered from shared/findings.
 *  - The fake sites are fiction. They name no real company, token or person.
 */

export const hub = {
  meta: {
    title: "Threat showcase · Baret",
    description:
      "Six simulated sites on Monad testnet, each hiding a different trap in its transaction. Trigger one and see what Baret checks before you sign.",
  },

  hero: {
    /** Not rendered on /showcase since 2026-10-03. */
    eyebrow: "Showcase",
    title: "Six sites. Six threats. Read them before you sign.",
    body: "Each site looks finished and works like the real thing. Each one hides a different threat in the transaction it builds. Press its main button and see what Baret checks before anything is signed.",
    actions: {
      primary: { label: "See the six sites", href: "#scenarios" },
      secondary: { label: "Install the extension", href: "/install" },
    },
    notice:
      "These sites are simulations built for this showcase. They run on Monad testnet, where tokens have no value.",
  },

  stats: [
    { value: "6", label: "simulated sites" },
    { value: "3", label: "kinds of threat" },
    { value: "9", label: "detectors on every request" },
    { value: "25", label: "rules you can change" },
  ],

  /** The heading over the six cards and their filter. */
  scenarios: {
    title: "Six sites, one trap each.",
  },

  /** The ids match `scenario.threatClass` in each scenario file. */
  filters: {
    label: "Show",
    /** Announced when the filter changes. */
    status: "{count} of 6 sites shown.",
    items: [
      { id: "all", label: "All six", body: "Every scenario on this page." },
      { id: "drainer", label: "Drainers", body: "Funds taken without consent." },
      { id: "trap", label: "Trust traps", body: "Looks legitimate, behaves otherwise." },
      { id: "agent", label: "Silent agents", body: "Pays while you sleep." },
    ],
  },

  /** Labels on every scenario card. The card data lives in each site's file. */
  cardLabels: {
    watchFor: "Watch for",
    /** Not rendered on /showcase since 2026-10-03. */
    whyItMatters: "Why it matters",
    verdict: "Expected verdict",
    verdicts: {
      safe: "Safe",
      caution: "Caution",
      blocked: "Blocked",
      unreachable: "Can't reach Baret",
      capped: "Blocked at the cap",
    },
    open: "Open the site",
  },

  steps: {
    /** Not rendered on /showcase since 2026-10-03. */
    eyebrow: "How it works",
    title: "Four steps, one sign request",
    /** Accessible name of the step picker. */
    legend: "Pick a step",
    items: [
      {
        short: "Connect",
        title: "Connect a wallet",
        body: "Baret or any wallet in the picker. The sites run on Monad testnet, where tokens have no value.",
      },
      {
        short: "Pick a version",
        title: "Pick a version",
        body: "Every site has an honest version and an attack version. The page looks the same in both. Only the transaction changes.",
      },
      {
        short: "Press",
        title: "Press the main button",
        body: "Swap, mint, stake, claim, buy or ask. The site builds a real transaction and hands it to your wallet.",
      },
      {
        short: "Read",
        title: "Read the verdict",
        body: "Baret simulates it, runs nine detectors and your rules, and answers Safe, Caution or Blocked. Each finding comes with a reason.",
      },
    ],
  },

  comparison: {
    /** Not rendered on /showcase since 2026-10-03. */
    eyebrow: "The difference",
    title: "Same site, same button, two wallets.",
    body: "Every site works with any wallet in the picker. Run the attack version with the wallet you use today, then again with Baret. No wallet is singled out here. The difference is what gets read before you sign.",
    columns: { without: "A wallet with no pre-sign check", with: "Baret" },
    rows: [
      {
        aspect: "What you see",
        without: "A contract address, an amount and a confirm button.",
        with: "What changes in your balances, and one sentence per finding.",
      },
      {
        aspect: "An unlimited allowance",
        without: "Shown like any other allowance.",
        with: "Named as unlimited, and stopped when your rules block it.",
      },
      {
        aspect: "A look-alike router or pool",
        without: "The page is all you have to go on.",
        with: "Checked against the reputation registry and the contracts Baret knows.",
      },
      {
        aspect: "A check that cannot finish",
        without: "There was no check to finish.",
        with: "Can't reach Baret. It counts as Blocked and nothing is signed.",
      },
    ],
  },

  cta: {
    title: "Pick a site. Press the button.",
    body: "Each site builds a real transaction on Monad testnet. The analysis appears before anything is signed.",
    actions: {
      primary: { label: "Start with ClaimHub", href: "/claimhub" },
      secondary: { label: "Install the extension", href: "/install" },
    },
  },

  /**
   * Shared by the six scenario pages. What differs per site lives in that
   * site's own file under `analysis`.
   */
  frame: {
    pill: "Simulated site",
    notice: "A simulation on Monad testnet. Tokens here have no value.",
    back: { label: "Back to the showcase", href: "/showcase" },
    // Screen-reader headings for a demo home's figures and FAQ.
    site: { statsTitle: "Figures", faqTitle: "Questions" },

    /**
     * The wallet picker in a demo site's header and the connected wallet's
     * menu. Wallets are found with EIP-6963; Baret's extension is listed
     * first, found or not. {wallet} is a wallet's own name.
     */
    wallet: {
      title: "Connect a wallet",
      body: "Baret checks each request on this page from the address you connect. Nothing is signed or sent.",
      looking: "Looking for wallets in this browser...",
      baret: {
        name: "Baret",
        found: "Found in this browser",
        missing: "Not found in this browser",
        note: "The Baret extension is a preview and does not connect to sites yet. Any other wallet works here, and Baret still checks each request.",
        install: { label: "Get the extension", href: "/install" },
      },
      others: "Wallets in this browser",
      none: "No other wallet found in this browser.",
      sample: {
        label: "Use the sample wallet",
        body: "Prepared answers, no wallet needed. Nothing leaves this page.",
      },
      /** The developer fallback address (VITE_BARET_DEMO_FROM), shown in place of a wallet. */
      testAddress: "Test address",
      connecting: "Confirm in {wallet}...",
      errors: {
        rejected: "You declined in {wallet}. Nothing was connected.",
        pending: "{wallet} already has a request open. Finish it there, then try again.",
        failed: "{wallet} did not connect. Try again, or pick another wallet.",
      },
      close: "Close",
      account: {
        title: "Your wallet",
        /** The connected chip's accessible name. */
        open: "{wallet}, {address}. Open the wallet menu",
        live: "Baret checks each request on this page from this address, live.",
        network: {
          ok: "Monad testnet",
          wrong: "Your wallet is on another network. Checks still run on Monad testnet.",
        },
        switch: {
          label: "Switch to Monad testnet",
          busy: "Switching...",
          failed: "The wallet did not switch. Pick Monad testnet in the wallet itself.",
        },
        balance: "{amount} MON on Monad testnet",
        empty: "No test MON in this wallet yet. A live check of a payment needs some.",
        faucet: { label: "Get test MON", href: "https://faucet.monad.xyz" },
        copy: { label: "Copy address", done: "Copied" },
        disconnect: "Disconnect",
      },
      announce: {
        connected: "{wallet} connected, {address}",
        disconnected: "Wallet disconnected",
      },
      /** Under a card's amount when a live wallet holds less than it asks. */
      short: "Your wallet holds {balance} MON on Monad testnet. Get test MON, or ask for less.",
    },

    toggle: {
      legend: "Which version to build",
      hint: "Same page, different transaction. Switch versions, then press the site's main button.",
    },

    claims: {
      title: "The site says",
      check: "Baret checks",
      note: "Nothing a page says about itself is verified. Baret reads the transaction instead.",
    },

    panel: {
      title: "Baret analysis",
      /** Shown on a prepared answer: no wallet is connected. */
      sample:
        "A prepared sample of what Baret returns for this request. Connect a wallet to get Baret's live answer for your own address.",
      asks: "What the site asks for",
      call: "The call",
      expected: "Expected verdict",
      expectedNote:
        "Expected under the Balanced rules, the default. Your own rules can change the result.",
      live: "Live verdict",
      changes: "What changes",
      findings: "Findings",
      noFindings: "No findings. Nothing in this request broke a rule.",
      phases: [
        "Reading the transaction",
        "Simulating on Monad testnet",
        "Running the nine detectors",
        "Applying your rules",
      ],
      match: "The live verdict matches the expected one.",
      mismatch:
        "The live verdict differs from the expected one. Your rules may differ from Balanced, or a check may not have finished.",
      lesson: "Take this with you",
      /** Under the title when the answer came from Baret's server. */
      liveNote: "Baret's answer from its server, for this exact request on Monad testnet.",
      /** When the check did not finish: no answer means Blocked. */
      failed: {
        title: "The check did not finish",
        body: "Baret could not reach its server, or the answer did not arrive in time. With no answer, the verdict is Blocked. Do not sign.",
      },
    },

    empty: {
      title: "Nothing to read yet",
      body: "Press the site's main button. The analysis of that transaction appears here before anything is signed.",
    },

    errors: {
      noWallet: {
        title: "No wallet connected",
        body: "Connect a wallet so the site can build its transaction. Any wallet in the picker works.",
        action: { label: "Connect a wallet" },
      },
      wrongNetwork: {
        title: "Wrong network",
        body: "These sites run on Monad testnet. Switch your wallet to Monad testnet and press the button again.",
        action: { label: "Switch to Monad testnet" },
      },
      buildFailed: {
        title: "The site could not build its transaction",
        body: "Monad testnet did not answer. Nothing was sent. Try again in a moment.",
        action: { label: "Try again" },
      },
      unreachable: {
        title: "Can't reach Baret",
        body: "The check could not run, so this counts as Blocked. Nothing was signed. Try again in a moment.",
        action: { label: "Check again" },
      },
    },

    outcome: {
      stopped: {
        title: "Nothing was signed",
        body: "The transaction was never sent. Your funds never moved.",
      },
      declined: {
        title: "You declined",
        body: "Nothing was signed and nothing moved.",
      },
      sent: {
        title: "Signed and sent",
        body: "The transaction is on Monad testnet.",
        action: { label: "View it on the explorer" },
      },
      again: { label: "Try the other version" },
      share: { label: "Copy the result", done: "Copied" },
    },
  },
} as const;

export type HubContent = typeof hub;
