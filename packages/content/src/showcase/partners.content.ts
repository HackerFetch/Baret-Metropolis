/**
 * /partners on apps/showcase. Every sponsor and data source Baret really
 * uses, with its logo, what Baret uses it for and where the proof sits.
 *
 * Rules this page keeps:
 *  - A role says what README.md "Sponsor integrations" and
 *    docs/BOUNTIES_AND_TRACKS.md say, never more. Chainlink CRE is marked as
 *    simulated with the CRE CLI, because it is not deployed to a DON.
 *  - Logos are the partners' own marks. The page maps each `id` to its file
 *    (apps/showcase/src/partners/logos.ts). A logo names the partner and
 *    never suggests an endorsement.
 *  - Every link leaves the site, so it opens in a new tab.
 */

const REPO = "https://github.com/HackerFetch/Baret-Metropolis/blob/main";

export type PartnerStatus = "live" | "simulated";

export interface Partner {
  readonly id: string;
  readonly name: string;
  /** Who makes it, when the product name alone does not say. */
  readonly by?: string;
  /** One sentence: what Baret uses it for. */
  readonly role: string;
  readonly status: PartnerStatus;
  /** The status in a few words, shown next to the tag. */
  readonly statusNote: string;
  readonly site: { readonly label: string; readonly href: string };
  readonly evidence?: { readonly label: string; readonly href: string };
}

export interface PartnerGroup {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly partners: readonly Partner[];
}

