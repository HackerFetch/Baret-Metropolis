/**
 * One entry per GuardPolicy field, plus the templates and the editor chrome.
 * This file is a contract with packages/guard.
 *
 * Rendered by the wallet rule editor, the extension options rule editor and
 * the onboarding step that picks a template. The keys under `fields` match the
 * GuardPolicy schema exactly (docs/ARCHITECTURE.md section 7). If a field is
 * added there, add it here in the same change or the editor shows a blank row.
 *
 * Each field:
 *   group    one of the ten categories in ARCHITECTURE section 7, a key of
 *            `groups` below.
 *   label    the row label. UI copy says "rules", never "policy".
 *   hint     what happens when the rule fires.
 *   unit     for numeric fields, the unit the value is entered in.
 *   codes    the finding codes this field is the deciding rule for. Every code
 *            in shared/findings.content.ts appears under at least one field,
 *            and every field that can block lists at least one code. The
 *            compiler rejects a code that does not exist.
 *   options  for fields whose value is a level: the word for each level. For
 *            minNansenTrustLevel these words are also the {actual} and {limit}
 *            values of NANSEN_TRUST_BELOW_MINIMUM.
 *   display  for list and level fields: how the current value reads in a row.
 *
 * `allowWarnings` decides every finding that no other field decides, so its
 * `codes` are the findings that no block rule covers.
 *
 * Fail-closed is not a field. When Baret cannot finish a check, the request
 * counts as Blocked whatever these rules say.
 */

import type { FindingCode } from "./findings.content.js";

type PolicyGroup =
  | "simulation"
  | "contracts"
  | "approvals"
  | "dangerous"
  | "limits"
  | "reputation"
  | "compliance"
  | "resources"
  | "x402"
  | "general";

interface PolicyField {
  group: PolicyGroup;
  label: string;
  hint: string;
  unit?: string;
  codes: readonly FindingCode[];
  options?: Readonly<Record<string, { label: string; hint: string }>>;
  display?: Readonly<Record<string, string>>;
}

interface PolicyContentShape {
  intro: Readonly<Record<string, string>>;
  templates: unknown;
  groups: Readonly<Record<PolicyGroup, { title: string; body: string }>>;
  fields: Readonly<Record<string, PolicyField>>;
  editor: unknown;
}

