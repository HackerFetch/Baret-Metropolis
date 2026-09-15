/** Extension popup, Receive. */

export const popupReceive = {
  title: "Receive",
  address: { label: "Your address", copy: "Copy", copied: "Copied" },
  qrHint: "Scan with another wallet",
  warning: "Monad testnet only. Anything sent from another chain is lost.",
  faucet: { label: "Get testnet MON", hint: "Free, and worth nothing." },
} as const;

export type PopupReceiveContent = typeof popupReceive;
