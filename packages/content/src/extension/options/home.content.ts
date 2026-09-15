/** Extension options, the dashboard. The full-width version of the popup home. */

export const optionsHome = {
  title: "Overview",

  balance: { label: "Total balance", usd: "Estimated in USD" },

  holdings: {
    title: "Holdings",
    columns: { asset: "Asset", balance: "Balance", value: "Value", contract: "Contract" },
    empty: { title: "Nothing here yet", body: "Tokens sent to this address appear here." },
  },

  watched: {
    title: "Standing permissions",
    body: "Live caps for every site and agent that can spend from this wallet.",
    viewAll: "Manage them",
    empty: { title: "Nothing can spend from this wallet", body: "Approvals you grant show up here with a cap." },
  },

  sites: {
    title: "Connected sites",
    viewAll: "Manage them",
    empty: { title: "No sites connected", body: "Sites you connect to appear here and can be disconnected at any time." },
    row: "Connected {time}, last used {lastUsed}",
  },

  recent: { title: "Recent activity", viewAll: "See everything" },

  health: {
    title: "Wallet health",
    items: [
      { label: "Recovery phrase", ok: "Backed up", bad: "Not backed up yet" },
      { label: "Permissions with no limit", ok: "None", bad: "{count} with no limit" },
      { label: "Unused permissions", ok: "None", bad: "{count} unused for over 30 days" },
      { label: "Rule set", ok: "{template}", bad: "Not set" },
    ],
    action: { label: "Fix this" },
  },
} as const;

export type OptionsHomeContent = typeof optionsHome;
