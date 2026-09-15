/**
 * Extension popup, Permissions tab. The visual heart of the product.
 *
 * "Allowance" is jargon. The tab is called Permissions and the copy says what
 * the permission lets someone do, in the present tense.
 */

export const allowances = {
  title: "Standing permissions",
  body: "Anything that can move money out of this wallet without asking you again.",

  summary: {
    active: "{count} active",
    spent: "{amount} spent in the last 24 hours",
    revokeAll: "Revoke everything",
  },

  card: {
    perTx: "Per payment",
    perHour: "This hour",
    perDay: "Today",
    calls: "{count} calls today",
    lastUsed: "Last used {time}",
    unlimited: "No limit",
    paused: "Paused",
    revoked: "Revoked",
    expires: "Expires {time}",
    actions: { pause: "Pause", resume: "Resume", revoke: "Revoke", edit: "Change the cap" },
  },

  pause: {
    title: "Pause {origin}",
    body: "It stops working immediately and nothing changes on-chain. You can switch it back on whenever you want.",
    action: "Pause it",
  },

  revoke: {
    title: "Revoke {origin}",
    body: "This sends a transaction that ends the permission on-chain. {origin} will not be able to move anything from this wallet again. It costs a network fee.",
    action: "Revoke it",
    cancel: "Keep it",
    working: "Revoking",
    done: "Revoked. It can no longer spend from this wallet.",
  },

  revokeAll: {
    title: "Revoke every permission",
    body: "This sends one transaction per permission, so it costs a fee for each. Every site and every agent loses access at once.",
    action: "Revoke all {count}",
    cancel: "Cancel",
  },

  add: {
    title: "Create a permission",
    body: "Set a cap before a site asks for one. Useful for an agent you are about to connect.",
    action: "Create it",
  },

  empty: {
    title: "Nothing can spend from this wallet",
    body: "When you approve a token or connect an agent, it shows up here with a cap, a clock and a revoke button.",
  },

  help: {
    title: "What a standing permission is",
    body: "It is a rule on the chain that lets someone move your tokens without asking you again. It does not expire on its own. This screen exists so you never have one you forgot about.",
  },
} as const;

export type AllowancesContent = typeof allowances;
