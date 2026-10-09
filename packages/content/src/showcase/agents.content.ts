/**
 * /agents on apps/showcase.
 *
 * Audience: a developer who is about to give an autonomous agent access to
 * money and is nervous about it. Sell the boundary, not fear.
 *
 * Section order (page plan, 2026-09-28): hero, problem, layer diagram, control
 * model, three steps, quickstart, chooser, fail-closed, revoke flow, policy
 * picker, live playground, FAQ, CTA.
 *
 * Research notes that shaped this page:
 *  - Nobody in the agent-wallet category leads with "simulate before signing".
 *    That is our opening line and we keep it concrete.
 *  - Revocation is an afterthought everywhere else. It gets its own section.
 *  - "Guardrails" is a dead word, four vendors use it interchangeably. Banned.
 *  - The x402 client side is unwritten. Everyone explains how to charge an
 *    agent. Nobody explains what the agent should check before it pays.
 *  - Docs that work read: one sentence, then one command.
 *
 * API names follow docs/ARCHITECTURE.md sections 8.5 and 8.6. Code samples are
 * arrays of lines so the copy linter reads them line by line; the page joins
 * them with newlines. Samples use a local server, never a hosted domain.
 */

export const agents = {
  meta: {
    title: "Pre-sign checks for AI agents · Baret",
    description:
      "Baret simulates every transaction your AI agent builds on Monad and checks it against your policy before the key signs. A vault caps what it spends.",
  },

  hero: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "SDK · CLI · MCP tools",
    title: "Your agent signs. Baret checks first.",
    body: "Baret simulates every transaction your agent builds and checks it against your policy before the key signs. When a rule says no, your agent stops instead of signing blind. A vault on Monad caps what it can spend.",
    actions: {
      primary: { label: "Read the quickstart", href: "#quickstart" },
      secondary: { label: "Try the playground", href: "#playground" },
    },
    install: "git clone https://github.com/HackerFetch/Baret-Metropolis",
    /** Shown under the install line until the kit is on npm. */
    installStatus:
      "Not on npm yet. After the clone, pnpm install, then use @baret/agent-kit and the baret CLI from the workspace.",
  },

  /** The argument. Concrete over scary. */
  /** Not rendered on /agents since 2026-10-03 (folded into other blocks or cut for simplicity). */
  problem: {
    eyebrow: "The problem",
    title: "An agent key signs whatever it is handed.",
    body: "A private key cannot hold a limit, name a merchant or be narrowed after you hand it over. Whatever the agent is told to sign, the key signs.",
    points: [
      "An x402 client pays a 402 response as written. Nothing compares the address, the token or the amount with what the agent expected.",
      "A model cannot reliably tell instructions from data. A poisoned page, prompt or tool can decide what it signs.",
      "A leaked agent key has no ceiling. Everything the key can reach, whoever holds it can move.",
    ],
  },

  /** The layer diagram. Each layer works alone; stacked, a gap in one still
   *  meets the next. `flow` is the path one transaction takes, for the
   *  diagram itself. */
  layers: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "How it fits",
    title: "Three layers between your agent and your money.",
    body: "Each layer works on its own. Stack them and a gap in one still meets the next.",
    /** Not rendered on /agents since 2026-10-03. */
    flow: [
      "Your agent builds a transaction",
      "The signer asks Baret",
      "Baret simulates and checks it",
      "Your policy decides",
      "The key signs, or the signer throws",
      "Payments meet the vault caps on-chain",
    ],
    items: [
      {
        title: "The check",
        body: "Baret simulates the transaction over Alchemy RPC without sending it. Nine detectors read the result. Your policy decides what blocks.",
        points: [
          "Simulate on Monad",
          "Run nine detectors",
          "Compare an x402 payment with its 402",
          "Apply your policy",
        ],
      },
      {
        title: "The guarded signer",
        body: "Asks Baret first and signs only what Baret clears. The HTTP API is live. The TypeScript SDK and the CLI work today from a clone of the repository, not yet from npm.",
        points: [
          "HTTP API, works today",
          "TypeScript SDK (@baret/agent-kit), works today",
          "CLI (baret), works today",
          "Agent wallets from Dynamic, works today",
        ],
      },
      {
        title: "The vault",
        body: "PaymentGuard holds the agent's budget in a contract on Monad. The agent key can only call pay, to merchants you listed, inside the caps you set.",
        points: [
          "Per-payment cap for each merchant",
          "Rolling 24-hour cap",
          "Only you deposit and withdraw",
          "Revoke in one call",
        ],
      },
    ],
    note: "Skip the check and the vault still says no. A payment over a cap, or from a revoked key, reverts in the contract.",
  },

  /** A real agent's own payments, read live from the indexer (H6, 2026-10-09).
   *  Serves the Dynamic and Envio prizes together: a deployed agent wallet
   *  with delegated access, and a frontend consuming the indexer's data.
   *  The vault is the demo PaymentGuard vault (docs/CONTRACTS.md §2), whose
   *  token is USDC; the agent is its authorised agent since 2026-10-05. */
  liveAgent: {
    title: "A real agent, paying from a real vault.",
    body: "This agent is a Dynamic server wallet, authorised on a PaymentGuard vault on Monad testnet. Every payment below is real, read live from the Envio indexer.",
    agent: "0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353",
    vault: "0x0A82671420114E47c672D5e8e23017DdCE850A35",
    labels: { agent: "Agent", vault: "Vault", merchant: "Merchant" },
    explorer: "https://testnet.monadexplorer.com",
    view: "View {hash} on the explorer",
    loading: "Reading the agent's payments...",
    /** Announced once the list is in. */
    shown: "Showing the agent's {count} latest payments.",
    shownOne: "Showing the agent's one payment.",
    empty: {
      title: "No payments yet",
      body: "This agent has not paid from its vault yet.",
    },
    /** The vault's latest payments (the most one answer holds) are all
     *  someone else's, so older ones may still be this agent's. */
    notRecent: {
      title: "No recent payments",
      body: "None of the vault's latest {count} payments are this agent's. Its full history is on the explorer.",
    },
    unavailable: {
      title: "History unavailable",
      body: "The indexer did not answer. Nothing is hidden, ask again in a moment.",
    },
    /** Links to /review (M5, "part 3 answered" in tasks/FOR_HALE.md): a
     *  different demo agent, reviewed live by Qwen before it pays. */
    reviewLink: { label: "Watch Qwen review an agent's payment", href: "/review" },
  },

  /** Who decides what. A control table earns more trust than a page of
   *  security prose. */
  /** Not rendered on /agents since 2026-10-03 (folded into other blocks or cut for simplicity). */
  control: {
    eyebrow: "Control model",
    title: "A leash, a budget and a kill switch.",
    body: "The model decides what to try. It never decides what is allowed, how much it may spend or whether it keeps its key.",
    items: [
      {
        short: "Leash",
        title: "Your policy",
        body: "Which contracts, allowances, tokens and merchants the agent may touch. Baret checks it before every signature.",
      },
      {
        short: "Budget",
        title: "The vault caps",
        body: "A per-payment cap and a rolling 24-hour cap for each merchant. The contract enforces them, not your code.",
      },
      {
        short: "Kill switch",
        title: "Your revoke",
        body: "One owner call ends the agent key on-chain. The agent does not have to agree.",
      },
    ],
    evidence: {
      title: "Evidence is not a decision.",
      body: "Findings list everything Baret saw, every time. Your policy decides which of them may block. A finding that does not block still comes back, so you can log it.",
    },
    caps: {
      title: "Two places hold a cap.",
      body: "Your policy checks per-payment, hourly and daily caps before the key signs. The vault checks its per-payment and rolling 24-hour caps again when the payment lands.",
    },
    columns: { subject: "Decision", who: "Made by", note: "Where it lives" },
    rows: [
      { subject: "What to try next", who: "The agent", note: "Your code" },
      {
        subject: "What the transaction would do",
        who: "Baret",
        note: "Simulation and nine detectors",
      },
      { subject: "Whether it may be signed", who: "Your policy", note: "A JSON object you own" },
      {
        subject: "How much a merchant can take",
        who: "PaymentGuard",
        note: "A contract on Monad",
      },
      {
        subject: "Whether the agent keeps its key",
        who: "You",
        note: "One owner call, any time",
      },
    ],
  },

  steps: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "How it works",
    /** Not rendered on /agents since 2026-10-03. */
    title: "Three steps.",
    items: [
      {
        short: "Install",
        title: "Install the kit",
        body: "Clone the repository and run pnpm install. @baret/agent-kit and the baret CLI then work from the workspace, and any language can call the HTTP API.",
      },
      {
        short: "Policy",
        title: "Define a policy",
        body: "Start from Strict, Balanced or Permissive, then change any single rule. The policy is plain JSON that you own and can version.",
      },
      {
        short: "Wrap",
        title: "Wrap your signer",
        body: "Replace your send call with guardedSubmit. Safe means it signs and sends. Blocked, or Caution unless you allow it, means it throws before the key runs.",
      },
    ],
  },

  quickstart: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "Quickstart",
    title: "From install to your first blocked transaction.",
    /** Accessible name of the HTTP API / TypeScript / any language picker. */
    tabs: "Show the code for",
    /** Under a sample whose package or endpoint does not exist yet. Such a sample has no copy button. */
    planned: "Planned. Not published yet, so this code does not run today.",
    /** The one path that works today: the analysis server's own endpoint. */
    http: {
      title: "HTTP API",
      before: "Works today. Start the server locally and post an unsigned transaction to it.",
      code: [
        "curl -X POST http://localhost:8080/v1/analyze \\",
        '  -H "content-type: application/json" \\',
        "  -d '{",
        '    "network": "testnet",',
        '    "transaction": {',
        '      "from": "<agent address>",',
        '      "to": "<contract address>",',
        '      "value": "0",',
        '      "data": "0x"',
        "    }",
        "  }'",
      ],
      after:
        "The answer carries a decision: safe, caution or blocked. An agent signs only on safe, since a caution is for a person to read. No answer means no signature.",
    },
    sdk: {
      title: "TypeScript",
      before:
        "Wrap the signer, then send the way you already do. Works today, from a clone of the repository.",
      code: [
        'import { AgentWallet, localSigner } from "@baret/agent-kit";',
        'import { type Hex, parseEther } from "viem";',
        "",
        "const agent = new AgentWallet({",
        "  signer: localSigner(process.env.BARET_AGENT_PRIVATE_KEY as Hex),",
        '  baretUrl: "http://localhost:8080",',
        '  rpcUrl: "https://testnet-rpc.monad.xyz",',
        '  policyTemplate: "balanced",',
        "});",
        "",
        "const { hash } = await agent.guardedSubmit({",
        '  to: "0x...",',
        '  value: parseEther("0.1"),',
        "});",
        'console.log("sent", hash);',
      ],
      after:
        "A Blocked answer, or a Caution unless allowCaution is set, throws GuardBlockedError. The key never signed, so there is nothing to undo.",
    },
    cli: {
      title: "Any language",
      before:
        "Settings come from the environment or packages/agent-kit/.env, never from flags, so a key never lands in shell history. Works today, from a clone of the repository.",
      code: [
        "# packages/agent-kit/.env (git-ignored), read by the baret script:",
        "# BARET_AGENT_PRIVATE_KEY=0x...",
        "cd packages/agent-kit",
        "export BARET_POLICY_TEMPLATE=balanced",
        "",
        "pnpm baret address    # prints the agent address",
        "pnpm baret analyze --to 0x... --value 100000000000000000",
        "pnpm baret submit --to 0x... --value 100000000000000000",
      ],
      after:
        "Exit 0 means Baret cleared it (for submit, it was also sent). Exit 1 means Baret did not clear it, or Qwen vetoed it when QWEN_API_KEY is set, and nothing was signed. Exit 2 means anything else went wrong, such as Baret not answering.",
    },
    /** Three levels of involvement, smallest first. */
    /** Not rendered on /agents since 2026-10-03. */
    levels: {
      title: "Pick how much Baret does",
      items: [
        {
          name: "evaluate",
          body: "Returns allow or block, with the reasons. Your code signs, or does not.",
        },
        {
          name: "guardedSign",
          body: "Signs only when the answer is allow. Your code sends it.",
        },
        {
          name: "guardedSubmit",
          body: "Signs and sends only when the answer is allow.",
        },
      ],
    },
    /** For a wallet or dApp that only wants the decision. */
    /** Not rendered on /agents since 2026-10-03. */
    guard: {
      title: "Only want the decision?",
      before: "The guard SDK never signs and never sends. It returns a decision.",
      code: [
        'import { TransactionGuard } from "@baret/guard";',
        "",
        "const { decision, blockingReasons } = await TransactionGuard.evaluate({",
        "  transaction,",
        "  userWallet,",
        "  policy,",
        "});",
        "",
        'if (decision === "block") return blockingReasons;',
      ],
    },
    /** Plain first, raw on demand. Collapsed by default. */
    /** Not rendered on /agents since 2026-10-03. */
    raw: {
      toggle: "Show the raw request and response",
      request: {
        label: "You send",
        code: [
          "POST http://localhost:8080/v1/analyze",
          "{",
          '  "network": "testnet",',
          '  "transaction": {',
          '    "from": "<agent address>",',
          '    "to": "<token contract>",',
          '    "value": "0",',
          '    "data": "0x095ea7b3..."',
          "  },",
          '  "policy": "balanced"',
          "}",
        ],
      },
      response: {
        label: "You get back",
        code: [
          "{",
          '  "safe": false,',
          '  "reasons": ["Unlimited allowance to a contract Baret does not know."],',
          '  "findingCodes": ["ERC20_APPROVAL_UNLIMITED", "UNKNOWN_CONTRACT_EXPOSURE"],',
          '  "suggestions": ["Approve only the amount this call needs."]',
          "}",
        ],
      },
      note: "Trimmed for length: estimatedChanges, confidence and meta are left out. findingCodes lists everything Baret found. safe is what your policy decided.",
    },
    secrets: {
      title: "About the secret",
      body: "The agent key comes from BARET_AGENT_PRIVATE_KEY, or from a Dynamic server wallet whose key is never whole in one place. Keep it out of the repository, logs and prompts. Better still, give the agent a key that holds only gas and can only call pay on your vault.",
    },
  },

  /** SDK, CLI or MCP, in two sentences each. */
  /** Not rendered on /agents since 2026-10-03 (folded into other blocks or cut for simplicity). */
  chooser: {
    title: "Which one do I want?",
    items: [
      {
        name: "SDK",
        body: "Your agent runs on TypeScript or Node. Wrap the signer and a block becomes an exception.",
      },
      {
        name: "CLI",
        body: "Your agent is Python, Go, a shell script or anything else. Pipe the transaction in and read the exit code.",
      },
      {
        name: "MCP tools",
        body: "Your agent picks its own tools. Pair it with the vault, because a model can skip a tool and the contract cannot be skipped.",
      },
    ],
  },

  /** Not rendered on /agents since 2026-10-03 (folded into other blocks or cut for simplicity). */
  failClosed: {
    eyebrow: "When Baret is down",
    title: "No answer means no signature.",
    body: "If Baret cannot finish a check, evaluate throws and nothing is signed. The server may be down, the simulation may fail or a data source may not answer. Each of those counts as Blocked.",
    note: "There is no flag that skips the check. Your agent can retry later, but it cannot sign around it.",
  },

  /** The revoke flow, in the order an owner reaches for it. */
  /** Not rendered on /agents since 2026-10-03 (folded into other blocks or cut for simplicity). */
  revoke: {
    eyebrow: "Revoke",
    title: "One call ends it.",
    body: "Call revokeAgentSigner on the vault and the agent key stops working on-chain. Any payment that lands after it reverts, even one the agent signed before. The agent does not have to cooperate, and your funds stay in the vault.",
    points: [
      "revokeAgentSigner: the agent key can no longer pay anyone.",
      "revokeMerchant: one merchant comes off the list. The rest keep working.",
      "setMerchantCap: lower a cap without ending anything.",
      "withdraw: take back what active merchants do not have reserved.",
    ],
    note: "The revoke is final when its block is: 800 ms on Monad. You can also revoke from the Agents page of the Baret wallet.",
  },

  /** Template descriptions stay inside what the rule fields express. No
   *  numbers: there is no template file with values yet. */
  policySelector: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "Policy",
    title: "Pick a starting policy.",
    /** Not rendered on /agents since 2026-10-03. */
    body: "The code samples and the playground use the one you pick. You can change any rule afterwards.",
    options: {
      strict: {
        name: "Strict",
        body: "Any finding blocks, even one that breaks no rule. For an agent with a budget you would miss.",
      },
      balanced: {
        name: "Balanced",
        body: "The default. Findings that break a rule block. Caution findings pass, with the reasons attached.",
      },
      permissive: {
        name: "Permissive",
        body: "Fewer rules switched on, so less blocks. Every finding still comes back, so you can log what passed.",
      },
    },
    note: "Every template blocks when Baret cannot finish a check. No rule changes that.",
  },

  /**
   * Nothing here is a result. The eight actions answer from prepared samples;
   * a pasted transaction goes to the analysis server only in a live build.
   * Action descriptions say what the agent tries; they never say what Baret
   * will find.
   */
  playground: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "Playground",
    title: "Watch an agent ask first.",
    body: "Pick something an agent might try and a starting policy. The playground shows what your agent would get back for a prepared example.",
    picker: {
      label: "What the agent tries",
      items: {
        pay: {
          label: "Pay a listed merchant",
          body: "A small USDC payment to a merchant on the list, inside its caps.",
        },
        unlimitedAllowance: {
          label: "Approve unlimited USDC",
          body: "An allowance with no ceiling, to a router Baret has not seen before.",
        },
        wrongPayee: {
          label: "Pay a 402 to the wrong address",
          body: "The payment goes to an address the 402 response never named.",
        },
        lookalikeToken: {
          label: "Pay with a look-alike token",
          body: "The token is called USDC, but it is not the USDC contract on your list.",
        },
        operatorApproval: {
          label: "Hand over an NFT collection",
          body: "An operator approval over every item in a collection, now and later.",
        },
        flaggedAddress: {
          label: "Send to a flagged address",
          body: "A transfer to an address on the ReputationRegistry's flagged list.",
        },
        cleanverseVerified: {
          label: "Pay aUSDC to a verified wallet",
          body: "A transfer of aUSDC, a compliant asset, between two wallets that hold a Cleanverse identity credential: the shape of a Travel Rule-compliant payment.",
        },
        cleanverseNoCredential: {
          label: "Pay aUSDC to a wallet with no credential",
          body: "A transfer of aUSDC to a wallet that holds no Cleanverse identity credential.",
        },
      },
      custom: {
        label: "Paste your own",
        body: "Any unsigned Monad transaction, as raw hex or JSON.",
      },
    },
    fields: {
      address: {
        label: "Agent address",
        hint: "Any Monad address. Use the button for a random one.",
      },
      network: { label: "Network", hint: "The playground runs on testnet." },
      /** Not rendered on /agents since 2026-10-03 (the picker sits right above the form). */
      policy: { label: "Policy", hint: "Comes from the picker above." },
      transaction: {
        label: "Transaction",
        hint: "Raw hex, or JSON with from, to, value and data.",
        placeholder: '0x02f8... or { "to": "0x...", "data": "0x..." }',
      },
    },
    randomAddress: { label: "Use a random address" },
    action: { label: "Check it as the agent" },
    /** Terminal lines, printed in order as the check runs. */
    terminal: {
      asking: "agent > asking Baret before signing",
      safe: ["baret > Safe. No rule broken.", "agent > signing and sending."],
      caution: [
        "baret > Caution. {count} findings, no rule broken.",
        "agent > signing and logging the findings.",
      ],
      /** The first caution line when there is exactly one finding. */
      cautionOne: "baret > Caution. {count} finding, no rule broken.",
      blocked: ["baret > Blocked. Rule: {rule}", "agent > refusing to sign. transaction dropped."],
      unreachable: ["baret > no answer", "agent > no check, no signature. stopping."],
      notSent: ["baret > not sent, nothing checked", "agent > no check, no signature. stopping."],
      /** Rule names that read better as a reason than the policy toggle's label. */
      ruleNames: { allowWarnings: "Caution not allowed by this policy" },
      /** After "Rule:" when this page cannot name the rule (a live answer, or no single rule). */
      ruleFallback: "see the findings",
    },
    result: {
      safe: { label: "Safe", body: "Allowed. Your agent signs and sends." },
      caution: {
        label: "Caution",
        body: "Allowed. Nothing broke a rule, but a check found something. The findings come back with the answer.",
      },
      blocked: {
        label: "Blocked",
        body: "Your agent never signs. It gets the rule that fired and every finding.",
      },
      unreachable: {
        label: "Can't reach Baret",
        body: "The check did not finish, so this counts as Blocked. Your agent signs nothing.",
      },
      notSent: {
        label: "Not checked",
        body: "This demo did not send the transaction, so this counts as Blocked. Your agent signs nothing.",
      },
      findings: "Findings",
      noFindings: "No findings. Every check ran and found nothing to report.",
      changes: "What would change",
      /** Not rendered on /agents since 2026-10-03. */
      rawToggle: "Show the raw response",
    },
    empty: {
      title: "Nothing checked yet",
      body: "Pick an action, or paste a transaction, to see what your agent would get back.",
    },
    errors: {
      unreadable: {
        title: "That transaction could not be read",
        body: "Paste raw hex, or JSON with from, to, value and data.",
      },
      address: {
        title: "That address could not be read",
        body: "Use 0x and 40 hex digits, or the button for a random one.",
      },
      /** Not rendered on /agents since 2026-10-03 (a failed live check shows `result.unreachable`). */
      rateLimited: {
        title: "Too many checks at once",
        body: "The playground server is rate limited. Wait a moment, then run it again.",
      },
      /** Not rendered on /agents since 2026-10-03 (a failed live check shows `result.unreachable`). */
      unreachable: {
        title: "Can't reach Baret",
        body: "The check did not run, so your agent would sign nothing. Try again in a moment.",
      },
    },
    note: "To check a real transaction, start the server locally and post it to /v1/analyze, as the HTTP API sample shows.",
    /** Shown only when this build sends live checks to the server. */
    liveNote:
      "Every check here, the eight actions and a pasted transaction alike, goes to the same /v1/analyze endpoint, on a rate-limited testnet server.",
    /** Shown instead when this build sends only a pasted transaction live. */
    livePasteNote:
      "A pasted transaction goes to the /v1/analyze endpoint, on a rate-limited testnet server. The eight actions answer from prepared samples.",
    /** Shown under the button while one of the eight actions is picked, when this build does not send them live. */
    sample: "Prepared sample answers. The eight actions are not sent to Baret's server.",
    /** Shown under the button for a pasted transaction when this build sends nothing. */
    notSent:
      "This demo does not send pasted transactions yet. Nothing is checked, so the answer is Blocked.",
    footnote:
      "Per-agent activity needs an authenticated server, so it is not part of this public playground.",
    /** Not rendered on /agents since 2026-10-03. */
    more: { label: "Wire this into your own agent", href: "#quickstart" },
  },

  faq: {
    /** Not rendered on /agents since 2026-10-03. */
    eyebrow: "FAQ",
    title: "Fair questions",
    items: [
      {
        question: "Does Baret ever hold my agent's key?",
        answer:
          "No. The key stays with you: in your process, or split between your machine and Dynamic for a Dynamic server wallet. Baret gets the unsigned transaction and returns a decision. The server never sees a key and never signs. The vault holds what you deposit, and only you can withdraw it.",
      },
      {
        question: "What if the agent ignores the answer?",
        answer:
          "With the HTTP API alone, nothing in your code stops it, so sign only on safe. AgentWallet refuses on its own: a call Baret does not clear never reaches the signer. Either way, the vault still enforces its caps in the contract.",
      },
      {
        question: "What if the agent key leaks?",
        answer:
          "A vault agent key can only call pay. Every payment still meets the per-payment and rolling 24-hour caps, and you can revoke the key in one call.",
      },
      {
        question: "What does Blocked mean?",
        answer:
          "The transaction broke one of your rules, or a check could not finish. It does not mean someone is malicious. The findings say which rule fired and why.",
      },
      {
        question: "Should my agent retry a blocked transaction?",
        answer:
          "No. A block is the answer, not a glitch. Retry only when /v1/analyze does not answer or answers with an error, because then the check did not finish.",
      },
      {
        question: "How fast is it?",
        answer:
          "Each transaction costs one round trip to the server and one simulation, before the key signs. There is no published latency figure yet. Measure it on your own traffic.",
      },
      {
        question: "Can I use it without the vault?",
        answer:
          "Yes. Calling the HTTP API before each signature works on its own and is the smaller change. The vault is what limits the damage when the key itself leaks.",
      },
      {
        question: "Which policy should an agent start with?",
        answer:
          "Balanced, with caps set to what you could lose in a day without trouble. Tighten it once you have seen real traffic.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Not for the playground. A server you run yourself can require an API key: list the keys in BARET_API_KEYS and send one in the x-api-key header.",
      },
    ],
  },

  cta: {
    title: "Your agent stops instead of signing blind.",
    body: "Pick a policy and call the HTTP API today, or use the SDK and the CLI from a clone of the repository. A transaction that breaks your rules ends as an error in your logs, not as a signature.",
    actions: {
      primary: { label: "Read the quickstart", href: "#quickstart" },
      secondary: { label: "Read the vault spec", href: "/docs#contracts-and-payments" },
    },
  },
} as const;

export type AgentsContent = typeof agents;
