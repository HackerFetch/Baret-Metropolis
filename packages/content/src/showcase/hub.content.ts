/**
 * /showcase on apps/showcase. The index of the six threat demos.
 *
 * Research notes:
 *  - The best short threat descriptions in the category name the attack, the
 *    asset class and the trust being exploited in one line. Pocket Universe's
 *    "Fake DEX orders which steal your ERC20 tokens using known, trusted DEX
 *    protocols" is the model.
 *  - Security labs title an exercise by what the attacker does, not by the
 *    vulnerability class. That is why each card leads with the fake product.
 *  - A deliberately vulnerable demo has to say so plainly, once, near the top.
 */

export const hub = {
  meta: {
    title: "Baret showcase",
    description:
      "Six fake sites that run six real attacks on Monad testnet. Connect a wallet, press the button, and watch Baret catch each one.",
  },

  hero: {
    eyebrow: "Showcase",
    title: "Six sites. Six attacks. One signature you never make.",
    body: "Each site below looks finished and behaves like the real thing. Connect a wallet, press its main button, and watch the analysis catch the attack in plain language while your key is still yours.",
    actions: {
      primary: { label: "See the scenarios", href: "#scenarios" },
      secondary: { label: "Install the wallet", href: "/install" },
    },
    ticker: [
      "wallet drainers",
      "unlimited approvals",
      "rug pulls",
      "silent agent spending",
      "look-alike tokens",
      "hidden contract calls",
    ],
    notice:
      "These sites are fakes built for this showcase. They run on Monad testnet and cannot touch real money.",
  },

  stats: [
    { value: "6", label: "demo sites" },
    { value: "3", label: "classes of attack" },
    { value: "22", label: "detectors running" },
    { value: "2", label: "contracts on testnet" },
  ],

  filters: [
    { id: "all", label: "All six" },
    { id: "drainer", label: "Drainers" },
    { id: "trap", label: "Trust traps" },
    { id: "agent", label: "Silent agents" },
  ],

  /** Card labels used on every scenario card. */
  cardLabels: {
    watchFor: "What the analysis flags",
    whyItMatters: "Why this works on people",
    verdict: "Expected verdict",
    open: "Open the site",
    safeMode: "Safe version",
    dangerMode: "Attack version",
  },

  steps: {
    title: "How each demo runs",
    items: [
      {
        title: "Connect a wallet",
        body: "Pick Baret or any wallet in the picker. The sites do not care which one you use.",
      },
      {
        title: "Turn on the attack",
        body: "Each site has a safe version and an attack version. The switch changes what the site actually builds.",
      },
      {
        title: "Press the button",
        body: "Swap, mint, stake, claim or buy. The site builds a real unsigned transaction and hands it to your wallet.",
      },
      {
        title: "Read the verdict",
        body: "Baret decodes it, simulates it, and gives you Safe, Caution or Blocked with one sentence per finding.",
      },
    ],
  },

  detectors: {
    eyebrow: "Under the hood",
    title: "Every demo runs the same 22 detectors.",
    body: "Each scenario trips a different few. The popup only shows you the ones that fired, and each one explains itself in a sentence.",
    action: { label: "Read the architecture", href: "/docs" },
  },

  comparison: {
    title: "Try it without Baret first",
    body: "Every site works with any wallet in the picker. Run the attack version with your usual wallet, read what it shows you, then run it again with Baret. The difference is the point of this page.",
  },

  cta: {
    title: "Pick one. Watch it get caught.",
    body: "Every scenario runs a real transaction against the real analysis server and shows the verdict before anything is signed.",
    actions: {
      primary: { label: "Start with ClaimHub", href: "/claimhub" },
      secondary: { label: "How it works", href: "/docs" },
    },
  },
} as const;

export type HubContent = typeof hub;