export const partners = {
  meta: {
    title: "Partners · Baret",
    description:
      "The chain, data, identity and model partners behind Baret on Monad: what each one does in the check, and where to see it working.",
  },

  hero: {
    title: "The partners inside every check.",
    body: "Every partner on this page does real work inside the check. Each card says what it does for Baret and links to the code or the transaction that proves it.",
    stats: [
      { value: "11", label: "partners in the check" },
      { value: "10", label: "live on Monad testnet" },
    ],
    jump: { label: "Meet the partners", href: "#chain" },
    note: "Logos belong to their owners. They name the partner and do not imply an endorsement.",
  },

  status: {
    live: "Live",
    simulated: "Simulated",
  },

  labels: {
    visit: "Visit",
    evidence: "See it in Baret",
    newTab: "opens in a new tab",
    groupNav: "Partner groups",
  },

  groups: [
    {
      id: "chain",
      title: "The chain",
      body: "Where every check runs, and the accounts that sign.",
      partners: [
        {
          id: "monad",
          name: "Monad",
          role: "Baret simulates every transaction on Monad testnet and reads its trace before anything is signed. All its contracts live there too.",
          status: "live",
          statusNote: "Testnet, chain id 10143",
          site: { label: "monad.xyz", href: "https://www.monad.xyz" },
          evidence: { label: "Baret's contracts", href: `${REPO}/docs/CONTRACTS.md` },
        },
        {
          id: "mera",
          name: "Mera",
          by: "Category Labs",
          role: "The Baret wallet's whole account layer: one passkey and no seed phrase. Agent keys and the encrypted settings come from their own passkey namespaces.",
          status: "live",
          statusNote: "The web wallet",
          site: { label: "mera.category.xyz", href: "https://mera.category.xyz" },
          evidence: {
            label: "The passkey account",
            href: `${REPO}/packages/wallet-core/src/account.ts`,
          },
        },
        {
          id: "alchemy",
          name: "Alchemy",
          role: "The analysis reads balances, code, the registry and the vaults through Alchemy's Monad RPC, in batches.",
          status: "live",
          statusNote: "Every chain read",
          site: { label: "alchemy.com", href: "https://www.alchemy.com" },
          evidence: { label: "The RPC client", href: `${REPO}/apps/server/src/infra/rpc.ts` },
        },
      ],
    },
    {
      id: "data",
      title: "Data and signals",
      body: "What the checks know about an address before you send to it.",
      partners: [
        {
          id: "envio",
          name: "Envio",
          role: "HyperIndex indexes every vault, payment and registry change. The wallet's activity, the agents page and the Qwen reviewer read it.",
          status: "live",
          statusNote: "HyperIndex",
          site: { label: "envio.dev", href: "https://envio.dev" },
          evidence: { label: "The indexer", href: `${REPO}/indexer/config.yaml` },
        },
        {
          id: "nansen",
          name: "Nansen",
          role: "Nansen's profiler gives an address a trust level. Under stricter rules, Baret blocks a fresh or unestablished wallet.",
          status: "live",
          statusNote: "Address labels",
          site: { label: "nansen.ai", href: "https://www.nansen.ai" },
          evidence: {
            label: "The Nansen source",
            href: `${REPO}/apps/server/src/sources/nansen.ts`,
          },
        },
        {
          id: "chainlink",
          name: "Chainlink CRE",
          by: "Chainlink",
          role: "A CRE workflow fetches ScamSniffer's blacklist and writes new addresses to the on-chain reputation registry that every check reads.",
          status: "simulated",
          statusNote: "CRE CLI, real write on testnet",
          site: { label: "chain.link", href: "https://chain.link" },
          evidence: { label: "The workflow", href: `${REPO}/workflows/README.md` },
        },
        {
          id: "scamsniffer",
          name: "ScamSniffer",
          role: "Its public blacklist of drainer addresses is the feed the CRE workflow writes into Baret's reputation registry.",
          status: "live",
          statusNote: "Blacklist data",
          site: { label: "scamsniffer.io", href: "https://scamsniffer.io" },
          evidence: {
            label: "The feed reader",
            href: `${REPO}/workflows/reputation-oracle/src/feed.ts`,
          },
        },
      ],
    },
    {
      id: "identity",
      title: "Identity and agents",
      body: "Who is on the other side, and who is allowed to pay.",
      partners: [
        {
          id: "cleanverse",
          name: "Cleanverse",
          role: "Before an aUSDC transfer, Baret reads both parties' A-Pass credentials on chain and blocks a party without one.",
          status: "live",
          statusNote: "A-Pass and aUSDC",
          site: { label: "cleanverse.com", href: "https://cleanverse.com" },
          evidence: {
            label: "The Cleanverse source",
            href: `${REPO}/apps/server/src/sources/cleanverse.ts`,
          },
        },
        {
          id: "dynamic",
          name: "Dynamic",
          role: "The demo agent is a Dynamic server wallet, authorised on a PaymentGuard vault and paying from it within its caps.",
          status: "live",
          statusNote: "Agent server wallet",
          site: { label: "dynamic.xyz", href: "https://www.dynamic.xyz" },
          evidence: {
            label: "The agent signer",
            href: `${REPO}/packages/agent-kit/src/dynamic.ts`,
          },
        },
      ],
    },
    {
      id: "models",
      title: "Models",
      body: "Language models that explain and review. They never change a verdict.",
      partners: [
        {
          id: "kimi",
          name: "KIMI",
          by: "Moonshot AI",
          role: "Writes the plain-words explanation under every live verdict, and turns a sentence into rules on the wallet's Rules page.",
          status: "live",
          statusNote: "kimi-k3",
          site: { label: "kimi.com", href: "https://www.kimi.com" },
          evidence: { label: "How Baret uses KIMI", href: `${REPO}/docs/articles/kimi.md` },
        },
        {
          id: "qwen",
          name: "Qwen",
          by: "Alibaba Cloud",
          role: "The agent reviewer: it plans, calls four read-only tools and can veto a payment. It can never approve one on its own.",
          status: "live",
          statusNote: "qwen3.8-max",
          site: { label: "qwen.ai", href: "https://qwen.ai" },
          evidence: { label: "How Baret uses Qwen", href: `${REPO}/docs/articles/qwen.md` },
        },
      ],
    },
  ] satisfies readonly PartnerGroup[],

  cta: {
    title: "See the partners at work.",
    body: "Open a demo site, press its button and watch the check run on Monad, from the trace to the plain-words verdict.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Read the docs", href: "/docs" },
    },
  },
} as const;

export type PartnersContent = typeof partners;
