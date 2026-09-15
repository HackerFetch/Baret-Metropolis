/** apps/wallet, the activity log. Refusals are logged as carefully as sends. */

export const history = {
  title: "Activity",
  body: "Everything you signed, everything Baret refused, and everything that moved without you.",

  filters: [
    { id: "all", label: "All" },
    { id: "sent", label: "Sent" },
    { id: "received", label: "Received" },
    { id: "sites", label: "Sites" },
    { id: "payments", label: "Payments" },
    { id: "blocked", label: "Blocked" },
    { id: "alerts", label: "Alerts" },
  ],

  rows: {
    sent: "Sent {amount} to {to}",
    received: "Received {amount} from {from}",
    approval: "Approved {spender} for {amount} {asset}",
    revoke: "Revoked {spender}",
    payment: "Paid {amount} to {origin}",
    blocked: "Blocked a request from {origin}",
    overridden: "Signed anyway, against your own rule",
    declined: "Declined a request from {origin}",
    unchecked: "Signed without a check",
    drift: "Something moved that you did not sign",
    connect: "Connected to {origin}",
  },

  detail: {
    title: "Details",
    verdict: "Verdict at the time",
    findings: "What was found",
    changes: "What changed",
    hash: "Transaction",
    block: "Block",
    fee: "Fee paid",
    policy: "Rules in force",
    explorer: "View on the explorer",
    recheck: "Check it again with your current rules",
  },

  empty: {
    all: {
      title: "Nothing here yet",
      body: "Every signature lands here, including the ones Baret refused. That record is yours and it stays on this device.",
    },
    filtered: {
      title: "Nothing matches that filter",
      body: "Try a different one, or clear it to see everything.",
    },
    blocked: {
      title: "Nothing has been blocked",
      body: "Either you have not run into anything yet, or your rules are looser than you think.",
      action: { label: "Review your rules" },
    },
  },

  export: {
    label: "Export as CSV",
    note: "The file stays on your device. Nothing is uploaded.",
  },
} as const;

export type HistoryContent = typeof history;
