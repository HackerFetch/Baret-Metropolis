/**
 * Extension popup, the Send overlay. The compact form.
 *
 * Field errors, the own-address and contract-address checks and the
 * address-poisoning warning come from wallet/send, so this file holds only
 * what the popup adds. "Review" opens the full sign request: a transfer from
 * the popup goes through the same check as anything a site asks you to sign.
 */

export const popupSend = {
  title: "Send",
  fields: {
    asset: { label: "Asset" },
    recipient: { label: "To", placeholder: "0x..." },
    amount: { label: "Amount", max: "Max", available: "{amount} {asset} available" },
  },
  summary: { fee: "Network fee", total: "Total", remaining: "Left after" },
  action: { label: "Review" },
  reviewNote: "Baret checks this on the next screen. Nothing is signed until you confirm.",
  scanning: "Checking the address",

  /** The recipient is the contract of the token being sent. */
  tokenContract: {
    title: "That's a token contract",
    body: "This is the {asset} contract, not a wallet. Tokens sent to it are usually lost for good.",
    action: { label: "Change address" },
  },

  empty: {
    title: "Nothing to send yet",
    body: "Add MON to this wallet first. Testnet MON is free.",
    action: { label: "Receive" },
  },
} as const;

export type PopupSendContent = typeof popupSend;
