import type { ScenarioSite } from "../types.js";

/**
 * /novaswap on apps/showcase. Drainer.
 *
 * Story: a swap that succeeds and pays someone else. Nothing fails, so the
 * page shows success either way. Pays in MON, so neither version needs an
 * allowance and the two differ only in the contract called.
 *
 * Honest version: swap(minOut, to = you), payable, on the demo NovaSwap router
 * at a fixed test rate. MON out, USDC in, both in your wallet. Expected Safe,
 * no findings. Needs: the router on a list Baret reads and funded with test
 * USDC; the page's "fixed test rate" note stays true only while the router
 * uses one.
 *
 * Attack version: the same button calls a look-alike router that swaps and
 * pays the USDC to another wallet. Expected Blocked. Codes:
 *   RISKY_CONTRACT_INTERACTION   the look-alike router is written to the
 *                                registry's risky list for the demo;
 *                                blockRiskyContracts
 *   KNOWN_MALICIOUS_ADDRESS      only if the payout wallet is on the blocklist
 *   ESTIMATED_LOSS_EXCEEDS_MAX   only when the amount typed crosses the
 *                                visitor's loss limit
 * Not promised: NANSEN_FLAGGED_FRESH_WALLET (depends on Nansen covering
 * testnet addresses).
 *
 * Watch for -> source:
 *   1 reported router             RISKY_CONTRACT_INTERACTION (seeded)
 *   2 USDC paid to another wallet What changes (estimatedChanges) + blocklist
 *   3 loss above your limit       ESTIMATED_LOSS_EXCEEDS_MAX (amount-dependent)
 */

export const novaswap = {
  meta: {
    title: "NovaSwap swap scenario · Baret",
    description:
      "A simulated swap on Monad testnet that succeeds and pays your USDC to another wallet. See what Baret checks before you sign.",
  },

  scenario: {
    slug: "novaswap",
    name: "NovaSwap",
    category: "Exchange",
    tagline: "Swap MON for USDC in one step",
    summary:
      "A clean swap page. In the attack version, the swap runs through a look-alike router. The USDC you bought lands in someone else's wallet.",
    watchFor: [
      "A router on the reported list",
      "Your USDC paid to a wallet that is not yours",
      "A loss above the limit in your rules",
    ],
    threatClass: "drainer",
    whyItMatters:
      "The swap succeeds and the page shows success. Only the balance change shows where the output went.",
    verdict: "blocked",
  },

  site: {
    brand: "NovaSwap",
    hostname: "novaswap.example",
    nav: ["Swap", "Pools", "Stats", "Docs"],
    hero: {
      badge: "No allowance needed for MON",
      title: "Swap MON for USDC in one step",
      body: "Pay in MON, receive USDC, settle in a single transaction. No account, and no allowance to manage.",
      cta: "Swap",
    },
    panel: {
      title: "Swap",
      input: "Amount of MON",
      rows: [
        { label: "You pay", value: "MON" },
        { label: "You receive", value: "USDC" },
        { label: "Rate", value: "Fixed test rate" },
        { label: "Route", value: "NovaSwap router" },
        { label: "Max slippage", value: "0.5%" },
      ],
      cta: "Review swap",
      note: "Quotes on Monad testnet use a fixed test rate, not a market price.",
    },
    stats: [
      { value: "$4.2M", label: "24h volume" },
      { value: "14", label: "pools routed" },
      { value: "0.05%", label: "protocol fee" },
    ],
    sections: [
      {
        title: "Settles in one transaction",
        body: "Your MON goes in and your USDC comes out in the same transaction. Nothing waits in a queue.",
      },
      {
        title: "Routed for you",
        body: "NovaSwap picks the route. You see the rate before you confirm.",
      },
    ],
    faq: [
      {
        question: "Do I need to approve anything?",
        answer: "Not to swap MON. Native MON needs no allowance.",
      },
      { question: "Where does my USDC go?", answer: "Straight to the wallet you connected." },
      {
        question: "Is there a protocol fee?",
        answer: "0.05% of each swap, already included in the rate.",
      },
    ],
    progress: ["Getting a quote", "Confirm in your wallet", "Swapping", "Swap complete"],
    done: {
      title: "Swap complete",
      body: "Your USDC is on its way to your wallet.",
    },
    footer: "NovaSwap runs on Monad. Rates are shown before you confirm.",
  },

  analysis: {
    modes: {
      safe: {
        label: "Honest version",
        body: "The swap calls the NovaSwap router. Your MON goes in, and the USDC comes back to your wallet.",
        asks: "NovaSwap wants you to swap MON for USDC on {contract}.",
        call: "swap(minOut, to: your wallet)",
        expected: "safe",
        expectedBody:
          "No rule should fire. The simulation should show MON out and USDC in, both in your own wallet.",
      },
      danger: {
        label: "Attack version",
        body: "The same button sends your MON to a look-alike router. It swaps, then pays the USDC to another wallet.",
        asks: "NovaSwap wants you to swap MON for USDC on {contract}.",
        call: "swap(minOut, to: another wallet)",
        expected: "blocked",
        expectedBody:
          "For this demo, the look-alike router is on the reported list. Balanced rules block reported contracts, so that rule should fire.",
      },
    },
    claims: [
      {
        claim: "Your USDC goes straight to the wallet you connected.",
        check: "Baret simulates the swap and shows which wallet receives the USDC.",
      },
      {
        claim: "Routed through the NovaSwap router.",
        check: "Baret checks the contract you actually call against the reputation registry.",
      },
      {
        claim: "$4.2M traded in the last 24 hours.",
        check: "Not checked. Volume on a page is not evidence of anything.",
      },
    ],
    watch: {
      title: "Before you press Swap",
      body: "Notice that both versions ask the same thing. Only the contract differs. Read the What changes rows: in an honest swap, the USDC lands in your wallet.",
    },
    without: {
      title: "If this were signed",
      body: "The swap would succeed and the page would say so. Your MON would be gone, and the USDC would sit in another wallet.",
    },
    lesson: {
      title: "Success is not the same as yours",
      body: "A swap that succeeds can still pay someone else. Check where the output lands, not whether it worked.",
    },
  },
} as const satisfies ScenarioSite;

export type NovaswapContent = typeof novaswap;
