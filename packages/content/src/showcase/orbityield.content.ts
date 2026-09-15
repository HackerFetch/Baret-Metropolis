/**
 * /orbityield on apps/showcase. Threat demo 4 of 6.
 *
 * Attack: a one-way deposit. The pool is real and the deposit works. There is
 * no withdraw path in the contract, so the money goes in and stays in.
 *
 * This one ends in Caution rather than Blocked, on purpose. Nothing here is
 * provably malicious, and a tool that only has two answers has to guess.
 */

export const orbityield = {
  meta: {
    title: "OrbitYield",
    description: "A fake staking pool with no way out. Part of the Baret showcase.",
  },

  scenario: {
    slug: "orbityield",
    name: "OrbitYield",
    category: "Staking",
    tagline: "Liquid staking at 14% APY",
    summary:
      "The pool exists and the deposit works. It is an anonymous fork with no withdraw function anyone can find, so the deposit only goes one way.",
    watchFor: [
      "A pool contract nobody has verified",
      "No withdraw path in the code that is deployed",
      "A published total that is mostly the deployer's own deposits",
    ],
    threatClass: "trap",
    whyItMatters:
      "A one-way deposit looks perfect in the interface. The missing exit only shows up on-chain, and usually only when you try to leave.",
    verdict: "caution",
  },

  site: {
    brand: "OrbitYield",
    nav: ["Stake", "Rewards", "Analytics", "Audit"],
    hero: {
      badge: "Rewards accrue every block",
      title: "Liquid staking, 14.2% APY",
      body: "Stake MON and receive oMON, a receipt token you can trade or lend while it keeps earning. No lock-up, no minimum.",
      cta: "Stake MON",
    },
    stakeCard: {
      amount: "Amount to stake",
      receive: "You receive",
      apy: "Current APY",
      unlock: "Unstaking period",
      unlockValue: "None",
      cta: "Stake",
    },
    stats: [
      { value: "$18.7M", label: "total staked" },
      { value: "14.2%", label: "current APY" },
      { value: "2,104", label: "stakers" },
    ],
    trust: {
      title: "Built on audited code",
      body: "OrbitYield is a fork of a staking design that has been running for two years. The contract is deployed and the source is available.",
    },
    faq: [
      { question: "Can I unstake at any time?", answer: "Yes. There is no lock-up period." },
      {
        question: "Where does the yield come from?",
        answer: "Validator rewards, distributed every block.",
      },
      {
        question: "Is the contract audited?",
        answer: "The original design was audited. Our fork keeps the same core.",
      },
    ],
  },

  analysis: {
    modes: {
      safe: {
        label: "Safe version",
        body: "A small deposit into a pool that has a working withdraw path. This is what the normal version looks like.",
      },
      danger: {
        label: "Attack version",
        body: "A larger deposit into the anonymous fork. The deposit works. The withdraw function is not in the deployed code.",
      },
    },
    before: {
      title: "Before you press it",
      body: "Nothing here is provably a scam, which is the point. Read the Caution and decide with the amount in front of you.",
    },
    after: {
      caution: {
        title: "Caution",
        body: "Baret will sign this if you tell it to. The contract is unverified, the amount crosses your loss limit, and the deployed code has no path that returns your deposit.",
      },
      allowed: {
        title: "Signed",
        body: "A small deposit into a verified pool. The withdraw path exists and was found during the simulation.",
      },
    },
    lesson: {
      title: "What to take from this",
      body: "Not everything worth stopping for is an attack. Sometimes the finding is simply that there is no way back out, and only you can price that.",
    },
  },
} as const;

export type OrbityieldContent = typeof orbityield;
