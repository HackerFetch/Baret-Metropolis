/**
 * Extension popup, the connection approval.
 *
 * The body of this screen is shared with the wallet (wallet/connect). This
 * file holds the extension-only parts: the account picker and the wallet
 * picker note for people who have several wallets installed.
 */

export const popupConnect = {
  accountPicker: {
    title: "Connect with",
    body: "Pick which account this site sees. It never sees the others.",
    selected: "Selected",
  },

  multipleWallets: {
    title: "You have more than one wallet installed",
    body: "This site asked Baret. Your other wallets were not told about this request.",
  },

  alreadyConnected: {
    title: "Already connected",
    body: "{origin} is connected with {account}. You can switch accounts or disconnect from Sites.",
    action: { label: "Manage this site" },
  },

  permissions: {
    title: "What you are granting",
    read: "Read your address and public balance",
    request: "Ask you to sign things, which you can always refuse",
  },

  windowNote: "Closing this window counts as rejecting.",
} as const;

export type PopupConnectContent = typeof popupConnect;