export const policy = {
  intro: {
    title: "Your rules",
    body: "Baret checks every sign request against these rules. You set them. Baret only runs them.",
    note: "A change applies from the next sign request. Nothing you already signed is affected.",
    failClosed: "Whatever you set here, a request Baret cannot finish checking counts as Blocked.",
  },

  /**
   * Descriptions say only what the 25 fields can express. No numbers: the
   * template values live in packages/guard/src/policy-templates.ts.
   */
  templates: {
    strict: {
      name: "Strict",
      body: "For an account that holds more than you want to lose. Of the three sets, it blocks the most.",
      highlights: [
        "Blocks unknown contracts as well as reported ones",
        "Blocks every finding, so a Caution stops the request too",
        "The lowest loss limit and payment caps of the three",
      ],
    },
    balanced: {
      name: "Balanced",
      body: "The starting point. Blocks broad allowances and listed addresses, and lets you sign a Caution after you read why.",
      highlights: [
        "Blocks unlimited allowances, collection-wide access and signed allowances",
        "Blocks listed addresses and reported contracts",
        "An unknown contract shows as Caution, unless it keeps what you send or runs borrowed code",
      ],
    },
    permissive: {
      name: "Permissive",
      body: "For a test account you do not mind losing. Every check still runs and every finding still shows. Fewer rules block.",
      highlights: [
        "Still blocks listed addresses and requests that would fail",
        "Unlimited allowances show as Caution. Read them before you sign.",
        "The highest payment caps of the three",
      ],
    },
    /** Shown instead of the template name once any field differs from it. */
    custom: {
      name: "Custom",
      body: "Started from {template}. At least one rule is different now.",
    },
    footnote:
      "Start from any set and change a single rule later. The other rules stay as they were.",
  },

  groups: {
    simulation: {
      title: "Simulation",
      body: "Whether a request must run cleanly before you can sign it.",
    },
    contracts: {
      title: "Contracts",
      body: "Which contracts a request may touch.",
    },
    approvals: {
      title: "Allowances",
      body: "What a site may spend from your wallet, now and later.",
    },
    dangerous: {
      title: "Dangerous calls",
      body: "Calls that can hand over a contract or the funds in it.",
    },
    limits: {
      title: "Loss limits",
      body: "The most one request may cost you, and what it must leave behind.",
    },
    reputation: {
      title: "Reputation",
      body: "What Nansen and the Baret reputation registry say about the other address.",
    },
    compliance: {
      title: "Compliance",
      body: "Identity rules for transfers, checked against Cleanverse credentials.",
    },
    resources: {
      title: "Gas",
      body: "The largest gas limit a request may set.",
    },
    x402: {
      title: "Payments",
      body: "Caps and lists for the payments your agents make over x402.",
    },
    general: {
      title: "Caution",
      body: "What happens when a check finds something that no rule above blocks.",
    },
  },

  fields: {
    // Simulation
    requireSuccessfulSimulation: {
      group: "simulation",
      label: "Block requests that would fail",
      hint: "Baret runs each request without sending it. If it fails, the request is blocked, because a failed transaction still costs a fee.",
      codes: ["SIMULATION_FAILED"],
    },

    // Contracts
    blockRiskyContracts: {
      group: "contracts",
      label: "Block risky contracts",
      hint: "Blocks a request that touches a contract on the risky list in the Baret reputation registry, or that pays an unknown contract and gets nothing back.",
      codes: [
        "RISKY_CONTRACT_INTERACTION",
        "VALUE_KEPT_BY_UNKNOWN_CONTRACT",
        "REPUTATION_DATA_UNAVAILABLE",
      ],
    },
    blockUnknownContractExposure: {
      group: "contracts",
      label: "Block unknown contracts",
      hint: "Blocks a request that touches a contract on no list Baret reads. Expect new apps to trip it.",
      codes: ["UNKNOWN_CONTRACT_EXPOSURE"],
    },

    // Allowances
    blockUnlimitedApprovals: {
      group: "approvals",
      label: "Block unlimited allowances",
      hint: "Blocks an allowance with no limit, which lets a contract take all of a token, now and later.",
      codes: ["ERC20_APPROVAL_UNLIMITED"],
    },
    blockSetApprovalForAll: {
      group: "approvals",
      label: "Block collection-wide access",
      hint: "Blocks a request that lets someone move every item in a collection, including items you get later.",
      codes: ["NFT_OPERATOR_GRANTED"],
    },
    blockPermit: {
      group: "approvals",
      label: "Block signed allowances",
      hint: "Blocks a permit: a signature that grants an allowance without a transaction, and is easy to miss.",
      codes: ["PERMIT_SIGNATURE_DETECTED", "SIGNATURE_NOT_UNDERSTOOD", "ORDER_PAYS_NOTHING"],
    },

    // Dangerous calls
    blockSelfdestruct: {
      group: "dangerous",
      label: "Block self-destruct calls",
      hint: "Blocks a call that makes a contract send all the MON it holds to another address.",
      codes: ["SELFDESTRUCT_CALL"],
    },
    blockDelegatecall: {
      group: "dangerous",
      label: "Block borrowed code",
      hint: "Blocks a call where a contract runs another contract's code with its own funds. Upgradeable apps do this too.",
      codes: ["DELEGATECALL_DETECTED", "ACCOUNT_CODE_DELEGATION"],
    },
    blockOwnershipTransfer: {
      group: "dangerous",
      label: "Block ownership handovers",
      hint: "Blocks a call that moves admin rights over a contract to another address.",
      codes: ["OWNERSHIP_TRANSFER"],
    },

    // Loss limits
    maxLossPercent: {
      group: "limits",
      label: "Largest loss per request",
      hint: "Baret compares your balance before and after. A request that would lose a larger share than this is blocked.",
      unit: "percent of balance",
      codes: ["ESTIMATED_LOSS_EXCEEDS_MAX", "LOSS_PERCENT_UNAVAILABLE"],
    },
    minPostUsdcBalance: {
      group: "limits",
      label: "Keep at least this much USDC",
      hint: "Blocks a request that would leave you with less USDC than this.",
      unit: "USDC",
      codes: ["POST_BALANCE_TOO_LOW", "POST_BALANCE_UNAVAILABLE"],
    },
    minPostNativeBalance: {
      group: "limits",
      label: "Keep at least this much MON",
      hint: "Blocks a request that would leave you with less MON than this, so you can always pay a fee.",
      unit: "MON",
      codes: ["POST_BALANCE_TOO_LOW", "POST_BALANCE_UNAVAILABLE"],
    },

    // Reputation
    blockKnownMalicious: {
      group: "reputation",
      label: "Block listed addresses",
      hint: "Blocks a request that touches an address on the Baret registry blocklist or flagged by Nansen.",
      codes: ["KNOWN_MALICIOUS_ADDRESS", "REPUTATION_DATA_UNAVAILABLE"],
    },
    minNansenTrustLevel: {
      group: "reputation",
      label: "Lowest trust level you accept",
      hint: "Blocks a request to an address that Nansen rates below this level.",
      codes: ["NANSEN_TRUST_BELOW_MINIMUM", "REPUTATION_DATA_UNAVAILABLE"],
      options: {
        new: {
          label: "New",
          hint: "Any address, including a wallet made today. This sets no minimum.",
        },
        established: {
          label: "Established",
          hint: "Has a history. Blocks brand new wallets.",
        },
        identified: {
          label: "Identified",
          hint: "Named by Nansen, such as an exchange, a fund or a known app.",
        },
      },
    },

    // Compliance
    requireComplianceCheck: {
      group: "compliance",
      label: "Require a verified identity",
      hint: "Blocks a transfer unless both accounts hold a valid Cleanverse identity credential.",
      codes: ["COMPLIANCE_NO_CREDENTIAL", "COMPLIANCE_EXPIRED", "COMPLIANCE_DATA_UNAVAILABLE"],
    },
    allowedCountries: {
      group: "compliance",
      label: "Countries you send to",
      hint: "Blocks a transfer to an account verified in a country not on this list. The country comes from its Cleanverse credential.",
      codes: [
        "COMPLIANCE_COUNTRY_DISALLOWED",
        "COMPLIANCE_NO_CREDENTIAL",
        "COMPLIANCE_DATA_UNAVAILABLE",
      ],
      display: {
        empty: "Any country",
        some: "{count} countries",
        someOne: "{count} country",
      },
    },
    minComplianceTier: {
      group: "compliance",
      label: "Lowest verification level",
      hint: "Blocks a transfer to an account verified below this level. Cleanverse numbers the levels, and a higher level means a stronger check.",
      codes: [
        "COMPLIANCE_TIER_INSUFFICIENT",
        "COMPLIANCE_NO_CREDENTIAL",
        "COMPLIANCE_DATA_UNAVAILABLE",
      ],
      display: {
        any: "Any level",
        some: "Level {limit} or higher",
      },
    },

    // Gas
    maxGas: {
      group: "resources",
      label: "Highest gas limit",
      hint: "Blocks a request that sets a gas limit above this. On Monad you pay for the whole limit, even the part a request never uses.",
      unit: "gas",
      codes: ["EXCESSIVE_GAS"],
    },

    // Payments (x402)
    requireMemo: {
      group: "x402",
      label: "Require a payment reference",
      hint: "Blocks an agent payment that carries no reference, so every payment can be matched to an invoice.",
      codes: ["X402_MEMO_MISSING"],
    },
    maxPerTxCap: {
      group: "x402",
      label: "Cap per payment",
      hint: "Blocks a single agent payment above this amount.",
      unit: "USDC",
      codes: ["X402_PER_TX_CAP_EXCEEDED"],
    },
    maxHourlyCap: {
      group: "x402",
      label: "Cap per hour",
      hint: "Blocks a payment that would take the last 60 minutes over this total. The hour rolls with each payment.",
      unit: "USDC",
      codes: ["X402_HOURLY_CAP_EXCEEDED", "X402_SPEND_HISTORY_UNAVAILABLE"],
    },
    maxDailyCap: {
      group: "x402",
      label: "Cap per day",
      hint: "Blocks a payment that would take the last 24 hours over this total. Payments go through again as older ones pass 24 hours.",
      unit: "USDC",
      codes: ["X402_DAILY_CAP_EXCEEDED", "X402_SPEND_HISTORY_UNAVAILABLE"],
    },
    allowedAssets: {
      group: "x402",
      label: "Assets an agent may pay with",
      hint: "Blocks a payment in any asset not on this list. Assets match by contract address, so a look-alike token is blocked too.",
      codes: ["X402_ASSET_NOT_ALLOWED", "X402_NON_CANONICAL_ASSET"],
      display: {
        empty: "None, so every payment is blocked",
        some: "{count} assets",
        someOne: "{count} asset",
      },
    },
    allowedMerchantOrigins: {
      group: "x402",
      label: "Sites an agent may pay",
      hint: "Blocks a payment to any site not on this list. Leave it empty to let any site ask, within your caps.",
      codes: ["X402_MERCHANT_NOT_ALLOWED"],
      display: {
        empty: "Any site, within your caps",
        some: "{count} sites",
        someOne: "{count} site",
      },
    },

    // Caution
    allowWarnings: {
      group: "general",
      label: "Let me sign a Caution",
      hint: "On: you can sign a Caution after you read its findings. Off: any finding blocks the request. Either way, Can't reach Baret counts as Blocked.",
      codes: [
        "LOW_CONFIDENCE_INCOMPLETE_DATA",
        "ERC20_APPROVAL_GRANTED",
        "SIGNATURE_UNRECOGNISED",
        "SIGNED_ORDER_DETECTED",
        "NANSEN_FLAGGED_FRESH_WALLET",
        "NANSEN_FLAGGED_WHALE_COUNTERPARTY",
        "DEEP_CALL_NESTING",
        "HIGH_OPERATION_COUNT",
        "X402_DESTINATION_MISMATCH",
        "X402_ASSET_MISMATCH",
      ],
    },
  },

  editor: {
    tabs: { form: "Rules", json: "JSON" },
    jsonHint: "This is the exact rule object Baret evaluates. Edit it here if you prefer.",
    save: "Save rules",
    saved: "Saved. Your rules apply from the next sign request.",
    invalid: "Baret cannot read these rules. Fix the field named in the error, then save.",
    reset: "Back to the template",
    unsaved: "You have unsaved changes.",
  },
} as const satisfies PolicyContentShape;

export type PolicyContent = typeof policy;
