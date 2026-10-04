/**
 * Extension popup, the alerts phase.
 *
 * An alert is a post-sign notice: something changed after a signature, or
 * without one. Findings on a sign request are not alerts. Each alert names
 * what changed and offers one action; `actions` holds the controls every
 * alert shares.
 *
 * {origin} is the site that holds the caps, {merchant} is who received a
 * payment. {amount} is a number and {asset} its token. {cap} and {actual}
 * (spent so far) arrive with their unit.
 */

export const alerts = {
  title: "Alerts",
  body: "What Baret noticed after you signed.",

  types: {
    drift: {
      title: "Funds moved without you",
      body: "{amount} {asset} left this wallet. Baret didn't sign it.",
      action: { label: "See what moved" },
    },
    newAllowance: {
      title: "New allowance found",
      body: "{spender} can now spend your {asset}. Baret has no record of you approving it.",
      action: { label: "Revoke it" },
    },
    watched: {
      title: "Watched address moved funds",
      body: "{amount} {asset} left an address you watch.",
      action: { label: "See the transfer" },
    },
    capReached: {
      title: "{origin} reached its cap",
      body: "Its payments stop until the cap frees up or you raise it.",
      action: { label: "Edit caps" },
    },
    capNear: {
      title: "{origin} is near its cap",
      body: "{actual} of {cap} used in the last hour.",
      action: { label: "Review it" },
    },
    revoked: {
      title: "{origin} was revoked",
      body: "It can't sign payments from this wallet anymore.",
      action: { label: "Open Allowances" },
    },
    unsettled: {
      title: "Payment never settled",
      body: "You signed a payment of {amount} {asset} to {merchant}, and it never settled.",
      action: { label: "Review it" },
    },
    unchecked: {
      title: "Signed without a check",
      body: "You signed this while Baret was unreachable. Run the check now.",
      action: { label: "Check it now" },
    },
  },

  actions: { markAllRead: "Mark all read", dismiss: "Dismiss" },
  /** Read out before an alert that has not been seen yet. */
  unread: "New",

  empty: {
    title: "No alerts",
    body: "Baret keeps watching this wallet after you sign. If funds or allowances change without you, it shows up here.",
  },

  errors: {
    load: {
      title: "Alerts didn't load",
      body: "Close the popup and open it again.",
    },
  },

  settings: { label: "Choose alerts", hint: "Pick what Baret tells you about." },
} as const;

export type AlertsContent = typeof alerts;
