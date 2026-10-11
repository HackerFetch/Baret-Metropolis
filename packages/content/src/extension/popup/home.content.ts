/**
 * Extension popup, Home tab. 360 by 600, so every line has to earn its space.
 *
 * The popup has no routes. Anything that leaves it (the showcase, the faucet,
 * an options page) is wired by the app, so no action here carries an href.
 * {origin} is the site that holds the caps, {merchant} is who receives a
 * payment. {amount} is a number and {asset} its token. {cap} and {actual}
 * (spent so far) arrive with their unit.
 */

export const popupHome = {
  /** Labels for the icon buttons in the top strip. */
  header: {
    accounts: "Switch account",
    alerts: "Alerts, {count} new",
    settings: "Settings",
  },

  balance: { label: "Balance", usd: "Estimated in USD", unavailable: "USD price unavailable" },

  quickActions: { send: "Send", receive: "Receive", swap: "Swap" },

  swapPlaceholder: {
    title: "Swap isn't built yet",
    body: "Use any Monad exchange for now. Baret checks the swap before you sign it.",
    action: { label: "Open the showcase" },
  },

  tokens: {
    title: "Tokens",
    viewAll: "See all",
    empty: {
      title: "No tokens yet",
      body: "Tokens sent to this address show up here.",
      action: { label: "Receive" },
    },
  },

  activity: {
    title: "Recent activity",
    viewAll: "See all",
    empty: {
      title: "No activity yet",
      body: "Send MON or connect to a site. Every verdict shows up here.",
    },
  },

  /** The two busiest allowances, each with a small meter. */
  allowances: {
    title: "Allowances",
    viewAll: "Manage",
    summary: "{count} active",
    nearCap: "{count} near a cap",
    row: { hour: "{actual} of {cap} this hour", day: "{actual} of {cap} today", noCap: "No cap" },
    empty: {
      title: "No allowances yet",
      body: "Anything that can spend from this wallet shows up here with its cap.",
    },
  },

  /** One banner at a time, in this order of priority. */
  banners: {
    drift: {
      title: "Funds moved without you",
      body: "{amount} {asset} left this wallet and Baret didn't sign it.",
      action: { label: "See what moved" },
    },
    unreachable: {
      title: "Can't reach Baret",
      body: "Until checks run again, every transaction is treated as Blocked.",
      action: { label: "Try again" },
    },
    revoked: {
      title: "{origin} was revoked",
      body: "It can't sign payments from this wallet anymore.",
      action: { label: "Open Allowances" },
    },
    unsettled: {
      title: "A payment hasn't settled",
      body: "You signed a payment to {merchant}, and it never settled.",
      action: { label: "Review it" },
    },
    capNear: {
      title: "{origin} is near its cap",
      body: "{actual} of {cap} used this hour.",
      action: { label: "Review it" },
    },
    rpcDown: {
      title: "Monad isn't answering",
      body: "Balances and activity may be out of date.",
      action: { label: "Try again" },
    },
    backup: {
      title: "Back up your wallet",
      body: "If this browser profile is lost, the wallet goes with it.",
      action: { label: "Back up now" },
    },
    noFunds: {
      title: "No MON for fees",
      body: "Every transaction pays a small fee in MON. Testnet MON is free.",
      action: { label: "Get testnet MON" },
    },
  },

  errors: {
    balances: {
      title: "Balances didn't load",
      body: "Monad didn't answer. What you see may be out of date.",
      action: { label: "Try again" },
    },
  },

  tabs: { home: "Home", activity: "Activity", allowances: "Allowances", settings: "Settings" },
} as const;

export type PopupHomeContent = typeof popupHome;
