/**
 * / on apps/showcase. The landing page.
 *
 * Landing order since 2026-10-01: opener, hero, checks (`marquee`), how it
 * works (`pillars`), six dApps (`showcase`), verdicts (`caution`), agents,
 * closing (`cta`). `meta` is the document head. The keys below keep their
 * older file order; blocks marked "Not rendered on the landing since
 * 2026-10-01." stay in the file on purpose and are not shown on `/`.
 *
 * Positioning decisions, from the competitor research:
 *
 *  1. Everyone in this category writes "[verb] X before Y". The word "before"
 *     is table stakes. Our second axis is WHOSE RULES. Not one competitor
 *     gives the end user a policy. "Your rules, not ours" is unclaimed.
 *
 *  2. Nobody has written a section about a middle verdict. Caution is ours,
 *     and the page explains why a two-answer check has to round.
 *
 *  3. Nobody says where the analysis runs. We say it plainly, including the
 *     part that happens on a server, and we name every party that sees data.
 *
 *  4. Warning fatigue is the real failure of this category. Our answer is
 *     that you decide once, in advance, and a block is a block.
 *
 *  5. A simulation is a preflight, not a guarantee. We say so early.
 *
 * Numbers on this page come from the docs, never from usage: nine detector
 * modules (ARCHITECTURE section 6), 25 rule fields (section 7), six showcase
 * sites, two contracts (CONTRACTS.md), 800 ms finality (PROJECT_OVERVIEW).
 */

