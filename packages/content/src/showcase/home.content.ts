/**
 * / on apps/showcase. The landing page.
 *
 * Positioning decisions, from the competitor research:
 *
 *  1. Everyone in this category writes "[verb] X before Y". The word "before"
 *     is table stakes and carries no weight. Our second axis is WHOSE RULES.
 *     Not one competitor gives the end user a policy. Blockaid and Forta sell
 *     policy enforcement to admins. "The rules are yours" is unclaimed.
 *
 *  2. Nobody has written a single line about the middle verdict. The field is
 *     Malicious / Warning / Benign or BLOCKED / PASSED. Caution is ours.
 *
 *  3. Nobody says where the analysis runs. We say it plainly, including the
 *     part that is inconvenient.
 *
 *  4. Pocket Universe attacks this whole category head on: "Most Web3 security
 *     tools expect you to catch scams. That doesn't work." They are right about
 *     warning fatigue. Our answer is that you decide once, in advance, and a
 *     block is a block. It is in the comparison and again in the FAQ.
 *
 *  5. The best disclaimer in the category is MetaMask's "This is just a
 *     prediction, not a guarantee." We say our own version early, not buried.
 */

export const home = {
  meta: {
    title: "Baret",
    description:
      "Baret reads every Monad transaction before you sign it. It simulates what will happen, checks it against rules you set, and tells you what it found.",
  },

  /** Seven lines for the scroll-triggered opener. Optional; the page works
   *  without it. Each line is one beat, no line is a sentence fragment. */
  opener: [
    "Every wallet signs what the site puts in front of it.",
    "One confirm button. Then the chain decides.",
    "Baret reads it first.",
    "Decoded. Simulated. Checked against your rules.",
    "Standing permissions with a cap and a clock.",
    "Safe, Caution or Blocked, while your key is still yours.",
    "Baret.",
  ],

  hero: {
    status: "Running on Monad testnet",
    title: "Read first. Then sign.",
    body: "Baret simulates every Monad transaction, checks it against rules you set, and says what it found in one sentence.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Install the wallet", href: "/install" },
    },
    badges: [
      "Simulated on live state",
      "Your rules, not ours",
      "Caps on standing permissions",
      "Alerts when something moves",
    ],
    /** Sits beside the real Sign Request component, which shows a blocked
     *  unlimited approval. The caption is what makes the mockup honest. */
    mockCaption: "This is the real screen, not a drawing of one.",
  },

  /** The scrolling strip of detector names. Keep in sync with the detector
   *  list in docs/ARCHITECTURE.md section 6. */
  marquee: [
    "Unlimited approval",
    "Operator grant on a collection",
    "Off-chain approval signature",
    "Wallet drainer pattern",
    "Reported address",
    "Brand-new counterparty",
    "Unverified contract",
    "Ownership handover",
    "Self-destructing contract",
    "Delegated code execution",
    "Hidden internal call",
    "Fee far above the estimate",
    "Balance floor breach",
    "Look-alike token",
    "Payment to the wrong address",
    "Spending cap reached",
  ],

  /** The positioning statement. Three layers, each one sentence, each one
   *  denying its own cost in the next clause. */
  pillars: {
    eyebrow: "The product",
    title: "Three checks, one signature.",
    body: "Each layer stands on its own. Together they close the gap that drainers, forgotten approvals and silent agents walk through today.",
    items: [
      {
        title: "Before you sign",
        body: "Baret decodes the transaction, runs it against live Monad state, and explains every finding in one sentence. It adds about a second and it is the second that matters.",
        points: [
          "Decoded, not just displayed",
          "Simulated on real state",
          "One sentence per finding",
        ],
      },
      {
        title: "Your rules, not ours",
        body: "You pick a rule set once. After that a block is a block, not a warning you have to read at two in the morning and decide about.",
        points: [
          "Three starting sets",
          "Every rule is yours to change",
          "Plain JSON you can export",
        ],
      },
      {
        title: "After you sign",
        body: "Every approval you grant becomes a row with a cap, a clock and a live bar. If something moves that you did not sign, you get told.",
        points: ["Caps that refill", "One tap to revoke", "Alerts on anything you did not sign"],
      },
    ],
  },

  /** The middle verdict. Nobody else in the category has written this section,
   *  which is exactly why it is here. */
  caution: {
    eyebrow: "The middle answer",
    title: "Most transactions are not safe or dangerous. They are worth a look.",
    body: "A tool with two answers has to guess which one you get. Guess blocked too often and you turn it off. Guess safe too often and it was never protecting you. Baret has a third answer, and it says what it saw and what it could not tell.",
    examples: [
      {
        title: "Safe",
        body: "Nothing in this transaction breaks a rule you set. You still see what changes.",
      },
      {
        title: "Caution",
        body: "It is allowed, and there is something you should know first. A contract nobody verified, a counterparty created last week, a fee well above the estimate.",
      },
      {
        title: "Blocked",
        body: "A rule you set stopped it. Baret names the rule, not a score. Signing anyway is a separate, deliberate step and it is logged.",
      },
    ],
    honesty: {
      title: "And when it does not know",
      body: "If the simulation comes back incomplete, Baret says so instead of rounding up to safe. A missing check counts as a failed check. That is the default and you can change it.",
    },
  },

  /** The x402 wedge. From the research: everyone explains how to CHARGE an
   *  agent. Nobody explains what the agent should check before it pays. */
  agents: {
    eyebrow: "Agents",
    title: "x402 forgets. Baret keeps count.",
    body: "x402 is the payment handshake agents now use on Monad. It is stateless on purpose: every payment is a fresh signature and the protocol holds no running total, no spending cap and no way to revoke. Baret sits underneath it and adds the three it left out.",
    gaps: [
      {
        title: "An agent that pays every minute",
        gap: "Nothing in the protocol shows a running total, so a slow leak looks identical to normal traffic.",
        answer:
          "Rolling caps per merchant, by the hour and by the day. Each payment counts against a real number and the one that crosses it does not go.",
      },
      {
        title: "A token that says USDC",
        gap: "The handshake checks that the asset field matches. It does not check which contract that name belongs to.",
        answer:
          "Baret compares the contract address against the canonical one on Monad. A look-alike fails the check even when the name is perfect.",
      },
      {
        title: "A key that leaks",
        gap: "One signing key, no scope. Whoever has it can pay anyone, for anything, forever.",
        answer:
          "The agent gets a signer that can only call pay on your vault, inside a cap you set. One call ends it, on-chain, without moving any funds.",
      },
    ],
    action: { label: "Read the agent docs", href: "/agents" },
  },

  stats: {
    title: "Where it stands today",
    items: [
      { value: "22", label: "risk detectors running" },
      { value: "6", label: "attacks you can trigger yourself" },
      { value: "2", label: "contracts on Monad testnet" },
      { value: "0", label: "keys that leave your device" },
    ],
  },

  showcase: {
    eyebrow: "Showcase",
    title: "Six fake sites. Six real attacks.",
    body: "Connect a wallet and press the button. Every one of these runs a real transaction against the real analysis server. No slides, no recorded demo.",
    action: { label: "Open the showcase", href: "/showcase" },
  },

  comparison: {
    eyebrow: "The difference",
    title: "Same transaction, two wallets.",
    body: "No wallet is being attacked here. This is what changes when a check runs between the site and your key.",
    columns: { without: "A normal Monad wallet", with: "Baret" },
    rows: [
      {
        aspect: "Before you sign",
        without: "A contract address and a confirm button. The chain decides the rest.",
        with: "A decoded call, a simulation, and one sentence per finding.",
      },
      {
        aspect: "Unlimited approvals",
        without: "Granted once and live until you remember to remove it.",
        with: "Blocked by default. A capped approval becomes a row with a clock.",
      },
      {
        aspect: "When something looks wrong",
        without: "A generic warning you have to interpret, every time.",
        with: "A rule you already agreed to, enforced the same way every time.",
      },
      {
        aspect: "Agent payments",
        without: "An agent can re-sign small payments all day with no ceiling.",
        with: "Hourly and daily caps, checked at signing and again on-chain.",
      },
      {
        aspect: "After you sign",
        without: "You find out from a block explorer.",
        with: "Baret watches the account and tells you when something you did not sign moves.",
      },
    ],
  },

  /** Nobody in this category makes a claim about where analysis runs. We do,
   *  including the uncomfortable half. */
  privacy: {
    eyebrow: "What runs where",
    title: "You are trusting us with the moment before your key moves.",
    body: "So here is exactly what happens to it.",
    cards: [
      {
        title: "Your keys never leave the device",
        body: "They sit encrypted in your browser. They are not sent to the analysis server, to us, or anywhere else. There is no account and nothing to log in to.",
      },
      {
        title: "The unsigned transaction is sent to a server",
        body: "Decoding and simulation need a node, so the server sees the unsigned transaction and the address it came from. It never sees a key and it cannot sign anything.",
      },
      {
        title: "Nothing is signed without you",
        body: "The verdict comes back before the popup asks you anything. When a rule blocks a transaction, Baret refuses to sign it.",
      },
      {
        title: "A simulation is a prediction",
        body: "It is run against the chain as it is right now. Gas, timing and other people's transactions can still make the real result differ. Treat it as a very good guess, not a promise.",
      },
    ],
    footnote: "No audit yet. The code is public. Read it.",
    action: { label: "View the source", href: "https://github.com/HackerFetch/Baret-Metropolis" },
  },

  faq: {
    title: "Fair questions",
    items: [
      {
        question: "What happens when the analysis server is down?",
        answer:
          "Baret tells you it could not check and leaves the decision to you. It never invents a verdict and it never signs on your behalf. Signing without a check is marked in your activity log.",
      },
      {
        question: "Is this just another warning I will learn to click through?",
        answer:
          "That is the real failure mode of this whole category, so Baret is built the other way around. You choose a rule set once, and after that a block is a block. Baret does not ask you to interpret a risk score in the moment.",
      },
      {
        question: "Can I use it with the wallet I already have?",
        answer:
          "Yes. Baret registers as a standard wallet, so it appears in the same picker as the others. You can install it without removing anything.",
      },
      {
        question: "Does Baret slow me down?",
        answer:
          "One simulation and one round trip, usually well under a second on testnet. Nothing else in the flow changes.",
      },
      {
        question: "What does Blocked actually do?",
        answer:
          "Baret refuses to sign. You can override, but that is a separate step, it is deliberate, and it is written to your log so you can find it later.",
      },
      {
        question: "Who writes the rules?",
        answer:
          "You do. Start from Strict, Balanced or Permissive, then change any single rule. The policy is plain JSON that you own, and you can export it.",
      },
      {
        question: "Is it free?",
        answer:
          "Yes, and the source is public under the MIT licence. There is no fee taken from your transactions, now or later.",
      },
      {
        question: "When is mainnet?",
        answer:
          "Testnet today. Mainnet after store review and more real use. We would rather ship the firewall late than wrong.",
      },
    ],
  },

  cta: {
    title: "Sign with your eyes open.",
    body: "Open the showcase, connect a wallet, and watch Baret refuse a drainer in real time.",
    actions: {
      primary: { label: "Open the showcase", href: "/showcase" },
      secondary: { label: "Install the wallet", href: "/install" },
    },
    note: "Free and open source. Monad testnet. Store listing pending review.",
  },
} as const;

export type HomeContent = typeof home;
