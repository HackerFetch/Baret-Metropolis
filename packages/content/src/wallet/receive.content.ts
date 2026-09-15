/** apps/wallet, the receive screen. */

export const receive = {
  title: "Receive",
  body: "Share this address to get paid. It is safe to share and it never changes.",

  address: {
    label: "Your address",
    copy: "Copy the address",
    copied: "Copied",
    qrHint: "Scan this with another wallet.",
  },

  network: {
    title: "Monad testnet only",
    body: "This address only works on Monad. Anything sent from another chain is lost and cannot be recovered.",
  },

  faucet: {
    title: "Need testnet MON?",
    body: "The faucet sends you some for free. It has no value and exists for testing.",
    action: { label: "Open the faucet" },
  },

  watching: {
    idle: "Watching for incoming transfers",
    received: "{amount} arrived.",
  },
} as const;

export type ReceiveContent = typeof receive;
