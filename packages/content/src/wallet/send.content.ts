/** apps/wallet, the send form. */

export const send = {
  title: "Send",
  body: "Every transfer goes through the same check as anything else you sign.",

  fields: {
    asset: { label: "Asset", hint: "Pick what you are sending." },
    recipient: {
      label: "To",
      placeholder: "0x...",
      hint: "A Monad address. Check the last four characters as well as the first four.",
    },
    amount: {
      label: "Amount",
      max: "Send everything",
      available: "{amount} available",
      hint: "Some MON is kept back to pay the network fee.",
    },
    memo: { label: "Reference", optional: "Optional", hint: "Only you and the recipient see this." },
  },

  summary: {
    title: "Summary",
    amount: "Amount",
    fee: "Network fee",
    total: "Total",
    remaining: "Left after this",
  },

  action: { label: "Review" },

  errors: {
    invalidAddress: {
      title: "That is not a Monad address",
      body: "It should start with 0x and be 42 characters long.",
    },
    ownAddress: {
      title: "That is your own address",
      body: "Sending to yourself works, but it only costs you the fee.",
    },
    contractAddress: {
      title: "That address is a contract",
      body: "A plain transfer to a contract can be lost forever if the contract does not expect it.",
    },
    amountTooHigh: {
      title: "More than you have",
      body: "You have {available}, and the fee comes out of the same balance.",
    },
    noFee: {
      title: "Not enough for the fee",
      body: "Leave at least {fee} MON so the transfer can pay its way.",
    },
    amountZero: { title: "Enter an amount", body: "A transfer of zero does nothing and still costs a fee." },
  },

  poisoning: {
    title: "This address looks like one you used before",
    body: "It matches the first and last characters of {known} but it is a different address. This is how address poisoning works.",
    action: { label: "Use the one I used before" },
  },
} as const;

export type SendContent = typeof send;
