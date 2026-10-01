import type { ScenarioSite } from "../types.js";

/**
 * /pixeldrop on apps/showcase. Drainer.
 *
 * Story: a mint page. Buyers expect to sign fast during a drop, which is why
 * a drainer dresses up as one.
 *
 * Honest version: mint(1), payable, 0.01 MON, on the demo Night Shift
 * collection. One piece in, no lasting permission. Expected Safe, no findings.
 * Needs: the collection on a list Baret reads; price 0.01 MON and 10 per
 * wallet to match the page.
 *
 * Attack version: the same button calls setApprovalForAll(operator, true) on
 * the same collection. Nothing is minted. Expected Blocked. Codes:
 *   NFT_OPERATOR_GRANTED       always, from the calldata; blockSetApprovalForAll
 *   KNOWN_MALICIOUS_ADDRESS    only if the demo operator is on the blocklist
 * A visitor who holds no piece yet still sees it: the grant covers pieces
 * minted later.
 *
 * Watch for -> source:
 *   1 access to a whole collection  NFT_OPERATOR_GRANTED
 *   2 operator on the blocklist     KNOWN_MALICIOUS_ADDRESS (seeded)
 *   3 a mint where no piece arrives What changes (estimatedChanges)
 */

export const pixeldrop = {
  meta: {
    title: "PixelDrop mint scenario · Baret",
    description:
      "A simulated NFT mint on Monad testnet whose mint button hands a stranger your whole collection. See what Baret checks before you sign.",
  },

  scenario: {
    slug: "pixeldrop",
    name: "PixelDrop",
    category: "NFT mint",
    tagline: "Night Shift, 5,000 pieces, generated on Monad",
    summary:
      "A clean mint page for a generative collection. In the attack version, the mint button mints nothing. It gives a stranger access to every piece you hold in the collection.",
    watchFor: [
      "Access to a whole collection, not one piece",
      "An operator on the Baret blocklist",
      "A mint where no piece arrives",
    ],
    threatClass: "drainer",
    whyItMatters:
      "One signature covers every piece you hold in the collection, including pieces you get later. It stays until you revoke it.",
    verdict: "blocked",
  },

  site: {
    brand: "PixelDrop",
    hostname: "pixeldrop.example",
    nav: ["Mint", "Collection", "Roadmap", "Team"],
    hero: {
      badge: "Public mint is open",
      title: "Night Shift",
      body: "Five thousand city scenes after dark, generated on-chain. The metadata lives on Monad, not on a server.",
      cta: "Mint for 0.01 MON",
    },
    panel: {
      title: "Mint",
      input: "Quantity",
      rows: [
        { label: "Price", value: "0.01 MON" },
        { label: "Per wallet", value: "Up to 10" },
        { label: "Minted", value: "3,847 of 5,000" },
      ],
      cta: "Mint",
      note: "One signature. Your piece lands in your wallet in the same transaction.",
    },
    stats: [
      { value: "5,000", label: "pieces" },
      { value: "214", label: "traits" },
      { value: "0.01 MON", label: "mint price" },
    ],
    sections: [
      {
        title: "Generated at mint",
        body: "Each piece is drawn the moment you mint it. The contract combines the traits and stores the result on-chain.",
      },
      {
        title: "Roadmap",
        body: "Public mint first. A rarity explorer next. Holders vote on the second drop.",
      },
    ],
    faq: [
      {
        question: "Why does minting need a signature?",
        answer: "Every mint is a transaction, so your wallet asks you to confirm it.",
      },
      {
        question: "Can I list right after minting?",
        answer: "Yes. Marketplaces can list your piece as soon as it lands.",
      },
      { question: "How many can I mint?", answer: "Up to 10 per wallet." },
    ],
    progress: ["Preparing your mint", "Confirm in your wallet", "Minting", "Minted"],
    done: {
      title: "Minted",
      body: "Your Night Shift piece is in your wallet. Welcome to the collection.",
    },
    footer: "Night Shift is a PixelDrop collection on Monad.",
  },

  analysis: {
    modes: {
      safe: {
        label: "Honest version",
        body: "The button calls mint. You pay 0.01 MON and one piece arrives. No lasting permission is granted.",
        asks: "PixelDrop wants you to mint one piece on {contract} for 0.01 MON.",
        call: "mint(1)",
        expected: "safe",
        expectedBody:
          "No rule should fire. The simulation should show 0.01 MON out and one piece in.",
      },
      danger: {
        label: "Attack version",
        body: "The same button gives another address access to every Night Shift piece you hold. Nothing is minted.",
        asks: "PixelDrop wants you to give {operator} access to your whole collection.",
        call: "setApprovalForAll(operator, true)",
        expected: "blocked",
        expectedBody:
          "Balanced rules block collection-wide access, so that rule should fire. For this demo, the operator is also on the Baret blocklist.",
      },
    },
    claims: [
      {
        claim: "One signature, one piece.",
        check: "Baret simulates the call and shows what arrives and what leaves.",
      },
      {
        claim: "Marketplaces can list your piece right away.",
        check: "Baret flags any signature that lets another address move your pieces.",
      },
      {
        claim: "The metadata lives on Monad, not on a server.",
        check: "Not checked. Baret reads the transaction, not the art.",
      },
    ],
    watch: {
      title: "Before you press Mint",
      body: "A mint moves a price out and one piece in. Any line about access to the collection is not part of minting.",
    },
    without: {
      title: "If this were signed",
      body: "No piece would arrive. The other address could move every Night Shift piece you hold, now and later, until you revoke it.",
    },
    lesson: {
      title: "A mint gives, it never borrows",
      body: "A mint sends one piece to you. Access to your whole collection is never part of minting.",
    },
  },
} as const satisfies ScenarioSite;

export type PixeldropContent = typeof pixeldrop;
