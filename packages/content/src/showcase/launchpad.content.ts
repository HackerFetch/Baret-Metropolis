import type { ScenarioSite } from "../types.js";

/**
 * /launchpad on apps/showcase. Trust trap. Caution, on purpose.
 *
 * Story: a polished token sale. The tokens really arrive. The risk is what the
 * deployer can change after the sale, and that shows in the call trace, not
 * on the page.
 *
 * Old versions claimed checks for "admin key kept" and "LP not locked". No
 * detector reads either, so this version uses what the evm-danger detector
 * does see: the sale runs borrowed code (a proxy the deployer can repoint).
 *
 * Honest version: contribute(), payable, on a plain sale contract with fixed
 * code. LNTL arrives in the same transaction. Expected Safe, no findings.
 * Needs: the sale contract on a list Baret reads; 0.001 MON per LNTL,
 * minimum 0.01 MON, maximum 1 MON per wallet to match the page.
 *
 * Attack version: the same button calls a sale proxy that delegatecalls into
 * an implementation its deployer can replace. LNTL still arrives. Expected
 * Caution under Balanced, Blocked under Strict. Codes:
 *   DELEGATECALL_DETECTED        needs a call trace (debug_traceCall on the
 *                                Monad RPC); blockDelegatecall
 *   UNKNOWN_CONTRACT_EXPOSURE    proxy and implementation on no list;
 *                                blockUnknownContractExposure (off in Balanced)
 *   ESTIMATED_LOSS_EXCEEDS_MAX   only when the amount typed crosses the
 *                                visitor's loss limit; then Blocked
 * If no trace is available, expect LOW_CONFIDENCE_INCOMPLETE_DATA instead of
 * DELEGATECALL_DETECTED.
 *
 * Watch for -> source:
 *   1 borrowed code              DELEGATECALL_DETECTED
 *   2 a sale Baret does not know UNKNOWN_CONTRACT_EXPOSURE
 *   3 loss above your limit      ESTIMATED_LOSS_EXCEEDS_MAX (amount-dependent)
 */

export const launchpad = {
  meta: {
    title: "LaunchPad token sale scenario · Baret",
    description:
      "A simulated token sale on Monad testnet whose contract runs code its deployer can replace after you pay. See what Baret checks before you buy.",
  },

  scenario: {
    slug: "launchpad",
    name: "LaunchPad",
    category: "Token sale",
    tagline: "Reviewed launches on Monad",
    summary:
      "A polished token sale with a countdown and a tokenomics chart. In the attack version, your tokens still arrive, but the sale runs code its deployer can replace after you pay.",
    watchFor: [
      "A sale that runs code borrowed from another contract",
      "A sale contract Baret does not know",
      "A contribution above the loss limit in your rules",
    ],
    threatClass: "trap",
    whyItMatters:
      "Nothing goes wrong on the day you buy. The risk is what the deployer can change after the sale closes.",
    verdict: "caution",
  },

  site: {
    brand: "LaunchPad",
    hostname: "launchpad.example",
    nav: ["Sale", "Tokenomics", "Vesting", "Team"],
    hero: {
      badge: "Reviewed launch",
      title: "Lintel public sale",
      body: "Fixed price, no tiers, no allowlist. LNTL arrives in your wallet the moment you contribute.",
      cta: "Buy LNTL",
    },
    panel: {
      title: "Contribute",
      input: "Amount of MON",
      rows: [
        { label: "Price", value: "0.001 MON per LNTL" },
        { label: "Minimum", value: "0.01 MON" },
        { label: "Maximum per wallet", value: "1 MON" },
        { label: "Raised", value: "8,420 of 10,000 MON" },
      ],
      cta: "Contribute",
      note: "LNTL is sent to you in the same transaction.",
    },
    stats: [
      { value: "8,420 MON", label: "raised" },
      { value: "1,318", label: "contributors" },
      { value: "2 days", label: "left in the sale" },
    ],
    sections: [
      {
        title: "Tokenomics",
        body: "40% public sale, 25% liquidity, 20% team, 15% treasury.",
      },
      {
        title: "Team tokens vest over 24 months",
        body: "The team allocation is locked for six months, then releases monthly.",
      },
      {
        title: "Every launch is reviewed",
        body: "Projects submit their contracts before listing. We check the supply, the vesting and the liquidity plan.",
      },
    ],
    faq: [
      {
        question: "When do I get my tokens?",
        answer: "In the same transaction as your contribution.",
      },
      {
        question: "Can the contract change after the sale?",
        answer: "The sale follows the contract we reviewed.",
      },
      { question: "Is there a minimum?", answer: "Yes, 0.01 MON per wallet." },
    ],
    progress: ["Preparing your order", "Confirm in your wallet", "Buying", "Contribution received"],
    done: {
      title: "Contribution received",
      body: "Your LNTL is in your wallet. Trading opens when the sale closes.",
    },
    footer: "LaunchPad lists reviewed token sales on Monad.",
  },

  analysis: {
    modes: {
      safe: {
        label: "Honest version",
        body: "The contribution goes to a plain sale contract with fixed code. LNTL arrives in the same transaction.",
        asks: "LaunchPad wants you to buy LNTL on {contract}.",
        call: "contribute()",
        expected: "safe",
        expectedBody:
          "No rule should fire. The simulation should show MON out, LNTL in, and no code borrowed from another contract.",
      },
      danger: {
        label: "Attack version",
        body: "The same button pays a sale contract that runs code from another contract. Its deployer can swap that code at any time. LNTL still arrives.",
        asks: "LaunchPad wants you to buy LNTL on {contract}.",
        call: "contribute()",
        expected: "caution",
        expectedBody:
          "Borrowed code and an unknown contract should both show up. Balanced rules treat them as Caution, so you can still sign after you read why. Strict rules block it.",
      },
    },
    claims: [
      {
        claim: "Every launch is reviewed.",
        check: "Not checked. A review badge is something the page says about itself.",
      },
      {
        claim: "The sale follows the contract we reviewed.",
        check: "Baret traces the call and flags code that runs from another contract.",
      },
      {
        claim: "LNTL arrives in the same transaction.",
        check: "Baret simulates the purchase and lists what arrives.",
      },
    ],
    watch: {
      title: "Before you press Contribute",
      body: "Tokens that arrive today say little about next week. Read the Caution: it tells you whether the code that ran can be replaced.",
    },
    without: {
      title: "If this were signed",
      body: "LNTL would arrive and the page would look fine. Your MON would sit behind code the deployer can replace whenever they choose.",
    },
    lesson: {
      title: "Ask who can change it",
      body: "A sale page describes launch day. Check whether the code that holds your money can change after it.",
    },
  },
} as const satisfies ScenarioSite;

export type LaunchpadContent = typeof launchpad;
