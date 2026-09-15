/**
 * One entry per field in GuardPolicy, plus the three starting templates.
 *
 * Rendered by the wallet policy editor, the extension options page and the
 * onboarding step where you pick a template. The keys match the policy schema
 * in @baret/guard exactly. If a field is added there, add it here in the same
 * commit or the editor will show a blank row.
 */

export const policy = {
  intro: {
    title: "Your rules",
    body: "A policy is a list of rules Baret checks before it signs. You own it. Baret only runs it.",
    note: "Changing a rule takes effect on the next transaction. Nothing is applied retroactively.",
  },

  templates: {
    strict: {
      name: "Strict",
      body: "For an account that holds more than you want to lose. Blocks anything unusual and asks you to decide.",
      highlights: [
        "Blocks every token approval, even a capped one",
        "Blocks any contract Baret has not seen before",
        "Stops if you would lose more than 25 percent",
      ],
    },
    balanced: {
      name: "Balanced",
      body: "The default. Blocks the attacks that drain wallets, and stays out of the way for normal use.",
      highlights: [
        "Blocks unlimited approvals and operator grants",
        "Blocks known malicious addresses",
        "Warns on unknown contracts instead of blocking",
      ],
    },
    permissive: {
      name: "Permissive",
      body: "For a test account you do not mind losing. Baret still explains everything, it just blocks less.",
      highlights: [
        "Blocks only critical findings",
        "Allows capped approvals without asking",
        "Higher spending caps for agents",
      ],
    },
    footnote: "You can start from a template and change any single rule afterwards.",
  },

  groups: {
    simulation: {
      title: "Simulation",
      body: "What to do when Baret cannot fully check a transaction.",
    },
    contracts: { title: "Contracts", body: "Which contracts you are willing to touch." },
    approvals: { title: "Approvals", body: "How much a site is allowed to spend on your behalf." },
    dangerous: {
      title: "Dangerous calls",
      body: "Operations that can hand over control of an account or a contract.",
    },
    limits: { title: "Loss limits", body: "The most a single transaction may cost you." },
    reputation: {
      title: "Reputation",
      body: "What Baret does with what it knows about the other address.",
    },
    compliance: {
      title: "Compliance",
      body: "Rules for assets that require a verified identity to move.",
    },
    resources: { title: "Fees", body: "Ceilings on what a transaction may spend on gas." },
    x402: { title: "Agent payments", body: "Caps for automatic payments made over HTTP 402." },
    general: {
      title: "General",
      body: "How Baret treats findings that are warnings rather than blocks.",
    },
  },

  fields: {
    requireSuccessfulSimulation: {
      label: "Block transactions that would fail",
      hint: "A transaction that reverts still costs a fee and gives you nothing.",
    },
    blockRiskyContracts: {
      label: "Block known risky contracts",
      hint: "Contracts reported for draining wallets or for rug pulls.",
    },
    blockUnknownContractExposure: {
      label: "Block unknown contracts",
      hint: "A contract nobody has verified and that Baret has never seen. Strict only.",
    },
    blockUnlimitedApprovals: {
      label: "Block unlimited approvals",
      hint: "An unlimited approval lets a site move that token out of your wallet forever, with no second signature.",
    },
    blockSetApprovalForAll: {
      label: "Block operator grants on collections",
      hint: "One signature that hands over every item in a collection, including the ones you buy later.",
    },
    blockPermit: {
      label: "Block off-chain approval signatures",
      hint: "A permit signature is an approval that never appears as a transaction. It looks harmless and is not.",
    },
    blockSelfdestruct: {
      label: "Block self-destructing contracts",
      hint: "A contract that deletes itself in the same call can take your funds with it.",
    },
    blockDelegatecall: {
      label: "Block delegated code execution",
      hint: "Lets another contract run code as if it were this one. Common in upgrades, and in attacks.",
    },
    blockOwnershipTransfer: {
      label: "Block ownership transfers",
      hint: "Hands administrative control of a contract to someone else.",
    },
    maxLossPercent: {
      label: "Largest loss you accept",
      hint: "Baret compares your balance before and after. Above this share of it, the transaction is blocked.",
      unit: "percent of balance",
    },
    minPostNativeBalance: {
      label: "Keep at least this much MON",
      hint: "Leaves enough to pay fees so you never strand the account.",
      unit: "MON",
    },
    minPostUsdcBalance: {
      label: "Keep at least this much USDC",
      hint: "Same idea, for the stablecoin you actually spend.",
      unit: "USDC",
    },
    blockKnownMalicious: {
      label: "Block reported addresses",
      hint: "Addresses in the on-chain reputation registry or flagged by Nansen.",
    },
    minNansenTrustLevel: {
      label: "Minimum counterparty standing",
      hint: "Blocks payments to wallets that were created days ago and have no history.",
    },
    requireComplianceCheck: {
      label: "Require a verified identity",
      hint: "For assets that only move between verified accounts. Both sides are checked.",
    },
    allowedCountries: {
      label: "Allowed countries",
      hint: "Leave empty to allow every country the asset itself allows.",
    },
    minComplianceTier: {
      label: "Minimum verification level",
      hint: "Some assets require a higher level of identity check than others.",
    },
    maxGas: {
      label: "Fee ceiling",
      hint: "Blocks a transaction that asks for far more gas than the simulation needed.",
      unit: "MON",
    },
    requireMemo: {
      label: "Require a payment reference",
      hint: "A payment with no reference is hard to match to an invoice later.",
    },
    maxPerTxCap: {
      label: "Most per payment",
      hint: "The largest single automatic payment an agent may make.",
      unit: "USDC",
    },
    maxHourlyCap: {
      label: "Most per hour",
      hint: "A rolling hour, not a clock hour. It moves with every payment.",
      unit: "USDC",
    },
    maxDailyCap: {
      label: "Most per day",
      hint: "A rolling 24 hours. When it is full the next payment is blocked until it frees up.",
      unit: "USDC",
    },
    allowedAssets: {
      label: "Assets an agent may spend",
      hint: "Starts with the canonical USDC on Monad. Anything else needs your approval once.",
    },
    allowedMerchantOrigins: {
      label: "Sites an agent may pay",
      hint: "Leave empty to let any site ask, and decide each one the first time.",
    },
    allowWarnings: {
      label: "Let warnings through",
      hint: "Off means a warning stops the transaction too. On means you see it and choose.",
    },
  },

  editor: {
    tabs: { form: "Rules", json: "JSON" },
    jsonHint: "This is the exact policy object Baret evaluates. Edit it directly if you prefer.",
    save: "Save policy",
    saved: "Policy saved. It applies to the next transaction.",
    invalid: "That is not a valid policy. The field named in the error is the one to fix.",
    reset: "Reset to the template",
    unsaved: "You have unsaved changes.",
  },
} as const;

export type PolicyContent = typeof policy;
