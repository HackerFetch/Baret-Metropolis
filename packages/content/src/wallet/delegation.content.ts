/**
 * apps/wallet, agent delegation (route /agents). A PaymentGuard vault plus a
 * Mera sub-key that only the agent uses.
 *
 * Order: explanation, model, steps, vault, merchant list, agent key, revoke,
 * activity.
 *
 * Facts this copy is held to (docs/CONTRACTS.md section 2, D-013):
 *  - The vault enforces caps per merchant on-chain: per payment, per rolling
 *    24 hours, and per rolling hour when one is set (0 means no hourly cap).
 *    The contract has no expiry, so this page offers none.
 *  - The agent key can only call pay. A payment over a cap, to a merchant off
 *    the list, to a paused merchant, or from a revoked key reverts. Nothing
 *    asks the owner.
 *  - Pausing a merchant is real (setMerchantPaused) and keeps its caps.
 *  - The reserve is the sum of the daily caps of every merchant not removed,
 *    paused ones included. A withdrawal cannot take it.
 */

export const delegation = {
  title: "Agent delegation",
  body: "Give an agent a budget instead of your key. The caps live in a contract on Monad, so the agent can't talk its way past them.",

  /**
   * Live: a change runs as one or more transactions, each its own sign
   * request at the top of the page. One change at a time.
   */
  flow: {
    label: "Change in progress",
    preparing: "Getting the transaction ready. Nothing is signed until you say so.",
    step: "Step {current} of {total}",
    next: "Continue to step {next}",
    stopped:
      "You stopped before the last step. What you already sent stays done, and nothing else changes.",
    busy: "Finish or stop the change above first.",
    /** Beside Try again when a step cannot be built: ends the change here. */
    stop: "Stop here",
  },

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
      { label: "Your passkey", value: "Everything: deposit, withdraw, set caps, pause, revoke." },
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
        body: "For each merchant, set the most per payment and per rolling 24 hours, and an hourly cap if you want one.",
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
    reserved: "Reserved by your merchants",
    free: "Free to withdraw",
    deposit: { label: "Deposit" },
    withdraw: { label: "Withdraw" },
    /** The amount field that deposit and withdraw share. */
    amount: { label: "Amount" },
    reservedNote:
      "{amount} {asset} is reserved for the merchants on your list, paused ones included. Lower their daily caps or remove them to withdraw it.",
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
      perHour: "Per hour",
      perDay: "Per 24 hours",
      spent: "Spent, last 24 hours",
      status: "Status",
    },
    status: {
      active: "Active",
      paused: "Paused",
      removed: "Removed",
    },
    /** The verbs on each merchant's row. */
    actions: { pause: "Pause", resume: "Resume", remove: "Remove" },
    empty: {
      title: "No merchants yet",
      body: "The agent can only pay merchants on this list. Add the first one.",
      action: { label: "Add a merchant" },
    },
    form: {
      address: { label: "Merchant address", hint: "The Monad address that receives the payments." },
      perPayment: { label: "Most per payment", hint: "A single payment above this reverts." },
      perHour: { label: "Most per hour", hint: "Optional. Leave it empty for no hourly limit." },
      perDay: { label: "Most per 24 hours", hint: "A rolling 24 hours, not a calendar day." },
      /** Live: a name kept on this device only; the contract stores none. */
      origin: { label: "Name", hint: "Optional. Only you see it, on this device." },
    },

    /** Shown before the first payment to a merchant is possible: the terms you sign. */
    mandate: {
      title: "What you are allowing",
      body: "Your agent can pay {merchant} from the vault, without asking you, up to these caps.",
      rows: {
        merchant: "Paid to",
        perPayment: "Most per payment",
        perHour: "Most per rolling hour",
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
        "A payment that takes the last hour past the hourly cap, when you set one.",
        "A payment that takes the last 24 hours past the daily cap.",
        "A payment to a merchant you paused.",
        "Any payment from a revoked agent key.",
      ],
      note: "Every cap is a hard limit. A payment over any of them reverts, nothing is paid, and the agent can't ask for more.",
    },
  },

  agentKey: {
    title: "Agent key",
    none: {
      title: "No agent key yet",
      body: "Create one when the vault and your merchants are ready. Until then, nothing can pay from the vault.",
      action: { label: "Create the agent key" },
      /** Live: the way to authorise an agent wallet made elsewhere. */
      or: "Or use an agent wallet you already have",
    },
    /** Live: an outside agent address, registered without its key ever being here. */
    external: {
      label: "Agent address",
      hint: "The address of an agent wallet, such as one made with Dynamic. Its key stays with the agent.",
      action: { label: "Authorise this address" },
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
      /** Live: an outside agent's key was never here, so there is none to show. */
      external:
        "This agent holds its own key, so there is nothing to show here. It can pay only your listed merchants, up to their caps.",
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
      {
        label: "Pause a merchant",
        hint: "Stops its payments and keeps its caps. Resume it at any time.",
      },
      {
        label: "Remove a merchant",
        hint: "Takes one merchant off the list. The others keep working.",
      },
      { label: "Withdraw", hint: "Takes back whatever your merchants do not reserve." },
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
    /** A deposit above what the account holds, or a balance that did not load. */
    balance: {
      title: "Not enough in your account",
      body: "Your account holds less {asset} than that, or its balance did not load. Nothing was deposited.",
    },
    /** A withdrawal above what the vault holds, or a balance that did not load. */
    vaultBalance: {
      title: "Not enough in your vault",
      body: "Your vault holds less {asset} than that, or its balance did not load. Nothing was withdrawn.",
    },
    reserved: {
      title: "That amount is reserved",
      body: "Your merchants reserve {amount} {asset}. Lower their daily caps or remove them, then withdraw.",
    },
  },
} as const;

export type DelegationContent = typeof delegation;
