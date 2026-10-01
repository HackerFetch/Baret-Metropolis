/** Extension popup, the Receive overlay. */

export const popupReceive = {
  title: "Receive",
  address: { label: "Your address", copy: "Copy address", copied: "Copied" },
  qrHint: "Scan with another wallet",
  warning: "Baret shows Monad testnet only. Funds sent on another network won't appear here.",
  faucet: { label: "Get testnet MON", hint: "Free, for testing. It has no value." },
} as const;

export type PopupReceiveContent = typeof popupReceive;
