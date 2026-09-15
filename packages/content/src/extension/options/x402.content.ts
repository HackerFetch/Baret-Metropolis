/**
 * Extension options, the agent payments dashboard.
 *
 * The thing nobody else builds: a running total for a protocol that has none.
 * Every number here comes from the wallet's own ledger, not from a merchant.
 */

export const x402 = {
  title: "Agent payments",
  body: "Automatic payments made over HTTP 402, and the caps that stop them. x402 keeps no running total of its own, so this is the only place the total exists.",

  summary: {
    today: "Today",
    week: "This week",
    month: "This month",
    merchants: "Merchants with a cap",
    alerts: "Needs attention",
  },

  ticker: {
    title: "Last 7 days",
    body: "Each payment as it went through the three stages.",
    stages: { checked: "Checked", verified: "Verified", settled: "Settled" },
    empty: "No payments in the last week.",
  },

  merchants: {
    title: "By merchant",
    columns: {
      merchant: "Merchant",
      perTx: "Per payment",
      hourly: "Per hour",
      daily: "Per day",
      spent: "Spent today",
      status: "Status",
    },
    empty: {
      title: "No agent payments yet",
      body: "When a site asks for payment over HTTP 402, you approve it once and set a cap. After that it runs inside the cap.",
    },
  },

  facilitators: {
    title: "By facilitator",
    body: "The service that verifies and settles each payment. A facilitator you have not seen before is worth a look.",
    columns: { name: "Facilitator", payments: "Payments", volume: "Volume", trust: "Standing" },
    trust: { known: "Seen before", new: "New to you", blocked: "Blocked" },
  },

  problems: {
    title: "Needs attention",
    body: "Payments that did not finish cleanly.",
    types: {
      orphan: {
        title: "Signed but never settled",
        body: "You paid {origin} {amount} {time} and the merchant never confirmed it.",
      },
      noDelivery: {
        title: "Paid but nothing arrived",
        body: "The payment settled and the site never returned what you paid for.",
      },
      mismatch: {
        title: "Blocked for a mismatch",
        body: "The payment address did not match what {origin} asked for.",
      },
    },
    actions: { investigate: "Look at it", block: "Block this merchant", dismiss: "Dismiss" },
    empty: {
      title: "Nothing needs attention",
      body: "Every payment settled and every merchant delivered.",
    },
  },

  settings: {
    title: "Defaults for new merchants",
    body: "What a site gets the first time it asks, before you set a specific cap.",
    autoApprove: {
      label: "Pay without asking",
      hint: "Inside the cap. Turn this off to be asked every time.",
    },
    defaultCap: {
      label: "Starting cap",
      hint: "Per hour, for a merchant you have not met before.",
    },
    allowedAssets: {
      label: "Assets",
      hint: "Only the canonical USDC on Monad unless you add more.",
    },
  },
} as const;

export type X402Content = typeof x402;
