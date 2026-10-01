/**
 * apps/wallet, the activity log (route /history). Order: filters, rows, the
 * detail panel, empty states, export.
 *
 * A request the reader declined is logged as declined, never as Blocked.
 * Blocked means a rule stopped it. Overrides get their own row so they are
 * easy to find later.
 */

export const history = {
  title: "Activity",
  body: "Every verdict is logged here, including requests you declined and the ones Baret blocked.",

  filters: [
    { id: "all", label: "All" },
    { id: "sent", label: "Sent" },
    { id: "received", label: "Received" },
    { id: "sites", label: "Sites" },
    { id: "agent", label: "Agent" },
    { id: "blocked", label: "Blocked" },
    { id: "declined", label: "Declined" },
    { id: "overrides", label: "Overrides" },
  ],

  rows: {
    sent: "Sent {amount} {asset} to {recipient}",
    received: "Received {amount} {asset}",
    allowance: "Allowed {spender} to spend {amount} {asset}",
    revoke: "Revoked {spender}",
    payment: "Your agent paid {amount} {asset} to {merchant}",
    blocked: "Blocked a request from {origin}",
    declined: "You declined a request from {origin}",
    expired: "A request from {origin} expired",
    overridden: "Signed with an override of {rule}",
    unchecked: "Signed with an override while Baret was unreachable",
    drift: "Left your account without this wallet signing",
    connect: "Connected to {origin}",
    disconnect: "Disconnected {origin}",
  },

  detail: {
    title: "Details",
    verdict: "Verdict at the time",
    checkedBy: "Checked by",
    findings: "Findings",
    rules: "Rules it broke",
    changes: "What changed",
    override: "Override",
    overrideNote: "You pressed and held to sign past {rule}.",
    rulesInForce: "Your rules at the time",
    hash: "Transaction",
    block: "Block",
    fee: "Network fee",
    explorer: "View on the explorer",
    recheck: "Check it again under your current rules",
  },

  empty: {
    all: {
      title: "Nothing here yet",
      body: "Every verdict lands here, including requests you declined. Send some MON or connect to a site to start.",
      action: { label: "Send MON", href: "/send" },
    },
    filtered: {
      title: "Nothing matches that filter",
      body: "Pick another filter, or clear it to see everything.",
    },
    blocked: {
      title: "Nothing has been blocked",
      body: "No request has broken your rules so far. Check that your rules say what you want.",
      action: { label: "Review your rules", href: "/policies" },
    },
  },

  export: {
    label: "Export as CSV",
    note: "The file is built on this device. Nothing is uploaded.",
  },

  errors: {
    load: {
      title: "Can't load your activity",
      body: "Monad or the indexer did not answer. Try again in a moment.",
      action: { label: "Try again" },
    },
  },
} as const;

export type HistoryContent = typeof history;
