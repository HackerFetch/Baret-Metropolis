/**
 * apps/wallet, the sign request. The same copy renders in the extension popup
 * and in the mockup on the landing page, so this is the single most-read
 * screen in the product.
 *
 * Research notes:
 *  - The best line in the whole category is MetaMask's honesty about
 *    simulation: "This is just a prediction, not a guarantee." Ours is in
 *    `changes.disclaimer` and it is never hidden behind a tooltip.
 *  - Say the consequence, not the category. "If this is a scam, your funds
 *    can't be recovered" beats any risk score.
 *  - An override has to cost something. A countdown and a typed confirmation
 *    are the two patterns that work. We use a press and hold.
 */

export const sign = {
  header: {
    title: "Sign request",
    fromSite: "from {origin}",
    unknownSite: "from a site you have not connected before",
  },

  /** The verb-and-object line. One per primary action the decoder can name. */
  actions: {
    nativeTransfer: "Send {amount} to {to}",
    tokenTransfer: "Send {amount} {asset} to {to}",
    approval: "Let {spender} spend your {asset}",
    approvalUnlimited: "Let {spender} spend all of your {asset}",
    operatorGrant: "Let {spender} move your {collection}",
    permit: "Sign an approval for {spender}",
    contractCall: "Call {method} on {contract}",
    contractDeploy: "Deploy a new contract",
    ownershipTransfer: "Hand over control of {contract}",
    payment: "Pay {amount} {asset} to {origin}",
    unknown: "Sign a transaction",
  },

  /** What the analysis found. The verdict words live in shared/common. */
  verdict: {
    checking: "Checking this transaction",
    safeNote: "Nothing here breaks a rule you set.",
    cautionNote: "Allowed, and there is something you should know.",
    blockedNote: "Stopped by: {rule}",
    unreachableNote: "Baret could not reach the analysis server.",
    ruleLink: "See the rule",
  },

  changes: {
    title: "What changes",
    out: "You send",
    in: "You receive",
    approve: "You approve",
    cap: "Spending cap",
    revoke: "You revoke",
    fee: "Network fee",
    none: "Nothing moves out of your wallet.",
    unknown: "Baret could not work out what changes. Treat that as a reason to stop.",
    disclaimer:
      "This is what the chain says would happen if you signed right now. It is a prediction, not a guarantee.",
  },

  findings: {
    title: "Findings",
    count: "{count} found",
    none: "No findings.",
    expand: "Why this matters",
  },

  policyHits: {
    title: "Rules that fired",
    none: "No rules fired.",
    edit: "Edit this rule",
    current: "Your limit is {limit}. This transaction is {actual}.",
  },

  raw: {
    title: "Raw transaction",
    hint: "The exact bytes the site asked you to sign. Nothing is hidden here.",
    decoded: "Decoded call",
    calldata: "Calldata",
    copy: "Copy the calldata",
  },

  timer: {
    label: "Declines automatically in {time}",
    expired: "This request expired and was declined. Nothing was signed.",
  },

  footer: {
    decline: "Decline",
    sign: "Sign and send",
    signBlocked: "Blocked",
    signing: "Signing",
    sending: "Sending",
  },

  /** The override. It should feel like effort, because it is a real decision. */
  override: {
    prompt: "Sign anyway",
    hold: "Press and hold to override",
    holding: "Keep holding",
    confirm: {
      title: "You are overriding your own rule",
      body: "The rule that fired is {rule}. If this turns out to be a scam, nothing can be undone and nothing can be recovered.",
      acknowledge: "I understand and want to sign anyway",
      action: "Sign anyway",
      cancel: "Take me back",
    },
    logged: "Overrides are written to your activity log so you can find them later.",
  },

  offline: {
    title: "Baret could not check this",
    body: "The analysis server did not answer, so nothing was decoded or simulated. You can wait and try again, or sign without a check.",
    retry: "Check again",
    proceed: "Sign without a check",
    note: "Signing without a check is marked in your activity log.",
  },

  results: {
    sent: {
      title: "Sent",
      body: "Confirmed in block {block}.",
      action: { label: "View on the explorer" },
    },
    declined: {
      title: "Declined",
      body: "Nothing was signed and nothing was sent.",
    },
    failed: {
      title: "It did not go through",
      body: "The network rejected the transaction. Your balance is unchanged apart from the fee.",
    },
  },
} as const;

export type SignContent = typeof sign;
