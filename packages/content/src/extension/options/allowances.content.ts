/**
 * Extension options, the full permissions manager.
 * Card labels are shared with the popup. This file holds the wide-screen
 * extras: the spend chart, the breakdown, and the bulk clean-up actions.
 */

export const optionsAllowances = {
  title: "Standing permissions",
  body: "Everything that can move money out of this wallet without asking you again. Each one has a cap, a clock and a revoke button.",

  summary: {
    active: "Active",
    paused: "Paused",
    spent24h: "Spent in 24 hours",
    unlimited: "With no limit",
  },

  detail: {
    chart: { title: "Last 7 days", empty: "No payments in the last week." },
    breakdown: {
      title: "Caps",
      perTx: "Per payment",
      perHour: "Per hour",
      perDay: "Per day",
      used: "{spent} of {cap}",
    },
    signer: { title: "Signing address", hint: "The address that can spend under this permission.", explorer: "View on the explorer" },
    transactions: { title: "Payments under this permission", empty: "It has never been used." },
    created: "Granted {date} from {origin}",
    lastUsed: "Last used {date}",
    neverUsed: "Never used",
  },

  bulk: {
    title: "Clean up",
    unused: {
      label: "Revoke anything unused for 30 days",
      body: "{count} permissions have not been used in a month. Revoking costs one network fee each.",
    },
    unlimited: {
      label: "Cap everything that has no limit",
      body: "{count} permissions have no ceiling. This replaces each one with a cap you choose.",
    },
    all: { label: "Revoke everything", body: "Every site and agent loses access. One fee per permission." },
  },

  empty: {
    title: "Nothing can spend from this wallet",
    body: "That is the safest possible state. When you approve a token or connect an agent, it appears here with a cap.",
  },

  help: {
    title: "Why this screen exists",
    body: "Most wallets let you grant a permission and then never show it to you again. Forgotten permissions are how wallets get emptied months after the mistake. Everything on this page can be revoked in one click.",
  },
} as const;

export type OptionsAllowancesContent = typeof optionsAllowances;
