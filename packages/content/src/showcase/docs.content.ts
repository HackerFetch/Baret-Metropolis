/**
 * /docs on apps/showcase. An index, not a doc.
 *
 * Research notes:
 *  - The best docs indexes put a router group first, then expand. Under 20
 *    cards reads as curated, over 40 reads as a sitemap. We have 13.
 *  - A good card is a noun the reader is already searching for, plus one
 *    sentence that starts with a verb and names an artifact.
 *  - Groups are named after jobs, not after the folder they live in.
 *
 * Every card points at a real file in docs/. When a file is added there, add a
 * card here in the same commit.
 */

export const docs = {
  meta: {
    title: "Baret docs",
    description:
      "How Baret works: the analysis pipeline, the risk detectors, the policy engine, the contracts, and what it cannot do.",
  },

  hero: {
    eyebrow: "Documentation",
    title: "How Baret works, in detail.",
    body: "Every claim on this site is backed by one of these files. They live in the repository, so what you read here is what is running.",
    actions: {
      primary: { label: "Read the architecture", href: "#build" },
      secondary: {
        label: "View the source",
        href: "https://github.com/HackerFetch/Baret-Metropolis",
      },
    },
  },

  groups: [
    {
      title: "Start here",
      body: "Three files answer most questions.",
      cards: [
        {
          title: "Vision",
          body: "Read why a transaction firewall belongs in the wallet and not in the dApp, and who it is for.",
          file: "docs/PROJECT_OVERVIEW.md",
        },
        {
          title: "Architecture",
          body: "Follow one transaction from the request to the verdict, through the simulator, the detectors and the policy engine.",
          file: "docs/ARCHITECTURE.md",
        },
        {
          title: "What it cannot do",
          body: "See the limits of a simulation, which rules are enforced where, and what is still a demo.",
          file: "docs/ARCHITECTURE.md#limits",
        },
      ],
    },
    {
      title: "Build on it",
      body: "The specs a contributor works from.",
      cards: [
        {
          title: "Wallet spec",
          body: "Open every screen and flow of the extension and the standalone wallet, including the error and empty states.",
          file: "docs/WALLET.md",
        },
        {
          title: "Frontend content",
          body: "Read what belongs on each page of this site, section by section, with no design decisions in it.",
          file: "docs/FRONTEND.md",
        },
        {
          title: "Contracts",
          body: "Inspect PaymentGuard and ReputationRegistry: the functions, the events, the invariants and the deployed addresses.",
          file: "docs/CONTRACTS.md",
        },
        {
          title: "Agent payments",
          body: "Trace an HTTP 402 payment from the challenge to settlement, and see where Baret checks it.",
          file: "docs/X402_FACILITATOR.md",
        },
      ],
    },
    {
      title: "Decisions and plan",
      body: "Why the project looks the way it does.",
      cards: [
        {
          title: "Decision log",
          body: "Read every architecture and scope decision with its reasoning and the alternatives that were rejected.",
          file: "docs/DECISIONS.md",
        },
        {
          title: "Roadmap",
          body: "Check what week the project is in and what is planned next.",
          file: "docs/ROADMAP.md",
        },
        {
          title: "Earlier versions",
          body: "Compare the five earlier builds of Baret on other chains and the mistakes this one refuses to repeat.",
          file: "docs/REFERENCE_REPOS.md",
        },
        {
          title: "Integrations",
          body: "See which sponsor tool is used where, and what breaks if you remove it.",
          file: "docs/RESOURCES.md",
        },
      ],
    },
    {
      title: "Design",
      body: "How it looks and how it talks.",
      cards: [
        {
          title: "Brand",
          body: "Get the mark, the palette, the type, the imagery rules and the words we do not use.",
          file: "docs/BRAND.md",
        },
        {
          title: "Copy",
          body: "Find any sentence in the product. Every string lives in one package, one file per page.",
          file: "packages/content/README.md",
        },
      ],
    },
  ],

  /** For readers who arrived from a search and want the short version. */
  summary: {
    title: "The short version",
    steps: [
      {
        title: "Decode",
        body: "Turn raw calldata into a named function call with readable arguments.",
      },
      {
        title: "Simulate",
        body: "Run it against live Monad state and record every internal call.",
      },
      {
        title: "Detect",
        body: "Score it with independent detectors: approvals, reputation, compliance, opcodes, fees, payments.",
      },
      { title: "Decide", body: "Apply your policy. Missing data counts as a failure, not a pass." },
    ],
  },

  cta: {
    title: "Prefer to watch it work?",
    body: "The showcase runs six real attacks against the real analysis server.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Install the wallet", href: "/install" },
    },
  },
} as const;

export type DocsContent = typeof docs;
