/**
 * Extension popup, Send. The compact form.
 * Field-level errors and the address-poisoning warning are shared with the
 * wallet, so this file only holds what the popup shows differently.
 */

export const popupSend = {
  title: "Send",
  fields: {
    asset: { label: "Asset" },
    recipient: { label: "To", placeholder: "0x..." },
    amount: { label: "Amount", max: "Max", available: "{amount} available" },
  },
  summary: { fee: "Fee", total: "Total", remaining: "Left after" },
  action: { label: "Review" },
  reviewNote: "Baret checks it on the next screen, before anything is signed.",
  scanning: "Checking the address",
} as const;

export type PopupSendContent = typeof popupSend;
