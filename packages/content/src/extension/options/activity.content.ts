/** Extension options, the full activity log with filters and export. */

export const optionsActivity = {
  title: "Activity",
  body: "Every signature, every refusal and every alert, kept on this device.",

  search: { placeholder: "Search by site, address or amount" },

  filters: {
    type: { label: "Type", all: "Everything" },
    verdict: { label: "Verdict", all: "Any verdict" },
    dateRange: { label: "Dates", all: "All time", today: "Today", week: "Last 7 days", month: "Last 30 days", custom: "Custom" },
    amount: { label: "Amount", min: "From", max: "To" },
    account: { label: "Account", all: "All accounts" },
  },

  columns: { time: "Time", type: "Type", site: "Site", amount: "Amount", verdict: "Verdict", status: "Status" },

  bulk: {
    recheck: {
      label: "Check these again with my current rules",
      body: "Runs your current rules against past transactions so you can see what would be blocked today. Nothing is sent and nothing changes on-chain.",
      working: "Checking {count} transactions",
      result: "{blocked} of {total} would be blocked under your current rules.",
    },
    export: { label: "Export as CSV", note: "The file stays on this device." },
  },

  empty: {
    title: "Nothing here yet",
    body: "Everything you sign lands here, and so does everything Baret refuses.",
  },
  emptyFiltered: { title: "Nothing matches", body: "Widen the dates or clear the filters." },
} as const;

export type OptionsActivityContent = typeof optionsActivity;
