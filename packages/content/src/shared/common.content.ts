/**
 * Strings that more than one surface renders. Changing a word here changes it
 * in the popup, the wallet and the showcase at the same time, which is the
 * point.
 *
 * Every key that existed before stays: page files and apps read them. Add keys
 * freely, rename none. Placeholders follow the vocabulary documented at the
 * top of shared/findings.content.ts.
 */

export const common = {
  brand: {
    name: "Baret",
    wordmark: "BARET",
    tagline: "Read first. Then sign.",
    oneLine: "The firewall for your signature on Monad.",
    description:
      "Baret reads every Monad transaction before you sign it. It simulates what the transaction will do, checks it against your rules and gives you a verdict with the reasons: Safe, Caution or Blocked.",
    /** The plain claim to use wherever a page is tempted to promise safety. */
    checkLine: "Baret checks every sign request before you sign it.",
  },

  /**
   * The four verdicts. Used on every sign screen, card and tag. A verdict says
   * what was checked. It never promises an outcome.
   */
  verdicts: {
    safe: {
      label: "Safe",
      short: "Safe",
      line: "Simulated and checked against your rules. No check found a problem.",
      aria: "Verdict: Safe",
    },
    caution: {
      label: "Caution",
      short: "Caution",
      line: "Nothing broke your rules, but a check found something worth a look.",
      aria: "Verdict: Caution",
    },
    blocked: {
      label: "Blocked",
      short: "Blocked",
      line: "A rule you set stopped this request. Nothing was signed.",
      aria: "Verdict: Blocked",
    },
    unreachable: {
      // Not rendered on the landing since 2026-10-01.
      label: "Can't reach Baret",
      short: "Can't reach Baret",
      // Not rendered on the landing since 2026-10-01.
      line: "Baret could not finish its checks, so this request counts as Blocked.",
      aria: "Verdict: Can't reach Baret, treated as Blocked",
    },
  },

  /** How complete the simulation behind a verdict was. */
  confidence: {
    title: "Confidence",
    high: "Simulated with a full trace of every call.",
    medium: "Simulated without a trace of the inner calls, so some checks saw less.",
    low: "Some data was missing. Treat this result as incomplete.",
    words: { high: "High", medium: "Medium", low: "Low" },
  },

  /** The severity a finding carries, as the server sends it. */
  severity: {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  },

  /** Button labels used across screens. Keep them verbs. */
  actions: {
    sign: "Sign and send",
    signAnyway: "Sign anyway",
    decline: "Decline",
    cancel: "Cancel",
    back: "Back",
    next: "Continue",
    done: "Done",
    close: "Close",
    retry: "Try again",
    checkAgain: "Check again",
    copy: "Copy",
    copied: "Copied",
    copyAddress: "Copy the address",
    connect: "Connect",
    disconnect: "Disconnect",
    approve: "Allow",
    reject: "Reject",
    pause: "Pause",
    resume: "Resume",
    revoke: "Revoke",
    edit: "Edit",
    save: "Save",
    remove: "Remove",
    seeAll: "See all",
    whyThisMatters: "Why this matters",
    showLess: "Show less",
    viewOnExplorer: "View on the explorer",
    readTheDocs: "Read the docs",
    openShowcase: "Open the showcase",
    installWallet: "Install the extension",
    learnMore: "How this works",
  },

  /** Field labels that show up on more than one screen. */
  labels: {
    from: "From",
    to: "To",
    amount: "Amount",
    asset: "Asset",
    network: "Network",
    fee: "Network fee",
    total: "Total",
    address: "Address",
    yourAddress: "Your address",
    origin: "Site",
    contract: "Contract",
    spender: "Spender",
    operator: "Operator",
    recipient: "Recipient",
    merchant: "Merchant",
    cap: "Cap",
    perPayment: "Per payment",
    perHour: "Per hour",
    perDay: "Per day",
    spent: "Spent",
    remaining: "Remaining",
    status: "Status",
    policy: "Rules",
    verdict: "Verdict",
    whatChanges: "What changes",
    findings: "Findings",
    policyHits: "Rules that fired",
    rawTransaction: "Raw transaction",
    transaction: "Transaction",
    gasLimit: "Gas limit",
    balance: "Balance",
    estimatedUsd: "Estimated in USD",
    account: "Account",
    version: "Version",
  },

  /** State words for permissions, payments and activity rows. */
  status: {
    active: "Active",
    paused: "Paused",
    revoked: "Revoked",
    expired: "Expired",
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
  },

  /** Small interface words with no better home. */
  ui: {
    stepOf: "Step {n} of {total}",
    nothingYet: "Nothing here yet",
    loading: "Loading",
    checking: "Checking",
    all: "All",
    none: "None",
  },

  networks: {
    testnet: { label: "Monad testnet", short: "Testnet", chainId: "10143" },
    mainnet: { label: "Monad mainnet", short: "Mainnet", chainId: "143" },
    banner: "Baret runs on Monad testnet today. Mainnet comes after more testing.",
  },

  /** Errors any screen can hit. Each one names the cause, then the next move. */
  errors: {
    analyzerUnreachable: {
      title: "Can't reach Baret",
      body: "The analysis server did not answer, so nothing was checked. Until it does, this request counts as Blocked.",
      note: "To sign anyway, press and hold. The override is written to your activity log.",
      action: { label: "Check again" },
    },
    rateLimited: {
      title: "Too many checks at once",
      body: "The analysis server is limiting requests from your connection. Until it answers, this request counts as Blocked.",
      action: { label: "Check again" },
    },
    rpcUnreachable: {
      title: "Monad is not answering",
      body: "The Monad node did not respond. Nothing was signed and nothing was sent.",
      action: { label: "Try again" },
    },
    networkMismatch: {
      title: "This site wants another network",
      body: "The site asked for {expected} and you are on {actual}. Switch networks or decline.",
      action: { label: "Switch network" },
    },
    insufficientBalance: {
      title: "Not enough {asset}",
      body: "You need {amount} more {asset}. The network fee is paid in MON.",
    },
    simulationFailed: {
      title: "This would fail on Monad",
      body: "Baret ran it without sending it, and it failed. Sent now, it would fail and still cost a fee.",
    },
    timedOut: {
      title: "The request expired",
      body: "The site waited too long, so Baret declined it. Nothing was signed.",
    },
    unknown: {
      title: "Something went wrong",
      body: "The action did not finish and nothing was signed. If this keeps happening, copy the error from your activity log.",
      action: { label: "Try again" },
      /** The route error screen: tag, heading and the way back. */
      tag: "Error",
      heading: "This page did not load.",
      back: "Back to the start",
    },
  },

  /** Words for time, so relative timestamps read the same everywhere. */
  time: {
    justNow: "just now",
    minutesAgo: "min ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
    today: "Today",
    yesterday: "Yesterday",
    thisHour: "this hour",
    today24h: "last 24 hours",
  },

  /** Showcase navigation and footer. */
  nav: {
    /** Accessible name of the primary navigation landmark. */
    label: "Main",
    /** Label of the skip link that jumps past the header to the main content. */
    skip: "Skip to main content",
    links: [
      { label: "Showcase", href: "/showcase" },
      { label: "Agents", href: "/agents" },
      { label: "Docs", href: "/docs" },
      { label: "Install", href: "/install" },
    ],
    cta: { label: "Install the extension", href: "/install" },
  },

  /**
   * The footer keys each link by its href, so one group never lists the same
   * href twice.
   */
  footer: {
    tagline: "Read first. Then sign.",
    note: "Free and open source under the MIT licence. Running on Monad testnet.",
    groups: [
      {
        title: "Product",
        links: [
          { label: "Showcase", href: "/showcase" },
          { label: "Install", href: "/install" },
        ],
      },
      {
        title: "Developers",
        links: [
          { label: "Agent SDK", href: "/agents" },
          { label: "Docs", href: "/docs" },
        ],
      },
      {
        title: "Project",
        links: [
          { label: "How it works", href: "/docs" },
          { label: "Source", href: "https://github.com/HackerFetch/Baret-Metropolis" },
        ],
      },
    ],
  },

  /** The corner ribbon on a fake showcase site. */
  demo: {
    ribbon: "Demo site",
  },

  /** One line repeated wherever a showcase site could be taken for a real one. */
  demoNotice:
    "These sites are fakes built for the showcase. They run on Monad testnet, where tokens have no real value.",
} as const;

export type Common = typeof common;
