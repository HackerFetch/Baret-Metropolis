/**
 * /novaswap on apps/showcase. Threat demo 3 of 6.
 *
 * Attack: output redirect. The swap succeeds, so the page looks correct. The
 * tokens you bought land in a different wallet.
 *
 * This is the hardest one to catch by eye, because nothing fails.
 */

export const novaswap = {
  meta: {
    title: "NovaSwap",
    description:
      "A fake DEX where the swap works and the output goes somewhere else. Part of the Baret showcase.",
  },

  scenario: {
    slug: "novaswap",
    name: "NovaSwap",
    category: "Exchange",
    tagline: "Best price across every Monad pool",
    summary:
      "A clean swap interface with real quotes. In the attack version the swap still succeeds, and the tokens you bought are delivered to an address that is not yours.",
    watchFor: [
      "Output delivered to an address that is not your wallet",
      "A router you have never interacted with",
      "A fee well above what the quote implied",
    ],
    threatClass: "drainer",
    whyItMatters:
      "This is the hardest attack to notice, because nothing fails. The swap executes, the page shows success, and the balance you were expecting simply never arrives.",
    verdict: "blocked",
  },

  site: {
    brand: "NovaSwap",
    nav: ["Swap", "Pools", "Analytics", "Docs"],
    hero: {
      badge: "Routing across 14 pools",
      title: "Swap at the best available price",
      body: "NovaSwap splits your order across every pool on Monad and settles in one transaction.",
      cta: "Swap",
    },
    swapCard: {
      from: "You pay",
      to: "You receive",
      rate: "Rate",
      impact: "Price impact",
      fee: "Network fee",
      route: "Route",
      slippage: "Max slippage",
      cta: "Review swap",
      connecting: "Connect a wallet to swap",
    },
    stats: [
      { value: "$4.2M", label: "24h volume" },
      { value: "14", label: "pools routed" },
      { value: "0.05%", label: "protocol fee" },
    ],
    footerNote: "Quotes update every block. Your rate is locked when you sign.",
  },

  analysis: {
    modes: {
      safe: {
        label: "Safe version",
        body: "You pay one asset, you receive the other, and both legs land in your wallet.",
      },
      danger: {
        label: "Attack version",
        body: "The swap still succeeds. The output leg is rewritten to deliver to a wallet created this week.",
      },
    },
    before: {
      title: "Before you press it",
      body: "Look at the receiving address in the What changes list. In a normal swap both legs name your own wallet.",
    },
    after: {
      blocked: {
        title: "Blocked",
        body: "Baret refused to sign. The simulation shows the output going to an address that is not yours, and that address was created four days ago.",
      },
      allowed: {
        title: "Signed",
        body: "Both legs landed in your wallet. The fee matched the quote.",
      },
    },
    lesson: {
      title: "What to take from this",
      body: "A transaction that succeeds is not a transaction that did what you wanted. Read where the money lands, not whether it worked.",
    },
  },
} as const;

export type NovaswapContent = typeof novaswap;
