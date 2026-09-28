/**
 * Extension popup, Activity tab. The compact log.
 *
 * A row is two lines (docs/WALLET.md 2.2): the site or counterparty in bold,
 * then the `rows` line and the time, muted. A row expands in place into the
 * `detail` block. {amount} is a number and {asset} its token.
 */

export const popupActivity = {
  title: "Activity",

  filters: [
    { id: "all", label: "All" },
    { id: "sent", label: "Sent" },
    { id: "received", label: "Received" },
    { id: "sites", label: "Sites" },
    { id: "payments", label: "Payments" },
    { id: "alerts", label: "Alerts" },
  ],

  groups: { today: "Today", yesterday: "Yesterday", earlier: "Earlier" },

  rows: {
    sent: "Sent {amount} {asset}",
    received: "Received {amount} {asset}",
    payment: "Paid {amount} {asset}",
    message: "Signed a message",
    typedData: "Signed data",
    allowance: "Allowance for {asset}",
    revoke: "Revoked an allowance",
    connect: "Connected",
    alert: "Alert",
  },

  status: {
    pending: "Sending",
    confirmed: "Confirmed",
    failed: "Failed",
    blocked: "Blocked",
    declined: "Declined",
    expired: "Expired",
    overridden: "Signed anyway",
    unchecked: "Signed unchecked",
  },

  detail: {
    verdict: "Verdict",
    rule: "Rule: {rule}",
    findings: "Findings",
    changes: "What changed",
    fee: "Network fee",
    hash: "Transaction hash",
    overridden: "You signed this after a Blocked verdict.",
    unchecked: "You signed this while Baret couldn't check it.",
    explorer: "Open in explorer",
    openFull: "Open full log",
  },

  empty: {
    title: "No activity yet",
    body: "Every verdict lands here, including the ones you declined. Send MON or connect to a site to start.",
  },

  emptyFiltered: {
    title: "Nothing in this filter",
    body: "The rest of your activity is still here.",
    action: { label: "Clear filter" },
  },

  errors: {
    load: {
      title: "Activity didn't load",
      body: "The log on this device didn't open. Close the popup and open it again.",
    },
    incoming: {
      title: "Monad isn't answering",
      body: "Incoming transfers may be missing until it does.",
      action: { label: "Try again" },
    },
  },
} as const;

export type PopupActivityContent = typeof popupActivity;
