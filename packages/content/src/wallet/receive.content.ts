/**
 * apps/wallet, the receive screen. Order: address and QR, network, faucet,
 * then the line that watches for incoming transfers.
 */

export const receive = {
  title: "Receive",
  body: "Share this address to get paid on Monad. It tells people where to send, and gives no one access to your funds.",

  address: {
    label: "Your address",
    copy: "Copy the address",
    copied: "Copied",
    qrHint: "Scan with another Monad wallet.",
    tokens: "MON and tokens on Monad arrive at this same address.",
  },

  network: {
    title: "Monad testnet only",
    body: "Send to this address on Monad testnet only. Funds sent on any other network won't show up here.",
  },

  faucet: {
    title: "Need testnet MON?",
    body: "The Monad faucet gives it away for testing. It has no value.",
    action: { label: "Open the faucet" },
  },

  watching: {
    idle: "Watching for incoming transfers",
    received: "{amount} {asset} arrived.",
  },

  errors: {
    copy: {
      title: "Copy didn't work",
      body: "Your browser blocked the clipboard. Select the address and copy it by hand.",
    },
    watching: {
      title: "Can't watch for transfers right now",
      body: "Monad did not answer. Anything sent still arrives, and your balance updates when you reload.",
    },
  },
} as const;

export type ReceiveContent = typeof receive;
