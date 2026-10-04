/**
 * Extension options, Payments. Automatic payments that sites and agents ask
 * for over x402, and the caps that hold them. "Payments" in the UI, "x402" as
 * the secondary label.
 *
 * x402 keeps no running total, so the totals here exist nowhere else. Every
 * number comes from the wallet's own ledger, not from a merchant. Cap labels
 * and hints live in shared/policy; this page shows spending against them.
 */

export const x402 = {
  title: "Payments",
  tag: "x402",
  lead: "Payments that sites and agents ask for over x402, checked against your caps before anything is sent.",

  wedge: {
    title: "x402 forgets every payment. Baret keeps count.",
    body: "Each x402 request stands alone, so nothing in the protocol adds up what you have paid. Baret keeps that running total. Your caps do the rest: anything over one stops and asks you first.",
  },

  summary: {
    today: "Spent today",
    week: "This week",
    month: "This month",
    merchants: "Merchants with caps",
    declined: "Declined",
    attention: "Needs a look",
  },

  ticker: {
    title: "Live payments",
    body: "Each payment as it moves through three stages, over the last 7 days.",
    live: "Live",
    stages: {
      checked: { label: "Checked", hint: "Baret checked it against your rules and caps." },
      verified: { label: "Verified", hint: "The facilitator confirmed the payment signature." },
      settled: { label: "Settled", hint: "The payment landed on Monad." },
    },
    /** One payment in the timeline, read out in place of its squares. */
    row: "{amount} to {merchant}, {stage}",
    empty: "No payments in the last 7 days.",
  },

  merchants: {
    title: "Merchants",
    body: "Every site you let take payments, its caps and what it has spent against them.",
    columns: {
      merchant: "Merchant",
      perPayment: "Per payment",
      hourly: "Per hour",
      daily: "Per day",
      spent: "Spent",
      status: "Status",
    },
    spent: "{spent} of {cap}",
    status: { active: "Active", paused: "Paused", revoked: "Revoked" },
    actions: { pause: "Pause", resume: "Resume", caps: "Change caps", revoke: "Revoke" },
    /** The Change caps dialog. Its title is actions.caps. */
    capsDialog: {
      body: "Baret checks every payment {merchant} asks for against these caps.",
      /** The on-chain fact, from PaymentGuard setMerchantCap. Owner to confirm. */
      onchain:
        "Saving sends one transaction to your PaymentGuard vault. You sign it and pay a network fee. The new caps apply once it lands on Monad.",
      hourHint: "Leave it empty for no hourly cap.",
      action: "Sign and save caps",
      saved: "Caps saved for {merchant}.",
      errors: {
        amount: "Enter an amount above 0, such as 0.50.",
        order: "The hourly cap can't be higher than the daily cap.",
        dayBelowPayment: "The daily cap can't be lower than the per-payment cap.",
        hourBelowPayment: "The hourly cap can't be lower than the per-payment cap.",
      },
    },
    /** Under the Pause and Resume buttons, from PaymentGuard setMerchantPaused. Owner to confirm. */
    pauseHint:
      "Pause and Resume each send one transaction to your PaymentGuard vault and cost a network fee. Caps and history stay.",
    firstPayment: "The first payment to a new merchant always asks you.",
    empty: {
      title: "No merchants yet",
      body: "The first time a site asks for an x402 payment, you approve it once and set its caps. It shows up here after that.",
      action: { label: "Try SCRYBE in the showcase" },
    },
  },

  facilitators: {
    title: "Facilitators",
    body: "The services that verify and settle each payment for the merchant. Your caps apply whichever one a merchant uses.",
    columns: {
      name: "Facilitator",
      payments: "Payments",
      volume: "Volume",
      standing: "Standing",
    },
    standing: { known: "Used before", new: "New to you" },
    newHint: "You have not paid through this facilitator before. It is worth a look.",
    empty: "No facilitators yet. One appears with your first payment.",
  },

  problems: {
    title: "Needs a look",
    body: "Payments Baret declined, with the rule that fired, and payments that never settled.",
    types: {
      declined: {
        title: "Declined by a rule",
        body: "{merchant} asked for {amount}. {rule} stopped it. Nothing was sent.",
      },
      overCap: {
        title: "Over a cap",
        body: "{merchant} asked for {amount}, which goes over {rule} ({cap}). Nothing was sent.",
      },
      mismatch: {
        title: "Wrong payee",
        body: "{merchant} asked to be paid at {expected}, but the payment would have gone to {actual}. Nothing was sent.",
      },
      asset: {
        title: "Wrong token",
        body: "{merchant} asked for {asset} from a contract that is not on your list. Nothing was sent.",
      },
      unsettled: {
        title: "Signed, not settled",
        body: "You authorized {amount} to {merchant}, and it has not landed on Monad.",
      },
    },
    actions: { details: "See details", pause: "Pause this merchant", dismiss: "Dismiss" },
    empty: {
      title: "Nothing needs a look",
      body: "No payment was declined, and every payment settled.",
    },
  },

  receipts: {
    title: "Settlement receipts",
    body: "Proof that each payment landed on Monad.",
    columns: {
      time: "Time",
      merchant: "Merchant",
      amount: "Amount",
      facilitator: "Facilitator",
      transaction: "Transaction",
    },
    explorer: "View on the explorer",
    empty: "No settled payments yet.",
  },

  settings: {
    title: "Payment settings",
    body: "How Baret handles a payment request before you set anything for that merchant.",
    autoApprove: {
      label: "Pay within caps without asking",
      hint: "Every payment is still checked first. Turn this off to approve each one yourself.",
    },
    caps: {
      label: "Caps and allowed tokens",
      hint: "Your rules set the highest caps a merchant can get. Each merchant's own caps live in your PaymentGuard vault.",
      action: { label: "Edit them in Rules", href: "/rules" },
    },
  },

  errors: {
    load: {
      title: "Payment history did not load",
      body: "Reload the page. Nothing was changed.",
      action: { label: "Reload" },
    },
    save: {
      title: "That change did not save",
      body: "The merchant keeps its previous caps. Try again.",
      action: { label: "Try again" },
    },
  },
} as const;

export type X402Content = typeof x402;
