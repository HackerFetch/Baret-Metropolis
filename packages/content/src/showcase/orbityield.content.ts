import type { ScenarioSite } from "../types.js";

/**
 * /orbityield on apps/showcase. Trust trap. Caution, on purpose.
 *
 * Story: a staking page that promises a receipt token for every MON staked.
 * Nothing here is provably an attack. The missing receipt is the only sign,
 * and it shows in the balance change, not on the page.
 *
 * Old versions claimed a check for "no unstake function" and "inflated TVL".
 * No detector does either, so this version is built on what the detectors
 * really see: which contract is called and what arrives.
 *
 * Honest version: stake(), payable, on the demo OrbitYield pool. oMON arrives
 * one to one; the pool has a working unstake. Expected Safe, no findings.
 * Needs: the pool on a list Baret reads.
 *
 * Attack version: the same button calls a second pool that is on no list,
 * keeps the MON and sends no oMON. Expected Caution under Balanced ("Unknown
 * contracts show as Caution, not Blocked"). Blocked under Strict. Codes:
 *   UNKNOWN_CONTRACT_EXPOSURE    needs the known-contract list to be in use;
 *                                blockUnknownContractExposure (off in Balanced)
 *   ESTIMATED_LOSS_EXCEEDS_MAX   only when the amount typed crosses the
 *                                visitor's loss limit; then Blocked
 *
 * Watch for -> source:
 *   1 a pool Baret does not know  UNKNOWN_CONTRACT_EXPOSURE
 *   2 MON out, no oMON in         What changes (estimatedChanges)
 *   3 loss above your limit       ESTIMATED_LOSS_EXCEEDS_MAX (amount-dependent)
 */

export const orbityield = {
  meta: {
    title: "OrbitYield staking scenario · Baret",
    description:
      "A simulated staking pool on Monad testnet that keeps your deposit and sends no receipt token. See what Baret checks before you stake.",
  },

  scenario: {
    slug: "orbityield",
    name: "OrbitYield",
    category: "Staking",
    tagline: "Liquid staking at 14.2% APY",
    summary:
      "A staking page that pays a receipt token for every MON you stake. In the attack version, the deposit goes to a pool nobody vouches for, and no receipt comes back.",
    watchFor: [
      "A pool contract Baret does not know",
      "MON leaving with no receipt token arriving",
      "A deposit above the loss limit in your rules",
    ],
    threatClass: "trap",
    whyItMatters:
      "Nothing here is provably an attack. The missing receipt is the only sign, and it shows in the balance change, not on the page.",
    verdict: "caution",
  },

  site: {
    brand: "OrbitYield",
    hostname: "orbityield.example",
    nav: ["Stake", "Rewards", "Stats", "Security"],
    hero: {
      badge: "Rewards every block",
      title: "Stake MON. Keep it liquid.",
      body: "Stake MON and receive oMON one to one. Trade or lend your oMON while the stake keeps earning. No lock-up.",
      cta: "Stake MON",
    },
    panel: {
      title: "Stake",
      input: "Amount of MON",
      rows: [
        { label: "You stake", value: "MON" },
        { label: "You receive", value: "oMON, one to one" },
        { label: "Current APY", value: "14.2%" },
        { label: "Unstaking period", value: "None" },
      ],
      cta: "Stake",
      note: "oMON arrives in your wallet in the same transaction.",
    },
    stats: [
      { value: "$18.7M", label: "total staked" },
      { value: "14.2%", label: "current APY" },
      { value: "2,104", label: "stakers" },
    ],
    sections: [
      {
        title: "Built on audited code",
        body: "OrbitYield forks a staking design that has run for two years. The core logic is unchanged.",
      },
      {
        title: "Where the yield comes from",
        body: "Staking rewards, paid out every block and added to the value of your oMON.",
      },
    ],
    faq: [
      { question: "Can I unstake at any time?", answer: "Yes. There is no lock-up." },
      {
        question: "Is the contract audited?",
        answer: "The original design was audited. Our fork keeps the same core.",
      },
      {
        question: "What is oMON?",
        answer: "A receipt for your stake. Hold it, trade it, or return it to unstake.",
      },
    ],
    progress: ["Preparing your stake", "Confirm in your wallet", "Staking", "Staked"],
    done: {
      title: "Staked",
      body: "Your MON is earning. Your oMON will show in your wallet shortly.",
    },
    footer: "OrbitYield is a liquid staking pool on Monad.",
  },

  analysis: {
    modes: {
      safe: {
        label: "Honest version",
        body: "The deposit goes to the OrbitYield pool Baret knows. oMON comes back one to one, and the pool lets you unstake.",
        asks: "OrbitYield wants you to stake MON on {contract}.",
        call: "stake()",
        expected: "safe",
        expectedBody:
          "No rule should fire. The simulation should show MON out and the same amount of oMON in.",
      },
      danger: {
        label: "Attack version",
        body: "The same button sends your MON to a second pool that is on no list. It keeps the deposit and sends no oMON.",
        asks: "OrbitYield wants you to stake MON on {contract}.",
        call: "stake()",
        expected: "caution",
        expectedBody:
          "Balanced rules show an unknown contract as Caution, so you can still sign after you read why. Under Strict, or above your loss limit, it is Blocked.",
      },
    },
    claims: [
      {
        claim: "You receive oMON one to one.",
        check: "Baret simulates the deposit and lists every token that arrives.",
      },
      {
        claim: "Built on audited code.",
        check: "Not checked. An audit of the original says nothing about this deployment.",
      },
      {
        claim: "14.2% APY.",
        check:
          "Not checked. Baret reads what the transaction does now, not what a page promises later.",
      },
    ],
    watch: {
      title: "Before you press Stake",
      body: "Nothing here is provably a scam, and that is the point. Read the Caution, look at what arrives, and decide with the amount in front of you.",
    },
    without: {
      title: "If this were signed",
      body: "Your MON would sit in a pool with no receipt to show for it. Getting it back would depend on whoever controls that pool.",
    },
    lesson: {
      title: "Check the receipt",
      body: "When a deposit promises a receipt, check that the receipt arrives. A missing receipt is the first sign of a one-way door.",
    },
  },
} as const satisfies ScenarioSite;

export type OrbityieldContent = typeof orbityield;
