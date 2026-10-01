import type { ScenarioSite } from "../types.js";

/**
 * /claimhub on apps/showcase. Drainer. The hub's first stop.
 *
 * Story: an airdrop page. The eligibility check is theatre. What the claim
 * button builds is the whole scenario.
 *
 * Honest version: claim() on the demo distributor. HUB arrives, nothing of
 * yours can be spent later. Expected Safe, no findings. Needs: the distributor
 * on a list Baret reads (or UNKNOWN_CONTRACT_EXPOSURE turns it into Caution),
 * repeat claims allowed per address (or the second try reverts), 2,410 HUB
 * sent per claim to match the page.
 *
 * Attack version: approve(spender, max uint256) on the canonical test USDC.
 * Expected Blocked. Codes:
 *   ERC20_APPROVAL_UNLIMITED   always, from the calldata; blockUnlimitedApprovals
 *   KNOWN_MALICIOUS_ADDRESS    only if the demo spender is on the registry
 *                              blocklist; blockKnownMalicious
 * The approval simulates fine with a zero USDC balance, so a visitor with
 * only faucet MON still sees it.
 *
 * Watch for -> source:
 *   1 unlimited allowance         ERC20_APPROVAL_UNLIMITED
 *   2 spender on the blocklist    KNOWN_MALICIOUS_ADDRESS (seeded)
 *   3 nothing arriving            What changes (estimatedChanges): no HUB in
 */

export const claimhub = {
  meta: {
    title: "ClaimHub airdrop scenario · Baret",
    description:
      "A simulated airdrop on Monad testnet whose claim button asks for an unlimited allowance on your USDC. See what Baret checks before you sign.",
  },

  scenario: {
    slug: "claimhub",
    name: "ClaimHub",
    category: "Airdrop",
    tagline: "Season 2 rewards, claimed in one step",
    summary:
      "An airdrop page with a countdown and an eligibility check. In the attack version, the claim button asks for an unlimited allowance that lets a stranger take your USDC.",
    watchFor: [
      "An unlimited allowance on your USDC",
      "A spender on the Baret blocklist",
      "A claim where no tokens arrive",
    ],
    threatClass: "drainer",
    whyItMatters:
      "Signing an allowance moves nothing at first. The spender takes your tokens later, whenever it decides, until you revoke it.",
    verdict: "blocked",
  },

  site: {
    brand: "ClaimHub",
    hostname: "claimhub.example",
    nav: ["Claim", "Eligibility", "Distribution", "FAQ"],
    hero: {
      badge: "Season 2 is live",
      title: "Your HUB rewards are ready",
      body: "Early ClaimHub users share a pool of 12,000,000 HUB. Check your wallet and claim before the window closes.",
      cta: "Check eligibility",
    },
    panel: {
      title: "Your allocation",
      input: "Or paste a wallet address",
      rows: [
        { label: "Status", value: "Eligible" },
        { label: "Allocation", value: "2,410 HUB" },
        { label: "Claim fee", value: "None, only the network fee" },
        { label: "Window", value: "Closes in 3 days" },
      ],
      cta: "Claim 2,410 HUB",
      note: "One signature. Your HUB arrives in the same transaction.",
    },
    stats: [
      { value: "48,213", label: "wallets eligible" },
      { value: "12M", label: "HUB in the pool" },
      { value: "3 days", label: "left to claim" },
    ],
    sections: [
      {
        title: "How claiming works",
        body: "Connect the wallet you used before the snapshot. We read its activity and show your allocation. One signature sends the tokens to you.",
      },
      {
        title: "Why season 2 has a deadline",
        body: "Unclaimed HUB goes back to the community pool when the window closes. Claim early to keep your share.",
      },
    ],
    faq: [
      { question: "Is there a fee to claim?", answer: "No. You only pay the network fee in MON." },
      {
        question: "Why does my wallet ask for a permission?",
        answer: "The distributor needs it to deliver your tokens. Every claim works this way.",
      },
      {
        question: "What if I miss the window?",
        answer: "Unclaimed HUB returns to the pool for season 3.",
      },
    ],
    progress: ["Checking your wallet", "Confirm in your wallet", "Claiming", "Claimed"],
    done: {
      title: "Claim submitted",
      body: "Your 2,410 HUB are on the way. They can take a few minutes to show in your wallet.",
    },
    footer: "ClaimHub distributes season rewards to early users. Allocations are final.",
  },

  analysis: {
    modes: {
      safe: {
        label: "Honest version",
        body: "The claim button calls claim. HUB arrives in your wallet, and nothing of yours can be spent later.",
        asks: "ClaimHub wants you to claim HUB from {contract}.",
        call: "claim()",
        expected: "safe",
        expectedBody:
          "No rule should fire. The simulation should show HUB arriving and nothing leaving but the network fee.",
      },
      danger: {
        label: "Attack version",
        body: "The same button asks for an unlimited allowance on your USDC. No HUB is sent.",
        asks: "ClaimHub wants you to let {spender} spend all of your USDC.",
        call: "approve(spender, unlimited)",
        expected: "blocked",
        expectedBody:
          "Balanced rules block unlimited allowances, so that rule should fire. For this demo, the spender is also on the Baret blocklist.",
      },
    },
    claims: [
      {
        claim: "One signature. Your HUB arrives in the same transaction.",
        check: "Baret simulates the signature and lists what arrives and what leaves.",
      },
      {
        claim: "The distributor needs a permission. Every claim works this way.",
        check: "Baret checks the size of every allowance and the address that receives it.",
      },
      {
        claim: "You are eligible for 2,410 HUB.",
        check: "Not checked. Eligibility is something the page says about itself.",
      },
    ],
    watch: {
      title: "Before you press Claim",
      body: "Look at what leaves your wallet, not at the button. A claim sends tokens to you. It never needs permission to take yours.",
    },
    without: {
      title: "If this were signed",
      body: "Nothing would leave at first. The spender could then take all of your USDC at any time, until you revoke the allowance.",
    },
    lesson: {
      title: "A claim sends, it never takes",
      body: "A real claim sends tokens to you. If a claim asks to spend your tokens, it is not a claim.",
    },
  },
} as const satisfies ScenarioSite;

export type ClaimhubContent = typeof claimhub;
