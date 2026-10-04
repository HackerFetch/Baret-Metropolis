/**
 * Extension options, Permissions. Every allowance, collection access grant
 * (an NFT operator) and payment cap that can move funds out of this wallet,
 * largest exposure first. "Collection access" matches shared/policy and
 * shared/findings; the key stays `operator`.
 *
 * The popup card holds the compact labels. This file holds the wide-screen
 * extras: sorting, the detail row, the revoke dialog per kind, and the bulk
 * clean-up, which always states the exact count before the button.
 */

export const optionsAllowances = {
  title: "Permissions",
  lead: "Everything that can move funds out of this wallet without a new signature, largest exposure first. Each one has a revoke button.",

  summary: {
    total: "{count} permissions",
    unlimited: "{count} with no limit",
    paused: "{count} paused",
    spent24h: "{amount} spent under caps in 24 hours",
  },

  search: { placeholder: "Search by site, spender or token" },

  sort: {
    label: "Sort",
    exposure: "Largest exposure first",
    recent: "Most recently used",
    oldest: "Oldest first",
  },

  filters: [
    { id: "all", label: "All" },
    { id: "allowances", label: "Allowances" },
    { id: "operators", label: "Collection access" },
    { id: "payments", label: "Payment caps" },
  ],

  kinds: {
    allowance: {
      label: "Allowance",
      capped: "{spender} can spend up to {amount} {asset}.",
      unlimited: "{spender} can spend all of your {asset}, now and later.",
    },
    operator: {
      label: "Collection access",
      line: "{operator} can move every item in {contract}, including ones you get later.",
    },
    payment: {
      label: "Payment cap",
      line: "{merchant} can take payments within your caps without asking.",
    },
  },

  columns: {
    permission: "Permission",
    origin: "Granted on",
    exposure: "Can take",
    lastUsed: "Last used",
    status: "Status",
  },

  status: { active: "Active", paused: "Paused", unlimited: "No limit" },

  detail: {
    chart: { title: "Spent in the last 7 days", empty: "No payments in the last 7 days." },
    caps: {
      title: "Caps",
      perPayment: "Per payment",
      perHour: "Per hour",
      perDay: "Per day",
      used: "{spent} of {cap}",
    },
    holder: {
      title: "Who holds it",
      hint: "The address that can spend under this permission.",
      explorer: "View on the explorer",
    },
    history: { title: "Uses of this permission", empty: "It has never been used." },
    granted: "Granted {date} on {origin}",
    lastUsed: "Last used {date}",
    neverUsed: "Never used",
  },

  actions: {
    revoke: {
      label: "Revoke",
      hint: "Sends one transaction that ends this permission on-chain. It costs a network fee.",
    },
    limit: {
      label: "Set a limit",
      hint: "Replaces this allowance with an amount you choose. One transaction, one network fee.",
    },
    pause: {
      label: "Pause",
      hint: "Stops payments from this device right away. Nothing changes on-chain.",
    },
    resume: { label: "Resume" },
  },

  revoke: {
    title: "Revoke this permission?",
    allowance: "{spender} will not be able to move your {asset} once this transaction confirms.",
    operator:
      "{operator} will not be able to move items in {contract} once this transaction confirms.",
    payment:
      "{merchant} will not be able to take payments from this wallet once this transaction confirms.",
    fee: "You sign one transaction. It costs a network fee.",
    action: "Revoke it",
    cancel: "Keep it",
    working: "Waiting for Monad to confirm",
    done: "Revoked. It can no longer spend from this wallet.",
  },

  bulk: {
    title: "Clean up",
    selected: "{count} selected",
    /** Each line has its singular twin (labelOne, bodyOne) for a count of 1. */
    revokeSelected: {
      label: "Revoke {count} permissions",
      labelOne: "Revoke 1 permission",
      body: "This sends {count} transactions, one per permission. You sign each one, and each costs a network fee.",
      bodyOne: "This sends 1 transaction. You sign it, and it costs a network fee.",
    },
    unused: {
      label: "Revoke {count} unused permissions",
      labelOne: "Revoke 1 unused permission",
      body: "{count} permissions have not been used in 30 days.",
      bodyOne: "1 permission has not been used in 30 days.",
    },
    unlimited: {
      label: "Set limits on {count} allowances",
      labelOne: "Set a limit on 1 allowance",
      body: "{count} allowances have no limit. You choose a limit for each, then sign one transaction per allowance.",
      bodyOne: "1 allowance has no limit. You choose its limit, then sign one transaction.",
    },
    all: {
      label: "Revoke all {count}",
      labelOne: "Revoke the 1 permission",
      body: "Every site and agent loses access. This sends {count} transactions, one network fee each.",
      bodyOne: "The site or agent loses access. This sends 1 transaction with its network fee.",
    },
    progress: "Revoked {count} of {total}",
    export: { label: "Export as CSV", note: "Saved on this device." },
  },

  empty: {
    title: "Nothing can spend from this wallet",
    body: "When you grant an allowance or give an agent a cap, it appears here with a revoke button.",
  },

  emptyFiltered: {
    title: "No permissions match",
    body: "Clear the search or pick another filter.",
    action: { label: "Clear filters" },
  },

  errors: {
    load: {
      title: "The list did not load",
      body: "Baret could not read your permissions. Nothing was changed. Try again.",
      action: { label: "Try again" },
    },
    revoke: {
      title: "The revoke did not go through",
      body: "The transaction was not confirmed, so the permission is still active. Try again.",
      action: { label: "Try again" },
    },
    partial: {
      title: "{count} of {total} revoked",
      body: "The rest were declined or failed, so they are still active. They stay selected for another try.",
    },
  },

  help: {
    title: "Why this page exists",
    body: "Most wallets never show a permission again after you grant it. A forgotten allowance can be used months later, with no new signature from you. Here each one sits in a list with a revoke button.",
    exposure:
      "Exposure is the most a permission can take right now. An allowance with no limit counts as your whole balance of that token.",
  },
} as const;

export type OptionsAllowancesContent = typeof optionsAllowances;
