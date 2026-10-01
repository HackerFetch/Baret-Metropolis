/**
 * Extension options, Activity. The full log of every verdict Baret gave, with
 * search, filters, a bulk re-check and export. It lives on this device.
 *
 * Verdict labels come from shared/common. This file holds the outcome labels,
 * which say what happened after the verdict.
 */

export const optionsActivity = {
  title: "Activity",
  lead: "Every verdict Baret gave, with the reason behind it. The requests you declined are here too.",
  storage: "Kept on this device only.",

  search: { placeholder: "Search by site, address, amount or rule" },

  filters: {
    type: {
      label: "Type",
      all: "Everything",
      options: {
        sent: "Sent",
        received: "Received",
        requests: "Site requests",
        payments: "Payments",
        alerts: "Alerts",
      },
    },
    verdict: { label: "Verdict", all: "Any verdict" },
    outcome: {
      label: "Outcome",
      all: "Any outcome",
      options: {
        signed: "Signed",
        declined: "Declined",
        blocked: "Blocked",
        signedAnyway: "Signed anyway",
        expired: "Expired",
      },
    },
    dateRange: {
      label: "Dates",
      all: "All time",
      today: "Today",
      week: "Last 7 days",
      month: "Last 30 days",
      custom: "Custom range",
    },
    amount: { label: "Amount", min: "From", max: "To" },
    account: { label: "Account", all: "All accounts" },
    clear: "Clear filters",
  },

  columns: {
    time: "Time",
    type: "Type",
    site: "Site",
    amount: "Amount",
    verdict: "Verdict",
    reason: "Reason",
    outcome: "Outcome",
  },

  detail: {
    title: "Request details",
    verdict: "Verdict",
    reason: "Why",
    findings: "Findings",
    rules: "Rules that fired",
    changes: "What changed",
    fee: "Network fee",
    hash: "Transaction",
    explorer: "Open in the explorer",
    notSent: "Not sent. Nothing changed on-chain.",
    signedAnyway: "You signed this despite the verdict. Baret logged the override.",
  },

  bulk: {
    selected: "{count} selected",
    recheck: {
      label: "Check again with my current rules",
      body: "Runs your current rules over {count} past requests to show the verdict each would get today. Nothing is signed and nothing changes on-chain.",
      working: "Checking {count} requests",
      result: "{count} of {total} would be blocked under your current rules.",
    },
    export: {
      label: "Export {count} as CSV",
      all: "Export everything as CSV",
      note: "The file is saved on this device. Nothing is uploaded.",
    },
  },

  empty: {
    title: "No activity yet",
    body: "Every verdict lands here, including the ones you declined. Connect to a Monad site to see the first one.",
  },

  emptyFiltered: {
    title: "Nothing matches these filters",
    body: "Widen the dates or clear a filter.",
    action: { label: "Clear filters" },
  },

  errors: {
    load: {
      title: "The log did not load",
      body: "Baret could not read the activity stored on this device. Reload the page.",
      action: { label: "Reload" },
    },
    recheck: {
      title: "The re-check did not run",
      body: "Can't reach Baret. Your log is unchanged. Try again when it answers.",
      action: { label: "Try again" },
    },
    export: {
      title: "The file was not saved",
      body: "The CSV could not be saved. Check your browser's download settings and try again.",
      action: { label: "Try again" },
    },
  },
} as const;

export type OptionsActivityContent = typeof optionsActivity;
