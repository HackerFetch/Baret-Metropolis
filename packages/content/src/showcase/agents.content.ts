/**
 * /agents on apps/showcase.
 *
 * Audience: a developer who is about to give an autonomous agent access to
 * money and is nervous about it. Sell the boundary, not fear.
 *
 * Research notes that shaped this page:
 *  - Nobody in the agent-wallet category claims "simulate before signing".
 *    That is our opening line and we keep it concrete.
 *  - Revocation is an afterthought everywhere else. It gets its own section.
 *  - "Guardrails" is a dead word, four vendors use it interchangeably. Banned.
 *  - The x402 client side is unwritten. Everyone explains how to charge an
 *    agent. Nobody explains what the agent should check before it pays.
 *  - Docs that work read: one sentence, then one command.
 */

export const agents = {
  meta: {
    title: "Baret for agents",
    description:
      "Give an AI agent a spending limit instead of a private key. Baret simulates and checks every transaction before the key signs.",
  },

  hero: {
    eyebrow: "SDK and CLI",
    title: "Your agent signs. Baret checks first.",
    body: "An agent with a private key can do anything the key can do. There is no way to say 'only payments, only to these merchants, only up to this much' to a key. Baret adds that sentence. Every transaction your agent builds is simulated and checked against your policy before the key ever touches it.",
    actions: {
      primary: { label: "Read the quickstart", href: "#quickstart" },
      secondary: { label: "Try the playground", href: "#playground" },
    },
    install: "pnpm add @baret/agent-kit",
  },

  /** The argument, in three short paragraphs. Concrete over scary. */
  problem: {
    eyebrow: "The problem",
    title: "A private key can only say yes.",
    body: "The key is not dangerous because it is secret. It is dangerous because it is not expressive. It cannot hold a limit, it cannot name a merchant, and it cannot be narrowed after you hand it over. Anything you build on top of it lives in your own code, where a bug in the agent goes straight around it.",
    points: [
      "A model cannot reliably tell instructions from data. Text that reaches its context can decide what it signs.",
      "An agent that pays over HTTP 402 usually never compares the payment it is about to make with the one the server asked for.",
      "When something goes wrong at three in the morning, you want one place to turn it off.",
    ],
  },

  /** Three layers, each one sentence. This is the whole product. */
  layers: {
    eyebrow: "What you get",
    title: "Three layers between your agent and your money.",
    items: [
      {
        title: "A guarded signer",
        body: "Wrap the signer your agent already uses. Every transaction is decoded, simulated on Monad and checked against your policy. If it fails, the signer throws and the key never runs.",
        points: ["Decode and simulate", "Run the risk detectors", "Apply your policy", "Then sign"],
      },
      {
        title: "A vault with a limit",
        body: "Deposit once into a PaymentGuard vault on Monad and give the agent a signer that can only call pay, inside a per-payment cap and a rolling daily cap. The cap lives in the contract, not in your code.",
        points: [
          "Per-merchant cap",
          "Rolling 24 hour cap",
          "Owner keeps deposit and withdraw",
          "Revoke in one call",
        ],
      },
      {
        title: "An x402 check",
        body: "When your agent hits an HTTP 402, Baret reads what the server actually asked for and compares it with what is about to be paid. Wrong address, wrong asset, or over your cap means the payment is never sent.",
        points: [
          "Compare against the request",
          "Check the asset contract, not its name",
          "Count it against the cap",
          "Return an error, not a payment",
        ],
      },
    ],
  },

  /** Who decides what. Borrowed structure: a control column earns more trust
   *  than a page of security prose. */
  control: {
    eyebrow: "Who decides what",
    title: "Nothing here is decided by the model.",
    columns: { subject: "Decision", who: "Decided by", note: "Where it lives" },
    rows: [
      { subject: "What to do next", who: "The agent", note: "Your code" },
      { subject: "Whether the transaction is safe", who: "Baret", note: "The analysis server" },
      { subject: "Whether it is allowed", who: "Your policy", note: "A JSON object you own" },
      {
        subject: "Whether the payment fits the cap",
        who: "PaymentGuard",
        note: "A contract on Monad",
      },
      { subject: "Whether the agent still has access", who: "You", note: "One call, any time" },
    ],
  },

  steps: {
    eyebrow: "How it works",
    title: "Three steps.",
    items: [
      {
        short: "Install",
        title: "Add the kit",
        body: "One package for TypeScript and Node. From any other language, use the CLI and pipe it a transaction.",
      },
      {
        short: "Choose",
        title: "Pick a policy",
        body: "Start from Strict, Balanced or Permissive, then change any single rule. The policy is plain JSON that you own and can version.",
      },
      {
        short: "Wrap",
        title: "Wrap your signer",
        body: "Swap sendTransaction for guardedSubmit. Safe means it signs and sends. Blocked means it throws before the key is touched.",
      },
    ],
  },

  quickstart: {
    eyebrow: "Quickstart",
    title: "Two minutes, from nothing to a blocked transaction.",
    sdk: {
      title: "TypeScript",
      before: "Wrap the signer and send a transaction the way you already do.",
      after:
        "A blocked transaction throws GuardBlockedError. The key never signs, so there is nothing to undo.",
    },
    cli: {
      title: "Any language",
      before: "Pipe a transaction to the CLI and read the exit code.",
      after:
        "Exit 0 means it was sent. Exit 1 means your policy blocked it. Exit 2 means Baret itself failed.",
    },
    secrets: {
      title: "About the secret",
      body: "The agent key is read from BARET_AGENT_SECRET and is never written to a file, a log or a prompt. If you are giving an agent a key at all, give it one that only holds gas and can only call pay on your vault.",
    },
  },

  failClosed: {
    eyebrow: "When Baret is down",
    title: "No answer means no signature.",
    body: "If the analysis server cannot be reached, evaluate throws and nothing is signed. That is the default and it is deliberate. An agent that keeps signing when the check is unavailable is an agent with no check.",
    note: "You can opt out per call if you know what you are doing. It is logged as an unchecked signature.",
  },

  revoke: {
    eyebrow: "Turning it off",
    title: "One call ends it.",
    body: "Call revokeAgentSigner on the vault and the agent's key is dead on-chain. Any payment it attempts after that reverts, including one it signed a second earlier. You do not need the agent to cooperate and you do not need to move any funds.",
    points: [
      "Revoke the signer to stop every future payment",
      "Set a merchant cap to zero to stop one merchant",
      "Pause the vault to stop everything without losing the setup",
      "Withdraw to take back what is left",
    ],
  },

  policySelector: {
    title: "Pick a starting policy",
    body: "The examples below update when you change this. Any rule can be changed afterwards.",
  },

  playground: {
    eyebrow: "Playground",
    title: "Run a real transaction through it.",
    body: "This calls the same analysis the SDK calls. Paste an unsigned transaction and see exactly what your agent would get back.",
    fields: {
      address: {
        label: "Agent address",
        hint: "Any Monad address. Use the button for a random one.",
      },
      network: { label: "Network", hint: "Testnet only for now." },
      policy: { label: "Policy", hint: "Comes from the selector above." },
      transaction: {
        label: "Transaction",
        hint: "Raw hex, or JSON with from, to, value and data.",
        placeholder: '0x02f8... or { "to": "0x...", "data": "0x..." }',
      },
    },
    action: { label: "Check it" },
    result: {
      allow: "Allowed. Your agent would sign this.",
      block: "Blocked. Your agent would get an error and nothing would be signed.",
      advisory:
        "Allowed with a warning. Your agent would sign, and the warning is in the response.",
      empty: "Paste a transaction to see what your agent would get back.",
      error: "That transaction could not be read. Check that it is valid hex or valid JSON.",
    },
    note: "This talks to a rate-limited testnet server, so there is nothing to install. To run your own, start the server locally and point serverUrl at it.",
  },

  faq: {
    title: "Fair questions",
    items: [
      {
        question: "Does Baret ever hold my agent's key?",
        answer:
          "No. The key stays in your process. Baret receives an unsigned transaction, returns a decision, and your code decides what to do with it. The analysis server never sees a key and never signs anything.",
      },
      {
        question: "What happens if the agent ignores the result?",
        answer:
          "It cannot, if you use the guarded signer, because the signer refuses. If you call evaluate yourself and ignore the answer, the vault is still there: the cap is enforced by the contract, not by your code.",
      },
      {
        question: "How fast is it?",
        answer:
          "One simulation and one round trip. On testnet that is usually well under a second. For a payment loop that runs every few seconds, that is the cost of not blind-signing.",
      },
      {
        question: "Can I use it without the vault?",
        answer:
          "Yes. The guarded signer works on its own and is the smaller change. The vault is what protects you when the key itself leaks.",
      },
      {
        question: "Which policy should an agent start with?",
        answer:
          "Balanced, with the spending caps set to what you would be comfortable losing in a day. Tighten from there once you see real traffic in the activity log.",
      },
      {
        question: "Is it free?",
        answer:
          "Yes, and the source is public. The hosted analysis server is rate limited and testnet only.",
      },
    ],
  },

  cta: {
    title: "Give it a limit instead of a key.",
    body: "Install the kit, pick a policy, and watch the first blocked transaction in your own logs.",
    actions: {
      primary: { label: "Read the quickstart", href: "#quickstart" },
      secondary: { label: "See the contract", href: "/docs#contracts" },
    },
  },
} as const;

export type AgentsContent = typeof agents;
