/**
 * apps/wallet, /x402: the x402 Console. What agents pay through PaymentGuard,
 * read live from the Baret indexer: this account's vault, and the whole
 * Baret network so a new account sees live data too.
 */
export const walletX402 = {
  title: "x402 Console",
  body: "Watch agents pay, live. Every x402 payment goes through a PaymentGuard vault on Monad, inside caps its owner set.",
  tabs: {
    label: "Which payments",
    vault: "Your vault",
    network: "Baret network",
  },
  live: {
    on: "Live",
    /** {seconds} since the last read. */
    updated: "Updated {seconds} s ago",
    paused: "Paused",
    pause: "Pause",
    resume: "Resume",
    every: "Reads again every 5 seconds.",
  },
  stats: {
    balance: "In the vault",
    payments: "Payments",
    paid: "Paid in total",
    today: "Paid in the last 24 h",
    merchants: "Merchants",
  },
  merchants: {
    title: "Merchants and caps",
    perPayment: "Per payment",
    perDay: "Per day",
    paid: "Paid",
    paused: "Paused",
    active: "Active",
    removed: "Removed",
    none: "No merchant is listed yet. Add one on the Agents screen.",
  },
  feed: {
    title: "Live feed",
    titleNetwork: "Latest across Baret",
    columns: {
      kind: "Event",
      merchant: "Merchant",
      agent: "Agent",
      amount: "Amount",
      time: "When",
      tx: "Transaction",
    },
    explorer: "View on Monadscan",
    /** Accessible name of a row's explorer link: {hash} is shortened. */
    explorerLabel: "Transaction {hash} on Monadscan, opens in a new tab",
    empty: "No payment yet. When an agent pays, it shows here within seconds.",
    emptyNetwork: "No agent has paid through Baret yet.",
  },
  kinds: {
    payment: "Payment",
    created: "Vault opened",
    deposit: "Deposit",
    withdraw: "Withdrawal",
    merchant: "Merchant caps set",
    paused: "Merchant paused",
    resumed: "Merchant resumed",
    removed: "Merchant removed",
    agent: "Agent key set",
    revoked: "Agent key revoked",
    flagged: "Address flagged",
    cleared: "Flag cleared",
    other: "Event",
  },
  registry: {
    title: "Registry changes",
    body: "Addresses Baret's reputation registry flagged or cleared on Monad. Baret blocks a payment to a flagged address.",
    reason: "Reason",
    severity: "Severity",
  },
  noVault: {
    title: "This account has no vault yet",
    body: "Open a PaymentGuard vault on the Agents screen to give an agent a budget. Meanwhile, the Baret network tab shows every agent paying live.",
    action: "Set up an agent",
    network: "Watch the Baret network",
  },
  sample:
    "The sample account has no vault on Monad. The Baret network tab reads live payments from the indexer.",
  loading: "Reading the indexer.",
  errors: {
    unavailable: {
      title: "The indexer did not answer",
      body: "Agent history is unavailable right now. Nothing is shown in its place. The console tries again on its own.",
    },
    vault: {
      title: "Your vault could not be read",
      body: "The vault did not load, so no figures are shown. Try again in a moment.",
    },
    retry: "Try again",
  },
  /** Amounts are in the vault's asset. */
  asset: "USDC",
  justNow: "just now",
  ago: { s: "{n} s ago", m: "{n} min ago", h: "{n} h ago", d: "{n} d ago" },
} as const;

export type WalletX402Content = typeof walletX402;
