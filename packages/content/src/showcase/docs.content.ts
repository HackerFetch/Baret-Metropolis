/**
 * /docs on apps/showcase. An index, not a doc.
 *
 * Section order (page plan, 2026-09-28): hero, thirteen doc cards in a grouped
 * grid, summary with known limitations, CTA.
 *
 * Research notes:
 *  - The best docs indexes put a router group first, then expand. Under 20
 *    cards reads as curated, over 40 reads as a sitemap. We have 13.
 *  - A good card is a noun the reader is already searching for, plus one
 *    sentence that starts with a verb and names an artifact.
 *  - Groups are named after jobs, not after the folder they live in.
 *  - The page renders each group's title as its anchor, so renaming a group
 *    changes its link. /agents links to #contracts-and-payments.
 *
 * Every card points at a real file in this repository, one card per file,
 * matching docs/FRONTEND.md section 4.2. Eleven cards point into docs/; "For
 * developers" (H9, 2026-10-09) points at the two package READMEs instead,
 * since those are the quickstart a developer calling the API actually wants.
 * When a file is added there, add a card here in the same commit.
 */

export const docs = {
  meta: {
    title: "Docs · Baret",
    description:
      "The specs behind Baret on Monad: how a transaction is simulated, checked by nine detectors and your policy, and what the vault contract enforces.",
  },

  hero: {
    /** Not rendered on /docs since 2026-10-03. */
    eyebrow: "Documentation",
    title: "Where the check actually happens.",
    body: "A standard wallet goes straight from the site's request to your signature. Baret adds one step in between. These files explain that step, one topic each.",
    /** Two timelines side by side: the same request, with and without the
     *  extra step. */
    timeline: {
      without: {
        label: "A standard wallet",
        steps: ["The site asks", "You press Sign", "The chain decides"],
      },
      with: {
        label: "With Baret",
        steps: [
          "The site asks",
          "Baret simulates and checks",
          "Your rules decide",
          "You sign, or you do not",
        ],
      },
      divider: "Nothing checks the transaction in between.",
    },
    actions: {
      primary: { label: "Start with the architecture", href: "#start-here" },
      secondary: {
        label: "View the source",
        href: "https://github.com/HackerFetch/Baret-Metropolis",
      },
    },
    note: "The specs came first. When the code and a spec disagree, the code wins and the spec gets fixed.",
  },

  /** The cue at the foot of every card; the card links to the file on GitHub. */
  open: "Read it on GitHub",

  groups: [
    {
      title: "Start here",
      body: "Two files answer most questions.",
      cards: [
        {
          title: "Vision",
          body: "Read why the check belongs in the wallet and not in the site, and who Baret is for.",
          file: "docs/PROJECT_OVERVIEW.md",
        },
        {
          title: "Architecture",
          body: "Follow one transaction from request to verdict: simulation, nine detectors, the policy engine and the API.",
          file: "docs/ARCHITECTURE.md",
        },
      ],
    },
    {
      title: "What you see",
      body: "The screens, the pages and the words on them.",
      cards: [
        {
          title: "Wallet spec",
          body: "Walk through every screen of the extension and the passkey wallet, including the empty and error states.",
          file: "docs/WALLET.md",
        },
        {
          title: "Frontend content",
          body: "See what belongs on each page of this site, section by section.",
          file: "docs/FRONTEND.md",
        },
        {
          title: "Brand",
          body: "Get the mark, the colors, the type and the voice, including the words Baret never uses.",
          file: "docs/BRAND.md",
        },
      ],
    },
    {
      title: "Contracts and payments",
      body: "The parts that hold money or move it.",
      cards: [
        {
          title: "Contracts",
          body: "Read the PaymentGuard vault and the ReputationRegistry: functions, events, invariants and the tests they must pass.",
          file: "docs/CONTRACTS.md",
        },
        {
          title: "x402 payments",
          body: "Trace an HTTP 402 payment from the request to settlement, and see where Baret checks it.",
          file: "docs/X402_FACILITATOR.md",
        },
      ],
    },
    {
      title: "Plan and decisions",
      body: "Why the project looks the way it does, and what comes next.",
      cards: [
        {
          title: "Resources",
          body: "See which sponsor tool does which job, from Alchemy RPC to Nansen, Mera, Cleanverse, Envio, Dynamic and Chainlink CRE.",
          file: "docs/RESOURCES.md",
        },
        {
          title: "Bounties and tracks",
          body: "Check the hackathon track and the sponsor bounties Baret is built for, in priority order.",
          file: "docs/BOUNTIES_AND_TRACKS.md",
        },
        {
          title: "Roadmap",
          body: "Follow the weekly plan and see what is done.",
          file: "docs/ROADMAP.md",
        },
        {
          title: "Decision log",
          body: "Read each architecture and scope decision with its reason and the options it ruled out.",
          file: "docs/DECISIONS.md",
        },
      ],
    },
    {
      title: "For developers",
      body: "Calling Baret from your own code, with or without the SDK.",
      cards: [
        {
          title: "Guard SDK",
          body: "Install, the smallest working call against the live API, and what fail-closed means for your code.",
          file: "packages/guard/README.md",
        },
        {
          title: "Agent kit",
          body: "Give an agent a signer that cannot sign past Baret's verdict, plus the baret CLI.",
          file: "packages/agent-kit/README.md",
        },
      ],
    },
  ],

  /**
   * For readers who arrived from a search and want the short version.
   * Not rendered on /docs since 2026-10-03 (cut for simplicity).
   */
  summary: {
    eyebrow: "Pipeline",
    title: "The short version",
    steps: [
      {
        title: "Decode",
        body: "Turn raw calldata into a named function call with readable arguments.",
      },
      {
        title: "Simulate",
        body: "Run it against live Monad state over Alchemy RPC, without sending it, and record every internal call.",
      },
      {
        title: "Detect",
        body: "Nine detectors look for risky allowances, flagged contracts, dangerous opcodes, bad reputation, compliance gaps, deep call chains, heavy gas and payment mismatches.",
      },
      {
        title: "Decide",
        body: "Apply your policy. Missing data counts as a block, never as a pass.",
      },
    ],
  },

  /** Flat and unapologetic. Each line is a property of the design, not a
   *  bug waiting for a fix. */
  limitations: {
    title: "Known limitations",
    items: [
      "A simulation is a preflight. State can change between the check and the block that includes your transaction.",
      "Baret checks what goes through Baret. A key used somewhere else is not checked before it signs. The monitor can only tell you afterwards.",
      "The analysis runs on a server. It sees the unsigned transaction, your address and the site asking. It never sees a key.",
      "Reputation lists only know what has been reported. A drainer nobody has flagged yet is on no list.",
      "If the server is down, signing through Baret stops. That is on purpose.",
      "No audit yet. The code is open. Read it.",
    ],
  },

  cta: {
    title: "Prefer to watch it work?",
    body: "The showcase has six fake sites, each with a trap built from a real transaction. Every sign request goes through the same analysis the wallet uses.",
    actions: {
      primary: { label: "Open the web wallet", href: "https://baret-wallet.vercel.app" },
      secondary: { label: "Try the demo", href: "/novaswap" },
    },
  },
} as const;

export type DocsContent = typeof docs;
