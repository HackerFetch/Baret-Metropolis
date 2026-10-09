/**
 * apps/wallet, the main screen. Order: balance, quick actions, assets, recent
 * activity, open permissions, alerts, and one banner slot at the top.
 */

export const walletHome = {
  balance: {
    label: "Total balance",
    /** Under the MON figure: testnet tokens have no price, so no USD estimate is shown. */
    monNote:
      "Your MON on Monad testnet. Testnet tokens have no price, so there is no USD estimate.",
    unavailable: "Price unavailable",
    error: "Can't read your balance from Monad. Try again in a moment.",
    /** Live: before the first read answers. Never a zero in its place. */
    loading: "Reading your balance from Monad.",
  },

  /** Right after onboarding: the card a new wallet shows until the user hides it. */
  setup: {
    title: "Your wallet is ready",
    passkey: "This passkey is the only way in. Keep it: there is no phrase to fall back on.",
    fund: "Network fees are paid in testnet MON, which the Monad faucet gives away. Copy your address, then open the faucet.",
    watching: "Watching your address. MON from the faucet shows up here on its own.",
    rules: "Baret checks every request against the Balanced rules. You can change any rule later.",
    rulesAction: { label: "See your rules", href: "/policies" },
    dismiss: "Hide this",
  },

  actions: {
    send: "Send",
    receive: "Receive",
    agents: "Agents",
  },

  assets: {
    title: "Assets",
    columns: { asset: "Asset", balance: "Balance", value: "Value" },
    empty: {
      title: "No assets yet",
      body: "Add some testnet MON from the faucet and it shows up here.",
      action: { label: "Open the faucet" },
    },
  },

  activity: {
    title: "Recent activity",
    viewAll: { label: "See all activity", href: "/history" },
    empty: {
      title: "No activity yet",
      body: "Every verdict shows up here, including requests you declined.",
      action: { label: "Send MON", href: "/send" },
    },
  },

  /** Anything that can spend from this account without asking again. */
  permissions: {
    title: "Open permissions",
    body: "Everything that can spend from your account without asking you again.",
    summary: "{count} open",
    rows: {
      allowance: "{spender} can spend up to {amount} {asset}",
      unlimited: "{spender} can spend all of your {asset}",
      operator: "{operator} can move every item in {asset}",
      agent: "Your agent can pay {count} merchants from your vault",
      agentOne: "Your agent can pay {count} merchant from your vault",
      site: "{origin} is connected",
    },
    revoke: {
      label: "Revoke",
      note: "Revoking sends a transaction, so it costs a small network fee.",
    },
    /** Live: no revoke call exists on this page yet. */
    noteLive:
      "Your agent is managed on its own page. Token allowances you gave sites are not listed here yet.",
    disconnect: "Disconnect",
    manageAgent: { label: "Manage your agent", href: "/agents" },
    empty: {
      title: "No open permissions",
      body: "When you give a site an allowance or set up an agent, it shows up here with a revoke button.",
      /** Live: only the agent is listed, with a link to its page. */
      bodyLive: "When you set up an agent, it shows up here with a link to manage it.",
    },
  },

  alerts: {
    title: "Alerts",
    capNearly: "{merchant} has used {actual} of its {cap} daily cap.",
    unlimitedOpen:
      "{spender} can still spend all of your {asset}. Revoke it if you no longer use that site.",
    agentRevoked: "Your agent key was revoked. The vault now refuses its payments.",
    drift: "Something left your account that this wallet did not sign. Check your activity.",
    empty: "No alerts.",
  },

  /** One banner at a time, in this order of priority. */
  banners: {
    analyzerDown: "Can't reach Baret. Sign requests count as Blocked until it is back.",
    noFunds: "You have no MON yet, so you can't pay a network fee. Add some from the faucet.",
    testnet: "You are on Monad testnet. Nothing here has real value.",
  },
} as const;

export type WalletHomeContent = typeof walletHome;
