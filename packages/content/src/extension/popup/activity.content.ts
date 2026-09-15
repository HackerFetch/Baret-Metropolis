/** Extension popup, Activity tab. The compact log. */

export const popupActivity = {
  title: "Activity",
  filters: [
    { id: "all", label: "All" },
    { id: "sent", label: "Sent" },
    { id: "received", label: "In" },
    { id: "sites", label: "Sites" },
    { id: "payments", label: "Paid" },
    { id: "alerts", label: "Alerts" },
  ],

  groups: { today: "Today", yesterday: "Yesterday", earlier: "Earlier" },

  status: {
    pending: "Sending",
    confirmed: "Confirmed",
    failed: "Failed",
    blocked: "Blocked",
    declined: "Declined",
    overridden: "Signed anyway",
    unchecked: "Not checked",
  },

  detail: {
    verdict: "Verdict",
    findings: "Findings",
    changes: "What changed",
    fee: "Fee",
    hash: "Transaction",
    explorer: "Open in the explorer",
    openFull: "See the full record",
  },

  empty: {
    title: "Nothing here yet",
    body: "Everything you sign lands here, and so does everything Baret refuses.",
  },

  emptyFiltered: { title: "Nothing matches", body: "Clear the filter to see everything." },
} as const;

export type PopupActivityContent = typeof popupActivity;
