/**
 * Strings that more than one app renders. Changing a word here changes it in
 * the popup, the wallet and the marketing mockup at the same time, which is
 * the point.
 */

export const common = {
  brand: {
    name: "Baret",
    wordmark: "BARET",
    tagline: "Read first. Then sign.",
    oneLine: "The firewall for your signature on Monad.",
    description:
      "Baret reads every Monad transaction before you sign it. It decodes the transaction, simulates what it will do, and gives you a plain answer: Safe, Caution or Blocked.",
  },

  /** The four things a verdict can say. Used on every sign screen and card. */
  verdicts: {
    safe: {
      label: "Safe to sign",
      short: "Safe",
      line: "Nothing in this transaction breaks your rules.",
    },
    caution: {
      label: "Sign with caution",
      short: "Caution",
      line: "This is allowed, but here is what you should know first.",
    },
    blocked: {
      label: "Blocked",
      short: "Blocked",
      line: "One of your rules stopped this transaction.",
    },
    unreachable: {
      label: "Not checked",
      short: "Not checked",
      line: "Baret could not reach the analysis server, so nothing was checked.",
    },
  },

  /** How we describe how sure the analysis is. */
  confidence: {
    high: "Simulated with a full trace.",
    medium: "Simulated, but the node did not return a call trace.",
    low: "Some data was missing, so treat this result as incomplete.",
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
    copy: "Copy",
    copied: "Copied",
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
    viewOnExplorer: "View on the explorer",
    readTheDocs: "Read the docs",
    openShowcase: "Open the showcase",
    installWallet: "Install the wallet",
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
    origin: "Site",
    contract: "Contract",
    spender: "Spender",
    merchant: "Merchant",
    cap: "Cap",
    spent: "Spent",
    remaining: "Remaining",
    status: "Status",
    policy: "Policy",
    whatChanges: "What changes",
    findings: "Findings",
    policyHits: "Rules that fired",
    rawTransaction: "Raw transaction",
    balance: "Balance",
    account: "Account",
  },

  networks: {
    testnet: { label: "Monad testnet", short: "Testnet", chainId: "10143" },
    mainnet: { label: "Monad mainnet", short: "Mainnet", chainId: "143" },
    banner: "Baret runs on Monad testnet today. Mainnet comes after more testing.",
  },

  /** Errors any screen can hit. Each one names what to do next. */
  errors: {
    analyzerUnreachable: {
      title: "Baret could not check this",
      body: "The analysis server did not answer. You can wait and try again, or sign without a check. Signing without a check is logged.",
      action: { label: "Try again" },
    },
    rpcUnreachable: {
      title: "Monad is not answering",
      body: "The node did not respond. Your transaction was not sent. Nothing was signed.",
      action: { label: "Try again" },
    },
    networkMismatch: {
      title: "This site wants a different network",
      body: "The site asked for mainnet and you are on testnet. Switch networks or decline.",
      action: { label: "Switch network" },
    },
    insufficientBalance: {
      title: "Not enough balance",
      body: "You need more MON to cover the amount and the network fee.",
    },
    simulationFailed: {
      title: "This transaction would fail",
      body: "The simulation reverted, which means the chain would reject it. Sending it would still cost a fee.",
    },
    timedOut: {
      title: "The request expired",
      body: "The site waited too long, so Baret declined it for you. Nothing was signed.",
    },
    unknown: {
      title: "Something went wrong",
      body: "The action did not complete and nothing was signed. If this keeps happening, open the activity log and copy the error.",
      action: { label: "Try again" },
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

  /** Marketing site navigation and footer. */
  nav: {
    links: [
      { label: "Showcase", href: "/showcase" },
      { label: "Agents", href: "/agents" },
      { label: "Docs", href: "/docs" },
      { label: "Install", href: "/install" },
    ],
    cta: { label: "Install the wallet", href: "/install" },
  },

  footer: {
    tagline: "Read first. Then sign.",
    note: "Free and open source under the MIT licence. Running on Monad testnet.",
    groups: [
      {
        title: "Product",
        links: [
          { label: "Showcase", href: "/showcase" },
          { label: "Install", href: "/install" },
          { label: "For agents", href: "/agents" },
        ],
      },
      {
        title: "Developers",
        links: [
          { label: "Docs", href: "/docs" },
          { label: "Source", href: "https://github.com/HackerFetch/Baret-Metropolis" },
          { label: "Contracts", href: "/docs#contracts" },
        ],
      },
      {
        title: "Project",
        links: [
          { label: "How it works", href: "/docs#architecture" },
          { label: "What it cannot do", href: "/docs#limits" },
          { label: "Brand", href: "/docs#brand" },
        ],
      },
    ],
  },

  /** One line we repeat wherever a demo could be mistaken for the real thing. */
  demoNotice:
    "These sites are fakes built for this showcase. They run on Monad testnet and they cannot touch real money.",
} as const;

export type Common = typeof common;
