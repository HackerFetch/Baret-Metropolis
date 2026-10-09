/**
 * apps/wallet, the send form. Order: fields, summary, the send action, errors,
 * then the address-poisoning warning. Pressing the action opens the sign
 * request, so a transfer gets the same check as anything a site asks for.
 */

export const send = {
  title: "Send",
  body: "Baret checks every transfer before you sign it, the same way it checks a site's request.",

  fields: {
    asset: { label: "Asset", hint: "What you are sending." },
    recipient: {
      label: "To",
      placeholder: "0x...",
      hint: "A Monad address. Compare the first and the last four characters with the one you expect.",
    },
    amount: {
      label: "Amount",
      max: "Max",
      available: "{amount} {asset} available",
      hint: "A little MON stays back to pay the network fee.",
    },
  },

  summary: {
    title: "Summary",
    to: "To",
    amount: "Amount",
    fee: "Network fee",
    total: "Total",
    remaining: "Left after this",
    /** Live: the fee is read from the chain on the sign request, not guessed here. */
    feeLater: "Shown before you sign",
    totalPlusFee: "{amount} plus the network fee",
  },

  action: {
    label: "Check and review",
    note: "Baret checks the transfer first. Nothing is signed until you confirm on the next screen.",
  },

  errors: {
    /** No assets: an empty account has nothing to send. */
    noAssets: {
      title: "Nothing to send yet",
      body: "This account holds no assets. Add some testnet MON from the faucet, then come back.",
    },
    /** Fail-closed: balances that did not load leave nothing to check against. */
    balance: {
      title: "Can't read your balance",
      body: "Monad did not answer, so Baret can't check what you can send. Try again in a moment.",
    },
    invalidAddress: {
      title: "That is not a Monad address",
      body: "It should start with 0x and be 42 characters long.",
    },
    ownAddress: {
      title: "That is your own address",
      body: "Sending to yourself changes nothing except the fee you pay.",
    },
    tokenContract: {
      title: "That is the {asset} token contract",
      body: "It is not a wallet. Tokens sent to a token contract are usually stuck there for good.",
    },
    contractAddress: {
      title: "That address is a contract",
      body: "A contract that does not expect a plain transfer can strand what you send. Baret checks it on the next screen.",
    },
    amountTooHigh: {
      title: "Not enough {asset}",
      body: "You need {amount} more. The network fee is paid in MON on top.",
    },
    noFee: {
      title: "Not enough MON for the fee",
      body: "Keep at least {amount} MON so the transfer can pay its fee.",
    },
    amountZero: {
      title: "Enter an amount",
      body: "A transfer of zero moves nothing and still costs a fee.",
    },
  },

  /** A look-alike of an address from your history. Shown before the review. */
  poisoning: {
    title: "This looks like an address you used before",
    body: "It shares the first and last characters with {expected}, but the middle is different. Scammers plant look-alikes in your history so you copy the wrong one.",
    action: { label: "Use the address I used before" },
    keep: { label: "Keep this address" },
  },
} as const;

export type SendContent = typeof send;
