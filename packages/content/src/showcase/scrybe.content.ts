/**
 * /scrybe on apps/showcase. Threat demo 6 of 6, and the flagship.
 *
 * This one is not an attack. It is a working x402 service that charges per
 * answer, and the demo is the spending cap. The agent pays without asking and
 * the cap is what stops it, not a popup.
 *
 * From the research: every x402 explanation in the wild is written from the
 * seller's side. Nobody writes the client side. This page is the client side.
 */

export const scrybe = {
  meta: {
    title: "Scrybe",
    description:
      "A working pay-per-answer service that an agent pays automatically, inside a cap you set.",
  },

  scenario: {
    slug: "scrybe",
    name: "Scrybe",
    category: "Paid API",
    tagline: "One question, one cent",
    summary:
      "A real service that charges per answer over HTTP 402. Nothing here is malicious. The demo is what happens when an agent pays over and over and the only thing between it and your balance is a cap.",
    watchFor: [
      "A running total that the payment protocol itself does not keep",
      "A payment address that has to match what the server asked for",
      "The moment the hourly cap fills and the next payment stops",
    ],
    threatClass: "agent",
    whyItMatters:
      "Agent payments repeat by design, so a small leak compounds with every request. Nothing about any single payment looks wrong. The total is the only place it shows.",
    verdict: "capped",
  },

  site: {
    brand: "Scrybe",
    nav: ["Ask", "Pricing", "API", "Usage"],
    hero: {
      badge: "Paid per answer",
      title: "Ask a question. Pay a cent.",
      body: "No account, no API key, no subscription. Send the question, get a 402, pay, get the answer. Your agent can do the whole loop on its own.",
      cta: "Ask",
      placeholder: "What changed in the last Monad release?",
    },
    pricing: {
      title: "One price",
      value: "$0.001",
      unit: "per answer, in USDC",
      body: "No minimum, no monthly fee, no credits to buy in advance. You pay for the answers you get.",
    },
    steps: [
      { title: "Ask", body: "Send the request the way you would to any API." },
      { title: "Get a 402", body: "The server replies with the price, the asset and the address." },
      { title: "Pay", body: "Your client pays and sends the same request again." },
      { title: "Answer", body: "The server verifies the payment and answers." },
    ],
  },

  /** The part nobody else writes: what the client should check. */
  analysis: {
    modes: {
      safe: {
        label: "Inside the cap",
        body: "The payment matches what the server asked for and fits inside your hourly cap. Baret pays it without interrupting you.",
      },
      danger: {
        label: "Cap reached",
        body: "Keep asking. When the hourly cap fills, the next payment does not go, and you get told why instead of getting a bill.",
      },
    },
    checks: {
      title: "What Baret checks on every payment",
      items: [
        {
          title: "The address matches",
          body: "The payment goes exactly where the 402 response said it should. A rewritten address fails here.",
        },
        {
          title: "The asset is the real one",
          body: "The contract address is compared against the canonical USDC on Monad, not the token's name.",
        },
        {
          title: "The amount fits the cap",
          body: "Per payment, per hour and per day. Each payment counts against a rolling total that you can see.",
        },
        {
          title: "The site is one you allow",
          body: "New merchants ask once. After that they live inside the cap you gave them.",
        },
      ],
    },
    counter: {
      title: "Spent here",
      hourly: "This hour",
      daily: "Today",
      note: "These numbers come from your own ledger, not from the site.",
    },
    after: {
      capped: {
        title: "Cap reached",
        body: "The next payment was not sent. Nothing failed and nothing was lost. The cap refills as the hour rolls forward.",
      },
      allowed: {
        title: "Paid",
        body: "The payment matched the request and fit the cap, so it went through without asking you.",
      },
    },
    lesson: {
      title: "What to take from this",
      body: "x402 is stateless on purpose. Something has to remember, and it should be the thing holding your money, not the thing spending it.",
    },
  },

  cta: {
    title: "Give an agent the same treatment.",
    body: "The SDK does this from your own code, with the same caps and the same checks.",
    action: { label: "Read the agent docs", href: "/agents" },
  },
} as const;

export type ScrybeContent = typeof scrybe;
