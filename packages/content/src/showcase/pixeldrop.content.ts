/**
 * /pixeldrop on apps/showcase. Threat demo 2 of 6.
 *
 * Attack: operator grant. The mint button also calls setApprovalForAll, which
 * hands over every item in the collection, including ones bought later.
 *
 * Mint pages are good cover for this because buyers expect to sign fast.
 */

export const pixeldrop = {
  meta: {
    title: "PixelDrop",
    description:
      "A fake NFT mint that hands over your whole collection. Part of the Baret showcase.",
  },

  scenario: {
    slug: "pixeldrop",
    name: "PixelDrop",
    category: "NFT mint",
    tagline: "Generative art, minted on Monad",
    summary:
      "A clean mint page for a 5,000 piece collection. Behind the art, the mint button also grants an operator permission over everything you own in that collection.",
    watchFor: [
      "An operator grant you did not ask for",
      "A transfer of items that have nothing to do with this mint",
      "A spender address that is not the collection contract",
    ],
    threatClass: "drainer",
    whyItMatters:
      "One signature covers the whole collection, not one item, and it keeps covering items you buy next month. Mint pages are the perfect cover because everyone expects to sign quickly during a drop.",
    verdict: "blocked",
  },

  site: {
    brand: "PixelDrop",
    nav: ["Mint", "Collection", "Roadmap", "Team"],
    hero: {
      badge: "Public mint is open",
      title: "Cyber Phantoms",
      body: "Five thousand pieces generated on-chain from 214 traits. Fully on-chain metadata, no IPFS, no reveal delay.",
      cta: "Mint for 0.5 MON",
      supply: "3,847 of 5,000 minted",
    },
    traits: [
      { label: "Traits", value: "214" },
      { label: "Supply", value: "5,000" },
      { label: "Mint price", value: "0.5 MON" },
      { label: "Per wallet", value: "10" },
    ],
    about: {
      title: "Generated at mint, stored on-chain",
      body: "Every piece is produced when you mint it. The traits are combined by the contract and the image is stored on Monad, so nothing depends on a server staying online.",
    },
    roadmap: [
      { title: "Phase 1", body: "Public mint and on-chain reveal." },
      { title: "Phase 2", body: "Trait rarity tooling and a collection explorer." },
      { title: "Phase 3", body: "Holder governance over the second drop." },
    ],
  },

  analysis: {
    modes: {
      safe: {
        label: "Safe version",
        body: "The mint transfers the mint fee and gives you one item. No standing permissions are granted.",
      },
      danger: {
        label: "Attack version",
        body: "The same button now grants an operator permission over the whole collection to an address that is not the collection contract.",
      },
    },
    before: {
      title: "Before you press it",
      body: "A mint should move your fee out and one item in. Any line about permissions on the collection is not part of minting.",
    },
    after: {
      blocked: {
        title: "Blocked",
        body: "Baret refused to sign. The transaction grants operator rights over the collection, and the address receiving them is not the contract you are minting from.",
      },
      allowed: {
        title: "Signed",
        body: "A fee out, one item in, nothing standing. That is the whole transaction.",
      },
    },
    lesson: {
      title: "What to take from this",
      body: "An operator grant is not scoped to one item or to today. It covers everything in that collection, including what you buy later.",
    },
  },
} as const;

export type PixeldropContent = typeof pixeldrop;
