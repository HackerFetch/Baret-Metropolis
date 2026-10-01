import type { ScenarioSite } from "../types.js";

/**
 * /scrybe on apps/showcase. Silent agent. The x402 scenario.
 *
 * Story: a paid answer service that charges per answer over HTTP 402. Nothing
 * here is malicious. The scenario is what stops an agent that keeps asking.
 * Every x402 write-up online is from the seller's side; this page is the
 * payer's side.
 *
 * The price, the merchant and the receipt are read live from the 402 response
 * and the settlement ({amount}, {merchant}), so no price is fixed in the copy.
 * The answer text is not the point and is never presented as more than it is.
 *
 * One answer: GET /demo/paywall, 402, Baret checks the payment request, pays
 * inside the caps, the facilitator settles on Monad testnet, the answer comes
 * back with a receipt. Expected Safe, no findings. The payment is a signed
 * USDC transferWithAuthorization (the x402 exact scheme).
 *
 * Agent loop: an agent on the page asks back to back. Each payment is checked
 * and valid; the one that would cross a cap is declined before it is signed.
 * Expected "capped" (Blocked at the cap). Codes, whichever cap fills first:
 *   X402_HOURLY_CAP_EXCEEDED   maxHourlyCap (the likely one)
 *   X402_DAILY_CAP_EXCEEDED    maxDailyCap
 *   X402_PER_TX_CAP_EXCEEDED   maxPerTxCap, only if the price is above it
 * With default caps and a small price the loop takes many payments to fill a
 * cap, so the page tells the visitor to set a low hourly cap first.
 * Checks that run on every payment and pass here: X402_DESTINATION_MISMATCH,
 * X402_ASSET_MISMATCH, X402_NON_CANONICAL_ASSET (named in `claims`).
 *
 * Watch for -> source: the three cap codes above, one line each.
 */

export const scrybe = {
  meta: {
    title: "Scrybe x402 payments scenario · Baret",
    description:
      "A pay-per-answer service on Monad testnet that an agent pays over x402. Watch Baret check every payment against the caps you set.",
  },

  scenario: {
    slug: "scrybe",
    name: "Scrybe",
    category: "Paid API",
    tagline: "Pay per answer, no account",
    summary:
      "A paid answer service that charges a small USDC payment per answer over x402. Nothing here is malicious. The question is what stops an agent that keeps asking.",
    watchFor: [
      "A payment above your cap per payment",
      "The payment that would take the last hour over your hourly cap",
      "The payment that would take the last day over your daily cap",
    ],
    threatClass: "agent",
    whyItMatters:
      "Agent payments repeat by design. No single payment looks wrong, so the running total is the only place a leak shows.",
    verdict: "capped",
  },

  site: {
    brand: "Scrybe",
    hostname: "scrybe.example",
    nav: ["Ask", "Pricing", "API", "Usage"],
    hero: {
      badge: "Paid per answer",
      title: "Ask a question. Pay for the answer.",
      body: "No account, no API key, no subscription. Ask, get a price, pay it, get the answer. An agent can run the whole loop on its own.",
      cta: "Ask",
    },
    panel: {
      title: "Ask Scrybe",
      input: "Type a question",
      rows: [
        { label: "Price", value: "{amount} USDC per answer" },
        { label: "Paid in", value: "USDC on Monad testnet" },
        { label: "Paid to", value: "{merchant}" },
      ],
      cta: "Pay and ask",
      note: "The price comes with every payment request, so you see it before anything is paid.",
    },
    stats: [
      { value: "402", label: "the status code that asks for payment" },
      { value: "1", label: "payment per answer" },
      { value: "0", label: "accounts to create" },
    ],
    sections: [
      {
        title: "How paying works",
        body: "Your request gets a 402 reply with a price, an asset and an address. Your client pays and sends the same request again. The answer comes back.",
      },
      {
        title: "Built for agents",
        body: "There is no login to automate and no key to rotate. An agent that can pay can ask.",
      },
    ],
    faq: [
      {
        question: "What does an answer cost?",
        answer: "The price is in every payment request, so your client sees it before paying.",
      },
      { question: "Do I need an account?", answer: "No. The payment is the only credential." },
      {
        question: "What if a payment fails?",
        answer: "You get no answer and pay nothing. Ask again when you are ready.",
      },
    ],
    progress: ["Asking", "Payment requested", "Paying", "Settling on Monad", "Answered"],
    done: {
      title: "Answered",
      body: "Paid {amount} USDC to {merchant}. The payment settled on Monad testnet.",
    },
    footer: "Scrybe charges per answer over x402. The price is set in each payment request.",
  },

  analysis: {
    modes: {
      safe: {
        label: "One answer",
        body: "You ask once. Baret checks the payment request, pays inside your caps and shows the receipt.",
        asks: "Scrybe wants you to pay {amount} USDC to {merchant}.",
        call: "transferWithAuthorization(to, value)",
        expected: "safe",
        expectedBody:
          "No rule should fire. The address and the asset should match the request, and the amount should fit your caps.",
      },
      danger: {
        label: "Agent loop",
        body: "An agent on this page asks question after question and pays each time. Every payment is checked. The one that would cross a cap is not sent.",
        asks: "Scrybe wants you to pay {amount} USDC to {merchant}, once per question.",
        call: "transferWithAuthorization(to, value)",
        expected: "capped",
        expectedBody:
          "Payments go through until one would cross a cap. That payment is Blocked before it is signed, and so is every one after it until the window rolls on.",
      },
    },
    claims: [
      {
        claim: "The price is in every payment request.",
        check:
          "Baret checks that the payment matches the request: the same address and the same asset.",
      },
      {
        claim: "Paid in USDC.",
        check:
          "Baret compares the token's contract address with the canonical USDC on Monad, not its name.",
      },
      {
        claim: "An agent can run the whole loop on its own.",
        check: "It can, inside your caps. Baret counts every payment against a rolling total.",
      },
    ],
    watch: {
      title: "Before you start the loop",
      body: "Set a low hourly cap in your rules first. Then watch the running total fill and the next payment stop.",
    },
    without: {
      title: "Without a cap",
      body: "Each payment would be small and correct. The agent would keep paying for as long as it kept asking.",
    },
    lesson: {
      title: "Set the cap first",
      body: "x402 keeps no running total, on purpose. Your wallet has to, and the cap has to exist before the agent starts.",
    },
  },

  /** The one extra key: SCRYBE bridges to the agents page. */
  cta: {
    title: "Give your agent the same caps",
    body: "Your agent pays from a PaymentGuard vault with a cap per payment and a daily cap per merchant. You can revoke its key at any time.",
    action: { label: "Read the agent docs", href: "/agents" },
  },
} as const satisfies ScenarioSite;

export type ScrybeContent = typeof scrybe;
