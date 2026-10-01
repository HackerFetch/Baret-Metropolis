/**
 * apps/wallet, agent delegation (route /agents). A PaymentGuard vault plus a
 * Mera sub-key that only the agent uses.
 *
 * Order: explanation, model, steps, vault, merchant list, agent key, revoke,
 * activity.
 *
 * Facts this copy is held to (docs/CONTRACTS.md section 2):
 *  - The vault enforces two caps per merchant on-chain: per payment and per
 *    rolling 24 hours. The contract has no hourly cap and no expiry, so this
 *    page offers neither.
 *  - The agent key can only call pay. A payment over a cap, to a merchant off
 *    the list, or from a revoked key reverts. Nothing asks the owner.
 *  - The contract has no pause. Setting a merchant's caps to zero is the pause.
 *  - A withdrawal cannot take what active merchants reserve.
 */

export const delegation = {
  title: "Agent delegation",
  body: "Give an agent a budget instead of your key. The caps live in a contract on Monad, so the agent can't talk its way past them.",

  explainer: {
    title: "Why not hand the agent your key?",
    body: "A key can only say yes to everything. A vault can say: this much, to these merchants, until you say stop.",
    points: [
      {
        title: "A budget",
        body: "It spends only what you put in the vault. Your wallet balance stays out of reach.",
      },
      {
        title: "A leash",
        body: "It pays only the merchants you list, and only up to their caps.",
      },
      {
        title: "A kill switch",
        body: "One revoke, and the vault refuses its key.",
      },
    ],
  },

  model: {
    title: "Who can do what",
    rows: [
      { label: "Your passkey", value: "Everything: deposit, withdraw, set caps, revoke." },
      {
        label: "The agent key",
        value: "One thing: pay merchants on your list, inside their caps.",
      },
      {
        label: "The vault",
        value: "PaymentGuard, a contract on Monad. It holds the budget and enforces the caps.",
      },
    ],
    subKey:
      "The agent key is a separate key that Mera derives from your passkey, for this vault only. The agent never sees your passkey.",
  },

  steps: {
    title: "Set it up",
    items: [
      {
        short: "Fund",
        title: "Put a budget in the vault",
        body: "Deposit only what you want the agent to be able to spend. You can withdraw what is not reserved.",
      },
      {
        short: "List",
        title: "Add merchants and their caps",
        body: "For each merchant, set the most per payment and the most per rolling 24 hours.",
      },
      {
        short: "Create",
        title: "Create the agent key",
        body: "Confirm with your passkey. Mera derives the key, and you register it with the vault.",
      },
      {
        short: "Hand over",
        title: "Give the key to your agent",
        body: "It uses the key to pay from the vault. It can't deposit, withdraw or change a cap.",
      },
    ],
  },

  vault: {
    title: "Vault",
    balance: "In the vault",
    reserved: "Reserved by active merchants",
    free: "Free to withdraw",
    deposit: { label: "Deposit" },
    withdraw: { label: "Withdraw" },
    reservedNote:
      "{amount} {asset} is reserved for your active merchants. Lower their caps or remove them to withdraw it.",
    empty: {
      title: "The vault is empty",
      body: "Deposit a budget to let an agent pay. Until then, it can't spend anything.",
      action: { label: "Deposit" },
    },
  },

  merchants: {
    title: "Merchants the agent may pay",
    add: "Add a merchant",
    columns: {
      merchant: "Merchant",
      perPayment: "Per payment",
      perDay: "Per 24 hours",
      spent: "Spent, last 24 hours",
      status: "Status",
    },
    status: {
      active: "Active",
      paused: "Paused, caps at zero",
      removed: "Removed",
    },
    empty: {
      title: "No merchants yet",
      body: "The agent can only pay merchants on this list. Add the first one.",
      action: { label: "Add a merchant" },
    },
    form: {
      address: { label: "Merchant address", hint: "The Monad address that receives the payments." },
      perPayment: { label: "Most per payment", hint: "A single payment above this reverts." },
      perDay: { label: "Most per 24 hours", hint: "A rolling 24 hours, not a calendar day." },
    },

    /** Shown before the first payment to a merchant is possible: the terms you sign. */
    mandate: {
      title: "What you are allowing",
      body: "Your agent can pay {merchant} from the vault, without asking you, up to these caps.",
      rows: {
        merchant: "Paid to",
        perPayment: "Most per payment",
        perDay: "Most per rolling 24 hours",
        from: "Paid from",
        fromValue: "Your vault, not your wallet",
        signer: "Signed by",
        signerValue: "Your agent key",
      },
      note: "You can lower a cap or remove {merchant} at any time.",
      action: { label: "Add the merchant" },
    },

    refuses: {
      title: "What the vault refuses",
      points: [
        "A payment to anyone who is not on this list.",
        "A payment above that merchant's cap per payment.",
        "A payment that takes the last 24 hours past the daily cap.",
        "Any payment from a revoked agent key.",
      ],
      note: "Both caps are hard limits. A payment over either one reverts, nothing is paid, and the agent can't ask for more.",
    },
  },

  agentKey: {
    title: "Agent key",
    none: {
      title: "No agent key yet",
      body: "Create one when the vault and your merchants are ready. Until then, nothing can pay from the vault.",
      action: { label: "Create the agent key" },
    },
    creating: "Confirm with your passkey. Mera derives the agent key from it.",
    registering: "Sign to register the agent key with your vault.",
    active: {
      title: "Active",
      body: "Created {date}. {count} payments so far.",
      address: "Agent address",
    },
    handover: {
      title: "Give it to your agent",
      body: "Put the key in your agent's configuration. Anyone holding it can pay your listed merchants up to their caps, and nothing else.",
      reveal: "Show the agent key",
      copy: "Copy the agent key",
      copied: "Copied. Paste it only into your agent.",
    },
    errors: {
      cancelled: {
        title: "No agent key yet",
        body: "You closed the passkey prompt, so nothing was created.",
        action: { label: "Try again" },
      },
    },
  },

  /** Its own section, deliberately. Stopping the agent never depends on the agent. */
  revoke: {
    title: "Stop the agent",
    body: "One transaction revokes the agent key on-chain. The agent does not have to cooperate, and your funds stay in the vault.",
    options: [
      {
        label: "Revoke the agent key",
        hint: "The vault refuses every payment from this key. Create a new key to start again.",
      },
      { label: "Pause a merchant", hint: "Sets its caps to zero. Raise them again to resume." },
      {
        label: "Remove a merchant",
        hint: "Takes one merchant off the list. The others keep working.",
      },
      { label: "Withdraw", hint: "Takes back whatever no active merchant reserves." },
    ],
    confirm: {
      title: "Revoke the agent key?",
      body: "It can't pay from the vault after this. A payment that lands after the revoke reverts, even one the agent already signed. Your funds stay in the vault.",
      action: "Revoke the agent key",
      cancel: "Keep it active",
    },
    done: "Revoked. The vault refuses this key from now on.",
  },

  activity: {
    title: "Agent payments",
    body: "Read from the vault's on-chain events, indexed by Envio.",
    row: "Paid {amount} {asset} to {merchant}",
    spent: "{actual} of {cap} in the last 24 hours",
    empty: {
      title: "No payments yet",
      body: "Every payment your agent makes from the vault shows up here, with the merchant and the running total.",
    },
  },

  errors: {
    vault: {
      title: "Can't reach your vault",
      body: "Monad did not answer, so nothing changed. Try again in a moment.",
      action: { label: "Try again" },
    },
    reverted: {
      title: "That did not go through",
      body: "The vault rejected the transaction, so nothing changed. Check the amount and try again.",
    },
    reserved: {
      title: "That amount is reserved",
      body: "Active merchants reserve {amount} {asset}. Lower their caps or remove them, then withdraw.",
    },
  },
} as const;

export type DelegationContent = typeof delegation;