export const home = {
  meta: {
    title: "Check every Monad transaction before you sign · Baret",
    description:
      "Baret simulates every Monad transaction before you or your AI agent signs it, checks it against your rules, and explains the verdict in plain words.",
    /** og:image:alt for the static share card in index.html (G1/G3). */
    imageAlt: "The Baret logo: an orange helmet beside the BARET wordmark on a light grid",
  },

  /** The scroll-driven opener, one line per frame, written against the
   *  three frames: the button, the inspector's desk, the three tags. Each
   *  line is one full sentence. The page works without the opener. */
  opener: {
    lines: [
      "Your wallet shows you a long address and a Confirm button.",
      "Baret reads the transaction before you press it.",
      "Then it hangs one tag on it: Safe, Caution or Blocked.",
    ],
    skip: "Skip the intro",
    /** Accessible name of the opener region (F8). */
    regionLabel: "Intro",
  },

  hero: {
    status: "On Monad testnet",
    title: "Check it first. Then sign.",
    body: "Baret runs every Monad transaction without sending it, before you sign. It checks the result against your rules. Then it tells you what it found, in plain words. The same check covers your AI agents.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: {
        label: "Install the extension",
        /** Below 768 px, same link: the install steps need a desktop (D4). */
        labelPhone: "Install on desktop",
        href: "/install",
      },
    },
    // Not rendered on the landing since 2026-10-01.
    badges: [
      "Simulated before you sign",
      "Verdicts in plain words",
      "Your rules, not ours",
      "Spend caps for AI agents",
    ],
    /** Caption for the composed preview card. Replaces mockCaption until the
     *  real Sign Request component exists. Rendered again since 2026-10-01
     *  next to every sample widget on the landing (H1-H3). */
    previewLabel: "An example request with sample data, not a\u00a0live check.",
    /** Sits beside the real Sign Request component. The caption is what
     *  makes the picture honest, so it stays only while that is true. */
    // Not rendered on the landing since 2026-10-01.
    mockCaption: "The real sign request screen from the extension, not a drawing of one.",
  },

  /** The scrolling strip. Every item maps to a finding code emitted by one of
   *  the nine detector modules in docs/ARCHITECTURE.md section 6, and all
   *  nine modules appear. Add nothing here that no detector emits. */
  marquee: {
    label: "Checks Baret runs before you sign",
    /** Summary of the closed <details> under the strip (H4). The number must
     *  match `items.length`; a test in apps/showcase guards it. */
    allChecks: "See the 17 checks",
    /** Accessible name of the static list inside that disclosure. The
     *  detectors emit more codes than this list, so it never claims "all". */
    allChecksList: "17 of the checks Baret runs before you sign",
    items: [
      "A transaction that would fail", // simulation: SIMULATION_FAILED
      "A simulation with gaps", // simulation: LOW_CONFIDENCE_INCOMPLETE_DATA
      "Unlimited allowance", // approvals: ERC20_APPROVAL_UNLIMITED
      "Operator grant on a whole collection", // approvals: NFT_OPERATOR_GRANTED
      "Allowance hidden in a signature", // approvals: PERMIT_SIGNATURE_DETECTED
      "Reported contract", // programs: RISKY_CONTRACT_INTERACTION
      "Unverified contract", // programs: UNKNOWN_CONTRACT_EXPOSURE
      "Self-destructing contract", // evm-danger: SELFDESTRUCT_CALL
      "Code run from another contract", // evm-danger: DELEGATECALL_DETECTED
      "Ownership handover", // evm-danger: OWNERSHIP_TRANSFER
      "Blocklisted address", // reputation: KNOWN_MALICIOUS_ADDRESS
      "Brand-new counterparty", // reputation: NANSEN_FLAGGED_FRESH_WALLET
      "Transfer without a verified identity", // compliance: COMPLIANCE_NO_CREDENTIAL
      "Calls nested deeper than they look", // cpi: DEEP_CALL_NESTING
      "Fee far above the need", // compute: EXCESSIVE_GAS
      "Look-alike payment token", // x402: X402_NON_CANONICAL_ASSET
      "Payment to the wrong address", // x402: X402_DESTINATION_MISMATCH
    ],
  },

  /** Three layers, one verb each. `label` is the verb, `title` the layer. */
  pillars: {
    // Not rendered on the landing since 2026-10-01.
    eyebrow: "How it works",
    title: "Reads it. Caps it. Watches it.",
    body: "Three layers around one signature: before you sign, while a permission stays open, and after it is used. Each layer works on its own.",
    items: [
      {
        // Rendered in the landing bento tile (since 2026-10-01).
        label: "Reads it",
        title: "Pre-sign Guard",
        body: "Before your wallet signs, Baret simulates the transaction over Alchemy RPC. Nine detectors read the result. Reputation comes from Nansen and from threat feeds that Chainlink CRE writes on-chain.",
        // Rendered in the landing bento tile (since 2026-10-01).
        points: [
          "Runs without sending",
          "Nine detectors, one verdict",
          "One plain sentence per finding",
        ],
      },
      {
        // Rendered in the landing bento tile (since 2026-10-01).
        label: "Caps it",
        title: "Authorization Ledger",
        body: "Some signatures leave a permission behind, like a site allowed to spend your tokens next year. Baret keeps every one in a single list: who can spend, how much, and a Revoke button.",
        // Rendered in the landing bento tile (since 2026-10-01).
        points: [
          "Allowances, operator grants and connected sites",
          "Revoke in one step",
          "Hourly and daily caps for agents",
        ],
      },
      {
        // Rendered in the landing bento tile (since 2026-10-01).
        label: "Watches it",
        title: "Post-sign Monitor",
        body: "Baret keeps watching after you sign. You get an alert when an allowance is used or funds leave without your signature.",
        // All three points are rendered in the landing bento tile.
        points: [
          "Alerts when an allowance is used",
          "Alerts on transfers you did not sign",
          "History indexed by Envio",
        ],
      },
    ],
  },

  /** The middle verdict. Nobody else in the category has written this
   *  section, which is exactly why it is here. `impact` is one sentence on
   *  what actually moves if the request is signed. */
  caution: {
    // Not rendered on the landing since 2026-10-01.
    eyebrow: "The middle verdict",
    title: "Between Safe and Blocked, there is Caution.",
    body: "A check with two answers has to round. Round down, and a contract nobody verified passes as fine. Round up, and every swap looks alarming until you stop reading. Baret has a third answer. You can sign, and the reason comes first.",
    // Not rendered on the landing since 2026-10-01.
    labels: { impact: "If signed" },
    /** The verdict check row between the header and the columns (H1, with the
     *  rule switch from H2). Sample data, never a live check. The verdict per
     *  sample comes from `verdictOf`; the "If signed" sentence is the matching
     *  `examples[].impact`. Each sample links to a showcase site that runs a
     *  related request for real. Since D-033 (2026-10-09) no site answers
     *  Caution under Balanced, so the swap sample's link says what OrbitYield
     *  shows: an unknown pool, blocked because it keeps what you send. */
    demo: {
      legend: "Try a sample request",
      samples: [
        {
          id: "send",
          label: "Send 25 MON to the address you typed",
          tryLabel: "Try it on NovaSwap",
          href: "/novaswap",
        },
        {
          id: "swap",
          label: "Swap 100 USDC via an unverified contract",
          tryLabel: "See an unknown pool blocked on OrbitYield",
          href: "/orbityield",
        },
        {
          id: "approve",
          label: "Approve unlimited USDC",
          tryLabel: "Try it on ClaimHub",
          href: "/claimhub",
        },
      ],
      checked: "Checked: simulation · approvals · recipient",
      /** The switch label is `policy.fields.blockUnlimitedApprovals.label`
       *  and never changes; only the state word beside it does. */
      rule: { on: "On", off: "Off", stopped: "A rule you set stopped it." },
      /** The finding that still shows when the rule is off. Values fill the
       *  `findings` template. */
      finding: {
        code: "ERC20_APPROVAL_UNLIMITED",
        values: { spender: "this site's contract", asset: "USDC", amount: "100" },
      },
      /** What the status region announces. `{verdict}` is the verdict label. */
      announce: {
        sample: "{verdict}. {impact}",
        ruleOn: "Rule on. Blocked.",
        ruleOff: "Rule off. Caution.",
      },
    },
    examples: [
      {
        verdict: "safe",
        title: "Safe",
        body: "No rule was broken and no check found a problem. You still see exactly what changes before you sign.",
        // Rendered once, in the verdict check result (H1), never in the columns.
        impact: "25 MON goes to the address you typed. Nothing else moves.",
      },
      {
        verdict: "caution",
        title: "Caution",
        body: "No rule was broken, but a check found something worth a look. For example, a contract nobody verified, a brand-new wallet, or a fee far above the need.",
        // Rendered once, in the verdict check result (H1), never in the columns.
        impact: "You swap 100 USDC through a contract nobody has verified.",
      },
      {
        verdict: "blocked",
        title: "Blocked",
        body: "A rule you set stopped it. Baret names the rule, not a score. Signing anyway takes a separate press\u2011and\u2011hold, and it is logged.",
        // Rendered once, in the verdict check result (H1), never in the columns.
        impact: "A site could spend all of your USDC, today or next year.",
      },
    ],
    honesty: {
      title: "The fourth verdict: Can't reach Baret",
      // Not rendered on the landing since 2026-10-01.
      body: 'If the server is down or the simulation fails, Baret does not guess. The verdict is "Can\'t reach Baret", and it counts as Blocked. Signing without a check takes the same press-and-hold, and it is logged.',
    },
  },

  /** The x402 wedge. Everyone explains how to CHARGE an agent. Nobody
   *  explains what the agent should check before it pays. The three stories
   *  map to the leash, the budget and the kill switch in the body. */
  agents: {
    // Not rendered on the landing since 2026-10-01.
    eyebrow: "For AI agents",
    title: "x402 forgets every payment. Baret keeps count.",
    body: "x402 lets an AI agent pay for an API by itself, in small payments. It is stateless on purpose: no running total, no cap, no way to revoke a key. Baret keeps the memory the protocol leaves out. Your agent gets a leash, a budget and a kill switch.",
    // Not rendered on the landing since 2026-10-01.
    labels: { gap: "Protocol gap", answer: "Baret's answer" },
    /** Daily-cap presets inside "The budget" row (H3). A deterministic sample
     *  run, no timers. `{amount}`, `{actual}` and `{cap}` are formatted with
     *  the asset, for example "2 USDC". The capped sentence is the filled
     *  `X402_DAILY_CAP_EXCEEDED` finding. */
    demo: {
      legend: "Daily cap",
      sample: "A sample run: an agent asks Scrybe {count} questions at {amount} each.",
      asset: "USDC",
      price: 2,
      run: 20,
      presets: [10, 20, 30, 50],
      initial: 20,
      /** Segment label, for example "20 USDC". A no-break space keeps the
       *  number and its unit on one line in every sentence it fills. */
      preset: "{cap}\u00a0{asset}",
      fits: "All {count} payments fit under this cap.",
      /** Same label the Scrybe card uses (`hub.verdicts.capped`). */
      capped: "Blocked at the cap",
      findingCode: "X402_DAILY_CAP_EXCEEDED",
      /** What the status region announces when the run is capped. */
      announceCapped: "{tag}. {finding}",
      /** How far a capped run got, before the finding. */
      progress: "{paid} of {count} paid.",
      /** The honesty line under the result: a run, not a single request. */
      previewLabel: "A sample run with sample data, not a\u00a0live payment.",
    },
    gaps: [
      {
        control: "The budget",
        // Not rendered on the landing since 2026-10-01.
        title: "An agent that keeps paying",
        // Not rendered on the landing since 2026-10-01.
        gap: "The protocol keeps no running total. A slow leak looks exactly like normal traffic.",
        answer:
          "Caps for each merchant, per payment, per hour and per day. Every payment counts against a real number. The one that crosses it does not go out.",
      },
      {
        control: "The leash",
        // Not rendered on the landing since 2026-10-01.
        title: "A token that only looks like USDC",
        // Not rendered on the landing since 2026-10-01.
        gap: "The handshake checks that the asset field matches. It never asks whether that contract is the real USDC.",
        answer:
          "Baret checks the token contract against your list of allowed assets. A look-alike fails, even with a perfect name.",
      },
      {
        control: "The kill switch",
        // Not rendered on the landing since 2026-10-01.
        title: "A leaked agent key",
        // Not rendered on the landing since 2026-10-01.
        gap: "One key, no scope. Whoever holds it can pay anyone, any amount, until someone notices.",
        answer:
          "The agent's key can only pay from your PaymentGuard vault, inside your caps. Revoke it in one transaction and every later payment from it fails on-chain.",
      },
    ],
    /** The four-step track under the stories. */
    // Not rendered on the landing since 2026-10-01.
    track: {
      title: "One payment, four steps",
      steps: [
        "The API asks for payment",
        "Baret checks the caps",
        "The agent signs",
        "The payment settles",
      ],
      without: "Plain x402: each step forgets the one before it.",
      with: "With Baret: one ledger remembers every payment, across every call.",
    },
    // Not rendered on the landing since 2026-10-01.
    kicker: "The caps are the firewall. Nothing over a cap goes out on its own.",
    note: "Agent wallets come from Dynamic. Per-payment and daily caps live on\u2011chain in your PaymentGuard vault.",
    action: { label: "Set up your agent", href: "/agents" },
  },

  /** Only numbers that come from the docs. No usage stats, ever. */
  // Not rendered on the landing since 2026-10-01.
  stats: {
    title: "Counted, not claimed.",
    items: [
      { value: "9", label: "detectors read every transaction" },
      { value: "25", label: "rules you can switch on, off or tune" },
      { value: "6", label: "fake sites with real attacks to try" },
      { value: "800 ms", label: "until Monad makes a transaction final" },
    ],
    note: "No user counts and no totals. Baret is on testnet, so it counts only what it ships.",
  },

  /** Six cards, one per threat site. `hook` is an invitation, not a result:
   *  the live analysis on each site says what it found. `verdict` matches
   *  the expected verdict in that site's own content file. */
  showcase: {
    // Not rendered on the landing since 2026-10-01.
    eyebrow: "Showcase",
    title: "Six fake sites. Six real attacks.",
    body: "Each site looks like a real product and builds a real transaction on Monad testnet. Connect any wallet, press the main button, and read the verdict before anything is signed.",
    notice:
      "These sites are fakes built for the showcase. They run on testnet and cannot touch real money.",
    labels: { verdict: "Expected verdict", open: "Open the site" },
    /** The card's verdict tag. Same words as `hub.cardLabels.verdicts`, kept
     *  here so the landing does not load the hub's copy. */
    verdicts: {
      safe: "Safe",
      caution: "Caution",
      blocked: "Blocked",
      unreachable: "Can't reach Baret",
      capped: "Blocked at the cap",
    },
    cards: [
      {
        name: "Scrybe",
        category: "Paid API",
        hook: "Let an agent pay per question. Watch the cap hold.",
        verdict: "capped",
        href: "/scrybe",
      },
      {
        name: "NovaSwap",
        category: "Token swap",
        hook: "Swap tokens. See where the output really lands.",
        verdict: "blocked",
        href: "/novaswap",
      },
      {
        name: "PixelDrop",
        category: "NFT mint",
        hook: "Mint one item. See what else the button grants.",
        verdict: "blocked",
        href: "/pixeldrop",
      },
      {
        name: "OrbitYield",
        category: "Staking",
        hook: "Stake for yield. See who has verified the pool.",
        verdict: "blocked",
        href: "/orbityield",
      },
      {
        name: "ClaimHub",
        category: "Airdrop",
        hook: "Claim a free airdrop. See what you are really signing.",
        verdict: "blocked",
        href: "/claimhub",
      },
      {
        name: "LaunchPad",
        category: "Token sale",
        hook: "Buy into a token sale. See who still holds the controls.",
        verdict: "blocked",
        href: "/launchpad",
      },
    ],
    action: { label: "Open the showcase", href: "/showcase" },
  },

  /** Same signature, two wallets. Matched rows, nobody named. */
  // Not rendered on the landing since 2026-10-01.
  comparison: {
    eyebrow: "The difference",
    title: "A standard wallet trusts the site. Baret doesn't.",
    body: "Same signature, two wallets. No wallet is named here. This is what changes when a check sits between the site and your key.",
    columns: { without: "A standard wallet", with: "With Baret" },
    rows: [
      {
        aspect: "Before you sign",
        without: "An address and a Confirm button. The chain decides the rest.",
        with: "What would move, a verdict, and one plain sentence per finding.",
      },
      {
        aspect: "Unlimited allowances",
        without: "Granted in one tap and live until you remember to revoke it.",
        with: "Flagged before you sign. Every allowance you keep sits in one list with a Revoke button.",
      },
      {
        aspect: "Agent payments",
        without: "An agent can sign small payments all day with no ceiling.",
        with: "Per-payment, hourly and daily caps for each merchant. The vault enforces its caps on-chain.",
      },
      {
        aspect: "After you sign",
        without: "You find out from a block explorer, if you look.",
        with: "An alert when an allowance is used or funds leave without your signature.",
      },
    ],
  },

  /** Nobody in this category says where analysis runs. We do, including the
   *  half that happens on a server, and we name every party that sees data. */
  // Not rendered on the landing since 2026-10-01.
  privacy: {
    eyebrow: "Where the analysis runs",
    title: "What runs where, and who sees what.",
    body: "You are trusting Baret with the moment before your key moves. Here is exactly what happens in it, including the part on a server.",
    cards: [
      {
        title: "The analysis runs on a server",
        body: "Simulation needs a Monad node. So the unsigned transaction, your address and the asking site go to Baret's server. The server simulates it over Alchemy RPC. Nansen and Cleanverse see the addresses involved, for reputation and compliance. No key is ever sent.",
      },
      {
        title: "Nothing is signed without you",
        body: "Baret never signs and never sends. The verdict arrives before the sign button does. On Blocked, that button stays off unless you choose the logged override.",
      },
      {
        title: "Your keys stay on your device",
        body: "The web wallet signs with a Mera passkey held by your device. The extension keeps its key encrypted in your browser. Neither one is ever sent to Baret.",
      },
      {
        title: "A simulation is a preflight, not a guarantee",
        body: "It predicts the result against the chain as it is right now. A transaction that lands first can change the outcome. Read a verdict as a strong forecast, not a promise.",
      },
    ],
    footnote: "No audit yet. The code is open.",
    action: {
      label: "Read it on GitHub",
      href: "https://github.com/HackerFetch/Baret-Metropolis",
    },
  },

  // Not rendered on the landing since 2026-10-01.
  faq: {
    eyebrow: "Before you trust it",
    title: "Fair questions",
    items: [
      {
        question: "What happens if Baret is down?",
        answer:
          'The request stops. The verdict reads "Can\'t reach Baret" and counts as Blocked. The sign button stays off. Signing without a check takes a separate press-and-hold, and it is logged.',
      },
      {
        question: "What data leaves my device?",
        answer:
          "The unsigned transaction, your address and the site that asked. Baret's server simulates it over Alchemy RPC and checks the addresses with Nansen and Cleanverse. Your keys and your passkey never leave.",
      },
      {
        question: "Does it slow me down?",
        answer:
          "It adds one check before the sign request opens: a simulation and a few lookups. We will publish a measured time once we have one, not an estimate.",
      },
      {
        question: "Is it a wallet or an add-on?",
        answer:
          "A wallet, installed as a browser extension. It appears in a site's wallet list beside the wallets you already use. Nothing needs uninstalling. There is also a web wallet that signs with a Mera passkey.",
      },
      {
        question: "Will I learn to click through it like every other warning?",
        answer:
          "That is the real risk in this category, so Baret works the other way round. You set your rules once, in advance. After that a block is a block. Caution appears only when a check found something specific.",
      },
      {
        question: "What does Blocked actually do?",
        answer:
          "The sign button stays off, and Baret names the rule that fired. To sign anyway, you press and hold a separate control. The override is written to your activity log.",
      },
      {
        question: "Who writes the rules?",
        answer:
          "You do. Start from Strict, Balanced or Permissive, then change any of the 25 rules one by one. The result is plain JSON you can export.",
      },
      {
        question: "Does it cost anything?",
        answer:
          "The extension and the web wallet are free. Baret takes no cut of your transactions. Developers who call the analysis API directly may pay per check over x402.",
      },
      {
        question: "Has Baret been audited?",
        answer:
          "No. Nobody has audited the code or the two contracts yet. The source is open, so you can read every line before you trust it.",
      },
      {
        question: "When is mainnet?",
        answer:
          "Testnet today. Mainnet comes after more testing on real traffic. We would rather be late than wrong.",
      },
    ],
  },

  cta: {
    title: "Sign with your eyes open.",
    body: "Open the showcase and press Claim on a fake airdrop. Read what Baret finds before anything is signed.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: {
        label: "Install the extension",
        /** Below 768 px, same link (D4). */
        labelPhone: "Install on desktop",
        href: "/install",
      },
    },
    note: "Free to use. Open source. On Monad testnet.",
    /** The trust line as linked facts (D3), rendered in place of `note`. A
     *  fact links only where it has a real destination. No audit is done or
     *  booked (Ezgin, 2026-10-02), so the line says so. */
    facts: [
      { label: "MIT licence" },
      { label: "Source", href: "https://github.com/HackerFetch/Baret-Metropolis" },
      { label: "Not audited yet" },
      { label: "Monad testnet only" },
      { label: "Fails closed" },
    ],
  },
} as const;

export type HomeContent = typeof home;
