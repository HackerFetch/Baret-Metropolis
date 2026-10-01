/**
 * Extension popup, Allowances tab. The visual heart of the product.
 *
 * Two kinds of card share this screen (docs/WALLET.md 1.2 and 2.3):
 *  - a token allowance: a contract that can spend one of your tokens
 *  - agent payments: a site that pays over x402, with per-payment, hourly
 *    and daily caps
 * Only payment cards can be paused. Pausing happens inside Baret, and a token
 * allowance lives in the token contract, where Baret cannot freeze it.
 *
 * {origin} is the site that holds the caps. {amount} is a number and {asset}
 * its token. {cap} and {actual} (spent so far) arrive with their unit.
 */

export const allowances = {
  title: "Allowances",
  body: "Everything that can spend from this wallet without asking you again.",

  summary: {
    active: "{count} active",
    spent: "{actual} spent in 24 hours",
    nearCap: "{count} near a cap",
    revokeAll: "Revoke all",
    add: "Set caps in advance",
  },

  card: {
    kinds: { token: "Token allowance", payment: "Agent payments" },
    token: {
      limited: "Can spend up to {amount} {asset}",
      unlimited: "Can spend all your {asset}",
      noPause: "A token allowance can't be paused. Revoke it to stop it.",
    },
    meters: {
      perPayment: "Per payment",
      hour: "This hour",
      day: "Today",
      value: "{actual} of {cap}",
    },
    payments: "{count} payments today",
    lastUsed: "Last used",
    neverUsed: "Not used yet",
    noCap: "No cap",
    status: {
      active: "Active",
      paused: "Paused",
      revoked: "Revoked",
      nearCap: "Near cap",
      capReached: "Cap reached",
    },
    actions: { pause: "Pause", resume: "Resume", revoke: "Revoke", edit: "Edit caps" },
  },

  pause: {
    done: "Paused. {origin} can't pay from this wallet until you resume it.",
    note: "Pausing happens on this device. Nothing changes on-chain.",
    resumed: "Resumed. {origin} can pay again, inside its caps.",
  },

  revoke: {
    title: "Revoke this allowance?",
    payment: "{origin} can't sign payments after this.",
    token: "{spender} can't spend your {asset} after this.",
    how: "Revoking is a transaction. You review and sign it next, like any other request.",
    action: "Revoke",
    cancel: "Keep it",
    working: "Revoking",
    done: "Revoked. It can't spend from this wallet anymore.",
  },

  revokeAll: {
    title: "Revoke all {count}?",
    body: "Every site and agent loses access. Each revoke is its own transaction with its own fee.",
    action: "Revoke all",
    cancel: "Cancel",
  },

  /** Advanced: caps for an agent or site before it first asks to pay. */
  add: {
    title: "Set caps in advance",
    body: "Give an agent or site its caps before it asks to pay.",
    fields: {
      origin: { label: "Site", placeholder: "https://" },
      asset: { label: "Token" },
      perPayment: { label: "Per payment" },
      hour: { label: "Per hour" },
      day: { label: "Per day" },
    },
    action: "Save caps",
    errors: {
      origin: "Enter the full site address, starting with https://.",
      order: "The hourly cap can't be higher than the daily cap.",
    },
  },

  /** What a paying site is told when Baret refuses a payment. */
  declines: {
    paused: "{origin} is paused. Resume it in Allowances to continue.",
    revoked: "{origin} was revoked and can't pay from this wallet.",
    overCap: "This payment is over a cap you set for {origin}.",
  },

  empty: {
    title: "No allowances yet",
    body: "Approve a token or pay a site, and it appears here with its cap and a revoke button.",
  },

  help: {
    title: "What an allowance is",
    body: "Permission for a contract or site to spend from this wallet without asking again. It lasts until you revoke it.",
    caps: "The caps are the firewall. Anything over a cap stops and asks you first.",
  },

  errors: {
    load: {
      title: "Allowances didn't load",
      body: "Monad didn't answer, so caps and spending may be out of date.",
      action: { label: "Try again" },
    },
    revoke: {
      title: "The revoke didn't go through",
      body: "The allowance is still active. Check you have MON for the fee, then try again.",
      action: { label: "Try again" },
    },
  },
} as const;

export type AllowancesContent = typeof allowances;
