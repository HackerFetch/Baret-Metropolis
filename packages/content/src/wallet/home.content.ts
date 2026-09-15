/** apps/wallet, the main screen. */

export const walletHome = {
  balance: {
    label: "Total balance",
    subLabel: "Estimated in USD",
    unavailable: "Price unavailable",
  },

  actions: {
    send: "Send",
    receive: "Receive",
    delegate: "Agents",
  },

  holdings: {
    title: "Holdings",
    empty: {
      title: "Nothing here yet",
      body: "Add some testnet MON from the faucet and it will show up here.",
      action: { label: "Open the faucet" },
    },
    columns: { asset: "Asset", balance: "Balance", value: "Value" },
  },

  activity: {
    title: "Recent activity",
    viewAll: "See everything",
    empty: {
      title: "You have not signed anything yet",
      body: "Every signature lands here, including the ones Baret refused.",
    },
  },

  allowances: {
    title: "Standing permissions",
    viewAll: "Manage",
    empty: {
      title: "No site can spend on your behalf",
      body: "When you approve a token or an agent, it becomes a row here with a cap and a revoke button.",
    },
    summary: "{count} active, {spent} spent in the last 24 hours",
  },

  alerts: {
    capNearly: "{origin} has used {percent} of its daily cap.",
    drift: "Something moved that you did not sign.",
    revoked: "{origin} was revoked and can no longer sign.",
    pendingSettlement: "A payment to {origin} was signed but has not settled yet.",
  },

  banners: {
    testnet: "You are on Monad testnet. Nothing here has real value.",
    noFunds: "You have no MON, so you cannot pay a network fee yet.",
    analyzerDown: "Baret cannot reach the analysis server, so transactions are not being checked.",
  },
} as const;

export type WalletHomeContent = typeof walletHome;
