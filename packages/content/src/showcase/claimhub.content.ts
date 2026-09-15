/**
 * /claimhub on apps/showcase. Threat demo 1 of 6.
 *
 * Attack: approval phishing. The "eligibility check" signs an unlimited
 * approval on the visitor's stablecoins. This is the most common wallet
 * attack there is, so it is the one we send people to first.
 *
 * The site copy below has to be convincing. It is written the way a real
 * airdrop page is written, including the urgency. Our own voice only appears
 * in the `analysis` block.
 */

export const claimhub = {
  meta: {
    title: "ClaimHub",
    description: "A fake airdrop claim page that signs away your stablecoins. Part of the Baret showcase.",
  },

  /** The scenario card, also rendered on the hub and the landing page. */
  scenario: {
    slug: "claimhub",
    name: "ClaimHub",
    category: "Airdrop",
    tagline: "Ecosystem rewards, claimed in one step",
    summary:
      "It looks like every airdrop page you have ever used. The eligibility check is real. What it asks you to sign is an unlimited approval on your stablecoins.",
    watchFor: [
      "An unlimited approval to an address with no history",
      "A domain that does not match the project it claims to be",
      "A claim button that never actually claims anything",
    ],
    threatClass: "drainer",
    whyItMatters:
      "Approval phishing is the most common way wallets get emptied, because the signature looks ordinary and never expires. You do not lose anything at the moment you sign. You lose it whenever the attacker decides.",
    verdict: "blocked",
  },

  /** The fake product's own voice. Convincing on purpose. */
  site: {
    brand: "ClaimHub",
    nav: ["Claim", "Eligibility", "Distribution", "FAQ"],
    hero: {
      badge: "Season 2 distribution is live",
      title: "Your ecosystem rewards are ready",
      body: "Wallets active on Monad during the qualifying period are eligible for a share of the season 2 pool. Check your allocation and claim in one step.",
      cta: "Check eligibility",
      countdown: "Claim window closes in",
    },
    stats: [
      { value: "48,213", label: "wallets eligible" },
      { value: "12.4M", label: "tokens allocated" },
      { value: "72h", label: "left to claim" },
    ],
    steps: [
      { title: "Connect", body: "Connect the wallet you used during the qualifying period." },
      { title: "Check", body: "We read your on-chain activity and calculate your allocation." },
      { title: "Claim", body: "Approve the claim and the tokens arrive in the same transaction." },
    ],
    eligibility: {
      title: "You are eligible",
      allocation: "2,410 tokens",
      note: "Allocation is final and is calculated from activity before the snapshot.",
      cta: "Claim now",
      fineprint: "Claiming requires one approval so the distributor can deliver your tokens.",
    },
    faq: [
      {
        question: "Why do I need to approve a token to claim?",
        answer: "The distributor contract needs permission to move tokens on your behalf during the claim.",
      },
      { question: "Is there a fee?", answer: "No. You only pay the network fee." },
      { question: "What if I miss the window?", answer: "Unclaimed allocations return to the treasury." },
    ],
  },

  /** Our voice. This is the layer that tells the truth about the site. */
  analysis: {
    modes: {
      safe: {
        label: "Safe version",
        body: "The claim asks for a capped approval that matches the amount being claimed. This is what an honest claim page looks like.",
      },
      danger: {
        label: "Attack version",
        body: "The same button now signs an unlimited approval on your USDC to an address with no history. Nothing is claimed.",
      },
    },
    before: {
      title: "Before you press it",
      body: "Read the approval amount in the popup. An honest claim asks for the amount it is about to give you. This one asks for everything you have and everything you will have.",
    },
    after: {
      blocked: {
        title: "Blocked",
        body: "Baret refused to sign. The rule that fired was the one blocking unlimited approvals, and the spender is an address that appeared four days ago.",
      },
      allowed: {
        title: "Signed",
        body: "The capped approval matched the claim, so nothing was flagged. You can see the exact allowance in the Allowances tab.",
      },
    },
    lesson: {
      title: "What to take from this",
      body: "The word claim on the button has nothing to do with what the transaction does. Read the approval, not the page.",
    },
  },
} as const;

export type ClaimhubContent = typeof claimhub;
