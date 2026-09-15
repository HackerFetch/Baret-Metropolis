/**
 * /launchpad on apps/showcase. Threat demo 5 of 6.
 *
 * Attack: a rug in waiting. The sale is real, the tokens arrive. The deployer
 * keeps the admin key and the liquidity is not locked, so the exit is
 * available to them whenever they want it.
 *
 * Caution, not Blocked. Nothing bad has happened yet. That is the finding.
 */

export const launchpad = {
  meta: {
    title: "LaunchPad",
    description: "A fake token sale where the deployer keeps the keys. Part of the Baret showcase.",
  },

  scenario: {
    slug: "launchpad",
    name: "LaunchPad",
    category: "Token sale",
    tagline: "Vetted launches on Monad",
    summary:
      "A polished sale page with a countdown and a full tokenomics chart. The simulation shows the deployer still holds the token admin key and the liquidity is not locked.",
    watchFor: [
      "An admin key the deployer never gave up",
      "Liquidity that can be removed at any moment",
      "A token that can be frozen after the sale closes",
    ],
    threatClass: "trap",
    whyItMatters:
      "Nothing has gone wrong yet, and that is what makes it work. A retained admin key means the deployer can mint, freeze or pull liquidity long after launch day, when nobody is watching.",
    verdict: "caution",
  },

  site: {
    brand: "LaunchPad",
    nav: ["Sale", "Tokenomics", "Vesting", "Team"],
    hero: {
      badge: "Vetted launch",
      title: "Nimbus public sale",
      body: "Fixed price, no allocation tiers, no whitelist. Tokens are delivered the moment the sale closes.",
      cta: "Buy in",
      countdown: "Sale closes in",
    },
    sale: {
      raised: "Raised",
      target: "Target",
      price: "Price",
      min: "Minimum",
      max: "Maximum per wallet",
      cta: "Buy",
    },
    tokenomics: [
      { label: "Public sale", value: "40%" },
      { label: "Liquidity", value: "25%" },
      { label: "Team", value: "20%" },
      { label: "Treasury", value: "15%" },
    ],
    vesting: {
      title: "Team tokens vest over 24 months",
      body: "The team allocation is locked for six months and then releases linearly. Liquidity is added at close.",
    },
    trust: {
      title: "Every launch is reviewed",
      body: "Projects submit their contracts before listing. We check the supply, the vesting schedule and the liquidity plan.",
    },
  },

  analysis: {
    modes: {
      safe: {
        label: "Safe version",
        body: "A small buy into a sale where the admin rights are burned and the liquidity is locked. The simulation confirms both.",
      },
      danger: {
        label: "Attack version",
        body: "A larger buy into the version where the deployer still holds the admin key and the liquidity pool is open.",
      },
    },
    before: {
      title: "Before you press it",
      body: "The page will not tell you who holds the keys. The simulation will.",
    },
    after: {
      caution: {
        title: "Caution",
        body: "Baret will sign if you tell it to. The deployer can still mint and freeze this token, and the liquidity can be removed at any time.",
      },
      allowed: {
        title: "Signed",
        body: "Admin rights are burned and the liquidity is locked. The buy is a plain transfer.",
      },
    },
    lesson: {
      title: "What to take from this",
      body: "A launch page describes launch day. The risk lives in what the deployer can still do the week after.",
    },
  },
} as const;

export type LaunchpadContent = typeof launchpad;
