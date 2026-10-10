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
    title: "Same request, with and without a check.",
    body: "On NovaSwap the attack's request can go two ways. Sign with your wallet sends it straight to the wallet you use today; sign both steps and the dUSDC leaves. The site's own button sends the same request through Baret's check first, and it is stopped before anything is signed. Check with Baret sends it to the Baret wallet, which calls the same check and refuses it in its own window. No wallet is singled out here. Baret is a check any wallet can call before it signs.",
    columns: { without: "A wallet with no pre-sign check", with: "With Baret's check" },
    rows: [
      {
        aspect: "The NovaSwap attack",
        without:
          "Two requests to sign. The second takes the whole dUSDC balance to the look-alike.",
        with: "Stopped at the first request: an unlimited allowance to a reported spender. Nothing is signed.",
      },
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
    /** Under the table: the site where both paths run. */
    action: { label: "Try both on NovaSwap", href: "/novaswap" },
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
     * menu. The Baret wallet is listed first and opens in its own window;
     * other wallets are found with EIP-6963. {wallet} is a wallet's own name.
     */
    wallet: {
      title: "Connect a wallet",
      body: "Baret checks each request on this page from the address you connect. Nothing is signed unless you sign it in your wallet.",
      looking: "Looking for wallets in this browser...",
      baret: {
        name: "Baret",
        /** The Baret wallet (https://baret-wallet.vercel.app), opened in its own window. */
        window: "Your Baret wallet, in its own window. Your passkey stays on the wallet's site.",
        connecting: "Answer in the Baret wallet window...",
        declined: "You declined in the Baret wallet. Nothing was connected.",
        closed: "The Baret wallet window closed before it answered. Nothing was connected.",
        blocked:
          "Your browser stopped the Baret wallet window. Allow pop-ups for this site, then try again.",
        forget: "Disconnect the Baret wallet",
        /** A second press while the window still waits on a request: it comes to the front. */
        busy: "The Baret wallet window has a request open. Finish it there first.",
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
      /**
       * On a prepared answer: the same request through Baret's server from a
       * fixed testnet address, for a visitor with no wallet.
       */
      checkLive: {
        label: "Check it live",
        note: "Checked live from a demo address, not your wallet.",
      },
      /** When the check did not finish: no answer means Blocked. */
      failed: {
        title: "The check did not finish",
        body: "Baret did not answer in time: its server was busy or out of reach. With no answer, the verdict is Blocked. Do not sign.",
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
        body: "Through Baret, this transaction was never sent, so nothing moved.",
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

    /**
     * A site's second button beside its main one: the same request, sent
     * straight to the connected wallet with no Baret check first. Shared by
     * every site that has it, NovaSwap first. {wallet} is the wallet's own name.
     */
    sign: {
      /** Above the second button: what the site's main button does instead. */
      checked: "The site's button above goes through Baret's check first.",
      action: "Sign with your wallet",
      note: "Sends this request straight to your wallet, with no Baret check. These are real transactions on Monad testnet, with test tokens that have no value.",
      title: "In your wallet",
      status: {
        waiting: "Next",
        confirm: "Confirm in {wallet}...",
        pending: "Waiting for Monad testnet...",
        done: "Confirmed",
        declined: "Declined",
        unconfirmed: "Not confirmed yet",
        failed: "Failed",
      },
      /** The block explorer a transaction hash opens in. */
      explorer: "https://testnet.monadexplorer.com",
      view: "View {hash} on the explorer",
      balance: "{token} in your wallet: {before} before, {after} after.",
      /** Why a press did not start: shown under the button with the action that fixes it. */
      needs: {
        wallet: "Connect a wallet to sign. The sample wallet cannot sign.",
        network: "Your wallet is on another network. Switch it to Monad testnet to sign.",
      },
      errors: {
        rejected: "You declined in {wallet}. Nothing more was sent.",
        pending: "{wallet} already has a request open. Finish it there, then try again.",
        network: "Your wallet is on another network. Switch it to Monad testnet, then try again.",
        funds: "Your wallet does not hold enough test MON for the network fee.",
        account: "The connected account changed. Press the button again.",
        reverted: "Monad testnet ran the transaction and it failed. Nothing more was sent.",
        timeout: "Monad testnet has not confirmed it yet. Follow it on the explorer.",
        failed: "The wallet did not send it. Try again in a moment.",
      },
      /** Read out when a step changes: "Step 1 of 2, Confirmed". */
      announce: "Step {n} of {total}, {status}",
    },

    /**
     * Beside "Sign with your wallet": the same request sent to the Baret
     * wallet, which opens in its own window and checks it before any signature.
     */
    baretCheck: {
      action: "Check with Baret",
      note: "Sends the same request to your Baret wallet, in its own window. Baret checks it before you can sign.",
      waiting: "Answer in the Baret wallet window...",
      blocked: "The Baret wallet refused it. Nothing was signed.",
      /** Above the list of finding titles under a refusal. */
      findings: "Why it refused",
      declined: "You declined in the Baret wallet. Nothing was signed.",
      unreachable: "The Baret wallet could not reach Baret, so it did not sign. Nothing moved.",
      signed: "Signed in the Baret wallet and confirmed on Monad testnet.",
      // The window may close after a signature it could not report (a revert,
      // no receipt), so this says only what is sure.
      closed:
        "The Baret wallet window closed before it answered. Anything you did not sign there was not sent.",
      /** A second press while the window still waits: it comes to the front instead. */
      busy: "The Baret wallet window has a request open. Finish it there first.",
      /** The browser refused to open the window (a pop-up blocker). */
      blockedWindow:
        "Your browser stopped the Baret wallet window. Allow pop-ups for this site, then press again.",
    },
  },
} as const;

export type HubContent = typeof hub;
