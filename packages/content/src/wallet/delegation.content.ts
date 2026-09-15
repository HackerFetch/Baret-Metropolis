/**
 * apps/wallet, the Agent Delegation page. The Mera sub-key demo.
 *
 * Research notes:
 *  - The clearest framing in the category is that a private key is not unsafe,
 *    it is unexpressive. It can only say yes to everything. Lead with that.
 *  - Revocation is an afterthought in every competitor. Here it is a section
 *    with its own heading and a button that is always visible.
 */

export const delegation = {
  title: "Agent delegation",
  body: "Give an agent a spending limit instead of a key. The limit lives in a contract on Monad, so a bug in the agent cannot talk its way around it.",

  explainer: {
    title: "Why not just give it a key?",
    body: "A key can only say yes to everything. There is no way to tell a key to allow payments up to ten dollars a day, to these merchants only. A vault can hold that sentence. A key cannot.",
  },

  /** The mental model, in the fewest possible words. */
  model: {
    title: "How it is arranged",
    rows: [
      { label: "Your passkey", value: "Full control. Deposit, withdraw, set limits, end it." },
      {
        label: "The agent key",
        value: "Can only call pay, inside the limits, to merchants you listed.",
      },
      { label: "The vault", value: "Holds the funds and enforces the limits on-chain." },
    ],
    note: "Your passkey is never used by the agent and never leaves this device.",
  },

  steps: {
    title: "Set it up",
    items: [
      {
        short: "Fund",
        title: "Put money in the vault",
        body: "Only what you are willing to lose in a bad week. You can withdraw the rest at any time.",
      },
      {
        short: "Limit",
        title: "Set the limits",
        body: "A ceiling per payment and a ceiling per day, for each merchant you allow.",
      },
      {
        short: "Derive",
        title: "Create the agent key",
        body: "Derived from your passkey with a different salt. It is a separate key that can only do one thing.",
      },
      {
        short: "Connect",
        title: "Give it to the agent",
        body: "The agent uses it to call pay. It cannot deposit, withdraw or change a limit.",
      },
    ],
  },

  vault: {
    title: "Vault",
    balance: "In the vault",
    deposit: "Deposit",
    withdraw: "Withdraw",
    empty: {
      title: "The vault is empty",
      body: "Deposit something to give an agent a budget. Nothing is spendable until you do.",
    },
    reserved: "{amount} is reserved by active limits and cannot be withdrawn until you lower them.",
  },

  merchants: {
    title: "Who the agent may pay",
    add: "Add a merchant",
    columns: {
      merchant: "Merchant",
      perPayment: "Per payment",
      perDay: "Per day",
      spent: "Spent today",
      status: "Status",
    },
    empty: {
      title: "No merchants yet",
      body: "An agent can only pay addresses on this list. Add one to get started.",
    },
    form: {
      address: { label: "Merchant address", hint: "The address that receives the payments." },
      perTx: { label: "Most per payment", hint: "A single payment above this reverts on-chain." },
      perDay: { label: "Most per day", hint: "A rolling 24 hours, not a calendar day." },
      expiry: {
        label: "Expires after",
        hint: "The limit stops working on its own. Leave empty for no expiry.",
      },
    },
  },

  agentKey: {
    title: "Agent key",
    none: {
      title: "No agent key yet",
      body: "Create one when you are ready to hand it over. Nothing can spend until you do.",
      action: { label: "Create the agent key" },
    },
    active: {
      title: "Active",
      body: "Created {date}. It has made {count} payments and spent {amount}.",
      address: "Agent address",
    },
    creating: "Confirm with your passkey to create the agent key.",
  },

  /** Its own section, deliberately. */
  revoke: {
    title: "Ending it",
    body: "One call kills the agent key on-chain. Any payment it tries afterwards reverts, including one it signed a second ago. You do not need the agent to cooperate and your funds do not move.",
    options: [
      { label: "Pause the vault", hint: "Stops everything, keeps the setup. Reversible." },
      {
        label: "Revoke the agent key",
        hint: "Kills the key permanently. You can create a new one.",
      },
      { label: "Set a merchant to zero", hint: "Stops one merchant without touching the rest." },
      { label: "Withdraw everything", hint: "Takes back what is left. The limits stay for later." },
    ],
    confirm: {
      title: "Revoke the agent key",
      body: "The agent will stop being able to pay immediately. Anything it has in flight will fail. Your funds stay in the vault.",
      action: "Revoke it",
      cancel: "Keep it running",
    },
    done: "Revoked. The key is dead on-chain.",
  },

  activity: {
    title: "What the agent has done",
    empty: {
      title: "No payments yet",
      body: "Every payment the agent makes appears here, with the merchant and the running total.",
    },
  },
} as const;

export type DelegationContent = typeof delegation;
