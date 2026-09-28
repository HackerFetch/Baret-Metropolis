/**
 * Extension popup, the connect phase.
 *
 * The title, the remember option, the actions, the warnings and the results
 * come from wallet/connect. This file holds what exists because this is an
 * extension: the account picker, the note for people with several wallets
 * installed, and the already-connected state.
 *
 * `can` and `cannot` replace the wallet's lists of the same shape, because
 * this account has a passphrase and a recovery phrase, not a passkey, and the
 * site sees only the account picked here. `cannot` renders crossed out.
 */

export const popupConnect = {
  accountPicker: {
    title: "Choose an account",
    body: "{origin} sees only the account you pick.",
    selected: "Selected",
  },

  multipleWallets: {
    title: "More than one wallet",
    body: "This request came to Baret. Your other wallets weren't asked.",
  },

  alreadyConnected: {
    title: "Already connected",
    body: "{origin} can already see one of your accounts. Switch it or disconnect.",
    actions: { switchAccount: "Switch account", disconnect: "Disconnect" },
  },

  can: {
    title: "This site will be able to",
    points: [
      "See the address of the account you pick",
      "See its balance and activity, which are public on Monad",
      "Send you sign requests, which Baret checks first",
    ],
  },

  cannot: {
    title: "It will not be able to",
    points: [
      "Move funds without your signature",
      "See your passphrase or recovery phrase",
      "Sign anything for you",
    ],
  },

  windowNote: "Closing this window counts as declining.",
} as const;

export type PopupConnectContent = typeof popupConnect;
