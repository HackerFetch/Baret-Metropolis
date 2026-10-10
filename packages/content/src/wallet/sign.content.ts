/**
 * apps/wallet, the sign request. The body of this screen also renders in the
 * extension popup and in the landing page hero, so it is the most-read copy in
 * the product. Keep it surface-neutral: no routes here, and nothing that only
 * makes sense with a passkey except the keys marked wallet-only.
 *
 * Order on screen: header, the site's claim, verdict, impact, what changes,
 * findings, rules broken, raw data, countdown, override. The offline panel
 * explains a Can't reach Baret verdict. The result replaces the whole screen.
 *
 * Rules this file keeps:
 *  - Safe is a label, not a promise. Every verdict says what was checked.
 *  - Blocked has no sign button. The only way past it is the override: press
 *    and hold, then written to the activity log.
 *  - Can't reach Baret counts as Blocked, whatever the rules say. Same
 *    override, same log. There is no one-click way to sign without a check.
 *  - What the site says about itself is its claim. What changes is the check.
 *    The screen never mixes the two.
 *
 * Placeholders follow the shared vocabulary: {origin} the site, {recipient}
 * who receives, {spender} who may spend, {operator} an NFT operator,
 * {contract}, {merchant}, {amount}, {asset}, {cap}, {limit} the rule's
 * threshold, {actual} the observed value, {rule} the rule's label, {count},
 * {seconds}. {block} is the block number of a confirmed transaction.
 */

