/**
 * Extension popup, the alerts view.
 *
 * An alert means something happened that the user did not cause. Every one of
 * them names what moved and offers the action that stops it happening again.
 */

export const alerts = {
  title: "Alerts",
  body: "Things that happened without you.",

  types: {
    drift: {
      title: "Something moved that you did not sign",
      body: "{amount} left this account at {time}. Baret did not sign it, so either another device did, or a standing permission was used.",
      actions: [
        { label: "Look at the transaction" },
        { label: "Revoke the permission that could have done this" },
        { label: "It was me" },
      ],
    },
    capHit: {
      title: "{origin} reached its cap",
      body: "It has spent {amount} in the last {period}. The next payment will not go through until the cap frees up.",
      actions: [{ label: "Raise the cap" }, { label: "Revoke it" }, { label: "Leave it" }],
    },
    capNear: {
      title: "{origin} is close to its cap",
      body: "{spent} of {cap} used {period}.",
      actions: [{ label: "Look at the payments" }, { label: "Leave it" }],
    },
    orphan: {
      title: "A payment was signed but never settled",
      body: "You paid {origin} {amount} at {time} and the merchant never confirmed it. Your money may be in limbo.",
      actions: [{ label: "Look at the payment" }, { label: "Block this merchant" }],
    },
    expiring: {
      title: "A permission is about to expire",
      body: "{origin} loses its permission {time}. Nothing breaks, it just stops working.",
      actions: [{ label: "Extend it" }, { label: "Let it expire" }],
    },
    unchecked: {
      title: "You signed without a check",
      body: "Baret could not reach the analysis server at {time} and you signed anyway.",
      actions: [{ label: "Check it now" }],
    },
  },

  actions: { markRead: "Mark as read", markAllRead: "Mark all as read", dismiss: "Dismiss" },

  empty: {
    title: "Nothing to report",
    body: "Baret watches this account. If something moves that you did not sign, it lands here and you get a notification.",
  },

  settings: {
    title: "What you get told about",
    rows: [
      { label: "Unsigned movement", hint: "Anything leaving the account that Baret did not sign." },
      { label: "Caps", hint: "When a site or agent reaches or approaches its limit." },
      { label: "Payments that never settle", hint: "Signed, sent, and never confirmed by the merchant." },
      { label: "Expiring permissions", hint: "A day before a permission stops working." },
    ],
  },
} as const;

export type AlertsContent = typeof alerts;
