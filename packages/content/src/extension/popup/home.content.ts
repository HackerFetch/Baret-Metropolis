/** Extension popup, Home tab. 360 by 600, so every line has to earn its space. */

export const popupHome = {
  balance: { label: "Balance", usd: "Estimated in USD", unavailable: "Price unavailable" },

  quickActions: { send: "Send", receive: "Receive", swap: "Swap" },

  swapPlaceholder: {
    title: "Swap is not built yet",
    body: "Use a Monad exchange for now. Baret still checks the transaction when you sign it.",
    action: { label: "Open the showcase exchange", href: "/novaswap" },
  },

  tokens: {
    title: "Tokens",
    viewAll: "See all",
    empty: { title: "No tokens yet", body: "Anything sent to this address shows up here." },
  },

  activity: {
    title: "Recent",
    viewAll: "See all",
    empty: {
      title: "Nothing signed yet",
      body: "Connect to a site or send something to get started.",
    },
  },

  allowances: {
    title: "Standing permissions",
    viewAll: "Manage",
    empty: { title: "None yet", body: "Approvals you grant will appear here with a cap." },
    row: "{spent} of {cap} used {period}",
  },

  banners: {
    backup: {
      title: "Back up your recovery phrase",
      body: "It is the only way back in if you lose this device.",
      action: { label: "Back it up" },
    },
    noFunds: {
      title: "No MON for fees",
      body: "You need a small balance to pay network fees.",
      action: { label: "Get testnet MON" },
    },
    analyzerDown: {
      title: "Checks are not running",
      body: "Baret cannot reach the analysis server.",
      action: { label: "Try again" },
    },
    capNear: { title: "{origin} is near its cap", body: "{spent} of {cap} used this hour." },
    drift: {
      title: "Something moved",
      body: "A transfer left this account and you did not sign it.",
      action: { label: "Look at it" },
    },
  },

  tabs: { home: "Home", activity: "Activity", allowances: "Permissions", settings: "Settings" },
} as const;

export type PopupHomeContent = typeof popupHome;