export const sign = {
  header: {
    title: "Sign request",
    fromSite: "from {origin}",
    originNote: "The site address as your browser reports it.",
  },

  /** The verb-and-object line under the header. One per action Baret can name. */
  actions: {
    transfer: "Send {amount} {asset} to {recipient}",
    approval: "Let {spender} spend up to {amount} {asset}",
    approvalUnlimited: "Let {spender} spend all of your {asset}",
    operatorGrant: "Let {operator} move every item in {asset}",
    permit: "Sign a spending permission for {spender}",
    revoke: "Revoke the allowance {spender} holds on your {asset}",
    ownershipTransfer: "Hand over control of {contract}",
    contractCall: "Use {contract}",
    contractDeploy: "Deploy a new contract",
    payment: "Pay {amount} {asset} to {merchant}",
    vaultDeposit: "Deposit {amount} {asset} into your vault",
    vaultWithdraw: "Withdraw {amount} {asset} from your vault",
    vaultCaps: "Set the caps for {merchant} in your vault",
    vaultRemoveMerchant: "Remove {merchant} from your vault",
    vaultAgentKey: "Let {agent} pay from your vault",
    vaultRevokeAgent: "Revoke your agent key",
    vaultCreate: "Open your vault",
    vaultApproval: "Let your vault take {amount} {asset} from your account",
    vaultPauseMerchant: "Pause payments to {merchant}",
    vaultResumeMerchant: "Resume payments to {merchant}",
    unknown: "Sign a transaction Baret could not name",
  },

  /** What the site says about this request. Shown, never trusted. */
  claim: {
    label: "{origin} says",
    tag: "The site's claim. Not checked.",
    note: "What changes below comes from the simulation. If the two disagree, go with What changes.",
  },

  /** The verdict block. The tag word itself lives in shared/common. */
  verdict: {
    checking: {
      title: "Checking this request",
      body: "Simulating it on Monad and running it past your rules.",
    },
    safe: {
      title: "Nothing here breaks your rules",
      summary: "Simulated on Monad and checked against your rules. Nothing turned up.",
      primary: "Sign and send",
      secondary: "Decline",
    },
    caution: {
      title: "Allowed, with something to read first",
      summary: "No rule stopped this, but a check found something. Read it before you sign.",
      primary: "Sign and send",
      secondary: "Decline",
    },
    blocked: {
      title: "Blocked by your rules",
      summary: "{rule} stopped this request. Nothing was signed.",
      summaryMany: "{rule} and {count} more rules stopped this request. Nothing was signed.",
      summaryManyOne: "{rule} and {count} more rule stopped this request. Nothing was signed.",
      /** A block with no rule to name, such as a failed check that counts as Blocked. */
      summaryNoRule: "A check stopped this request. Nothing was signed.",
      primary: "Decline",
      secondary: "Override this block",
      noSign: "There is no sign button on a blocked request.",
      /** Live: the wallet has no override; the way past is the rule itself. */
      noOverride:
        "This wallet does not sign a blocked request. If you trust it, change the rule and check again.",
      editRule: "Change the rule",
      /** One suggested fix per block, from the server's suggestions. */
      fix: {
        title: "Suggested fix",
        boundedAllowance: "Allow only {amount} {asset}, the amount this request needs.",
        singleItem: "Allow the one item this needs, not the whole collection.",
        lowerAmount: "Send less. Your rule allows up to {limit}.",
        keepFloor: "Send less, so you keep at least {limit} after this.",
        fallback: "Decline, then ask the site for a request that fits your rules.",
      },
    },
    unreachable: {
      title: "Can't reach Baret",
      summary: "Signing stays locked until a check runs.",
      primary: "Check again",
      secondary: "Decline",
      override: "Override",
    },

    /** Where the check ran. One row, always visible. */
    checkedBy: {
      label: "Checked by",
      value: "Baret server",
      detail: "Simulated over Alchemy RPC on Monad. Your key signs on this device only.",
      sources: {
        reputation: "Reputation from Nansen and threat reports from Chainlink CRE",
        compliance: "Identity rules from Cleanverse",
      },
      /**
       * Live: one line per source the server reports as ok, so a skipped
       * source is never claimed. The static list above stays for the sample.
       */
      live: {
        nansen: "Wallet reputation from Nansen",
        registry: "Threat reports from Chainlink CRE",
        cleanverse: "Identity rules from Cleanverse",
      },
      unavailable: "{source}: could not be reached this time",
    },
    ruleLink: "See the rule",
  },

  /** One sentence under the verdict: what actually moves if you sign. */
  impact: {
    label: "If you sign",
    transfer: "{amount} {asset} leaves your wallet for {recipient}.",
    approval: "{spender} can take up to {amount} {asset} at any time, until you revoke it.",
    approvalUnlimited:
      "{spender} can take all of your {asset}, now and later, until you revoke it.",
    operatorGrant: "{operator} can move every item in {asset}, now and later, until you revoke it.",
    permit: "{spender} can spend your {asset}, and nothing shows in your history until they do.",
    revoke: "{spender} can no longer spend your {asset}.",
    ownershipTransfer: "Someone else gets control of {contract}.",
    payment: "{amount} {asset} goes to {merchant}.",
    vaultApproval:
      "Your vault may take up to {amount} {asset} from your account. The next step moves it.",
    vaultDeposit: "{amount} {asset} moves from your account into your vault.",
    vaultWithdraw: "{amount} {asset} comes back from your vault to your account.",
    /** A site's call: Baret simulated it, so what moves is in "What changes". */
    contractCall: "This runs a call on {contract}. What changes is listed below.",
    nothing: "Nothing leaves your wallet.",
    unknown: "Baret could not tell what moves. Treat that as a reason to stop.",
  },

  changes: {
    title: "What changes",
    out: "You send",
    in: "You receive",
    allow: "You allow",
    revoke: "You revoke",
    fee: "Network fee",
    unlimited: "Unlimited",
    none: "Nothing leaves your wallet.",
    unknown: "Baret could not work out what changes. Treat that as a reason to stop.",
    disclaimer:
      "Simulated against Monad as it is right now. If the chain changes before this lands, the result can differ.",
  },

  /** Titles and explanations per finding code live in shared/findings. */
  findings: {
    title: "Findings",
    count: "{count} found",
    none: "No findings.",
    more: "{count} more",
    why: "Why it matters",
    batched: "Inside a batched call",
    severity: { low: "Low", medium: "Medium", high: "High", critical: "Critical" },
  },

  /** The rules this request breaks. Labels come from shared/policy. */
  rules: {
    title: "Rules this breaks",
    none: "No rule broken.",
    row: "Requested {actual}. Your rule allows {limit}.",
    unchecked: "{rule} could not be checked, so it counts as broken.",
    edit: "Change this rule",
  },

  raw: {
    title: "Raw data",
    hint: "The exact request the site sent. Nothing is left out.",
    /** The wallet's own request (a send, a vault change): no site sent it. */
    hintOwn: "The exact request this wallet built. Nothing is left out.",
    decoded: "Decoded call",
    notDecoded: "Baret could not decode this call.",
    to: "To",
    value: "Value",
    calldata: "Calldata",
    copy: "Copy the calldata",
    copied: "Copied",
  },

  countdown: {
    label: "Declines on its own in {seconds} seconds",
    labelOne: "Declines on its own in {seconds} second",
    note: "When time runs out, the request is declined and nothing is signed.",
    /** Live: how long Baret's answer stays good, before it must be checked again. */
    fresh: "This check is good for {seconds} more seconds",
    freshOne: "This check is good for {seconds} more second",
  },

  /** Live: Baret's answer ran out. Signing waits for a fresh check. */
  stale: {
    title: "Check again before you sign",
    body: "Baret's answer is out of date, and the chain may have changed. Nothing was signed.",
    action: "Check again",
  },

  /** Live: inside an unlocked session, signing asks for no passkey. */
  session: {
    note: "No passkey prompt: your session runs until {time}.",
  },

  /**
   * The only way past Blocked or Can't reach Baret. A separate, deliberate
   * step: press and hold, then written to the activity log.
   */
  override: {
    blocked: {
      title: "Sign against your rule",
      body: "{rule} stays on. Only this request goes through, exactly as it is. Once it is sent, it can't be undone.",
      bodyNoRule:
        "Your rules stay on. Only this request goes through, exactly as it is. Once it is sent, it can't be undone.",
    },
    unreachable: {
      title: "Sign while Baret is unreachable",
      body: "Nothing about this request was simulated or checked. If you sign, it goes out unchecked and can't be undone.",
    },
    hold: "Press and hold to sign",
    /** Read by screen readers with the button. 1.5 s is HoldButton's HOLD_MS. */
    holdHint:
      "Hold Space or Enter, or keep pressing, for 1.5 seconds. Letting go early signs nothing.",
    holding: "Keep holding",
    released: "You let go. Nothing was signed.",
    back: "Back",
    logged: "Every override goes into your activity log, with the rule it went past.",
  },

  /** Why the verdict is Can't reach Baret, and what the reader can do. */
  offline: {
    title: "Can't reach Baret",
    body: "No check ran, so this request is treated as Blocked.",
    reasons: {
      server: "The Baret server was busy or did not answer.",
      simulation: "The simulation could not run on Monad.",
      data: "Data one of your rules needs was missing.",
    },
    retry: "Check again",
    retrying: "Checking again",
    stillDown: "Still no answer. Try again in a moment, or decline.",
    note: "No rule changes this. A request that was not checked counts as Blocked.",
  },

  status: {
    signing: "Signing",
    sending: "Sending",
    /** Signing or sending failed; the request goes back to the decision. */
    failed: "It was not sent. Nothing was signed.",
    /** Sending failed after the transaction left: it may have gone through. */
    unknown: "It may have been sent. Check your activity before you try again.",
    /** Standalone wallet only. The extension signs with its unlocked key. */
    passkey: "Confirm with your passkey",
    passkeyCancelled: "The passkey was not given, so nothing was signed.",
  },

  result: {
    sent: {
      title: "Sent",
      body: "Confirmed in block {block}.",
      action: { label: "View on the explorer" },
    },
    signed: {
      title: "Signed",
      body: "The site has your signature.",
    },
    overridden: {
      title: "Sent with an override",
      body: "Confirmed in block {block}. The override is in your activity log.",
    },
    declined: {
      title: "Declined",
      body: "Nothing was signed. The site was told you said no.",
    },
    expired: {
      title: "Expired",
      body: "Time ran out, so the request was declined. Nothing was signed.",
    },
    reverted: {
      title: "It reverted",
      body: "The network ran it and it failed. Nothing moved except the network fee.",
    },
    rejected: {
      title: "Not sent",
      body: "The network did not accept it. Nothing moved and no fee was paid.",
    },
  },
} as const;

export type SignContent = typeof sign;
