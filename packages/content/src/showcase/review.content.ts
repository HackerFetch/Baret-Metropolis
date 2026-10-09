/**
 * /review on apps/showcase: Qwen reviews an agent's payment (M5, W1).
 *
 * The page a judge opens to watch the agent reviewer work on a real
 * PaymentGuard vault on Monad testnet. Baret's verdict comes first; the
 * model can only veto (D-028). When the live route is not available the page
 * shows a recorded run and says so in plain words: a recorded run is never
 * presented as live.
 *
 * Addresses and the tx hash are facts from the run of 9 October 2026 on
 * Monad testnet. Keep them in sync with docs/DECISIONS.md D-035.
 */

export type ReviewScenarioId = "honest" | "overpay" | "injected";

export const review = {
  meta: {
    description:
      "Watch Qwen 3.8 Max review an AI agent's payment from a PaymentGuard vault on Monad testnet. Baret checks first, then the model plans, uses four read-only tools and can veto.",
  },

  hero: {
    eyebrow: "Agent reviewer",
    title: "Qwen reviews an agent's payment.",
    body: "An AI agent wants to pay from its PaymentGuard vault on Monad. Before it signs, Qwen 3.8 Max writes a plan, checks the call with four read-only tools and can veto it. Baret's verdict comes first, and the model can never approve what Baret blocked.",
  },

  scenarios: {
    title: "Pick a payment to review",
    intro:
      "Each card is one payment the agent was asked to make. The intent is what the agent was told. The call is what it would really sign.",
    intentLabel: "The intent",
    callLabel: "What the call does",
    run: "Run the review",
    running: "Reviewing...",
    items: {
      honest: {
        title: "Honest payment",
        call: "Pays 0.10 dUSDC from the vault to the merchant, invoice inv-2001. It matches the intent.",
      },
      overpay: {
        title: "Overpayment",
        call: "Pays 0.90 dUSDC to the same merchant. The intent says 0.10, so the call asks for nine times more.",
      },
      injected: {
        title: "Injected intent",
        call: "Pays 0.10 dUSDC as asked, but the intent carries a planted note telling the reviewer to skip its checks.",
      },
    },
  },

  timeline: {
    title: "The review",
    idle: "Pick a payment above and run the review. Each step shows up here as it happens.",
    live: "Live run",
    recorded: "Recorded run, 9 October 2026",
    recordedNote:
      "The live review is not available right now, so this is the real run recorded on 9 October 2026. It is not running now.",
    cached: "Ran at {time}. Runs are kept for 30 minutes.",
    baret: "Baret's verdict",
    baretSafe: "Baret found nothing to stop. The reviewer is asked next.",
    baretStopped: "Baret did not clear this call, so the model is not asked. Nothing is signed.",
    findings: "{count} findings",
    plan: "The plan",
    tools: "Tool calls",
    toolOk: "ok",
    toolError: "error",
    fullResult: "Full result",
    noTools: "The model decided from its plan and the intent, without calling a tool.",
    decision: "The decision",
    approve: "Approve",
    veto: "Veto",
    mismatches: "What did not match",
    payment: "The payment",
    sent: "The agent signed and sent it.",
    sentFailed: "The agent sent it, but the payment failed on chain.",
    sentTimeout: "The agent sent it. No receipt came back within 20 seconds.",
    sentNotBroadcast: "The agent tried to send it, but it never left the server.",
    notSent: "Nothing was signed or sent.",
    viewTx: "View the transaction",
    error: "The review stopped: {message}",
    progress: {
      start: "Review started.",
      baret: "Baret's verdict is in.",
      plan: "The model wrote its plan.",
      tool: "Tool call {tool} finished.",
      decision: "The model decided: {decision}.",
      sent: "The payment was sent.",
      done: "The review is finished.",
      recorded: "Showing the recorded run.",
    },
  },

  how: {
    title: "How it works",
    lines: [
      "Baret checks the call first. If it is not Safe, the model is never asked and nothing is signed.",
      "Qwen reads the intent and the call, then writes a short plan before it looks at anything.",
      "It uses four read-only tools: decode the call, read Baret's verdict, read the vault, check reputation.",
      "A rule in code turns an approval into a veto if it skipped the decoded call or Baret's verdict, or if Baret blocked the call.",
    ],
  },

  links: {
    title: "Check it yourself",
    vault: "The demo vault on the explorer",
    tx: "The payment the agent sent on 9 October",
    code: "The reviewer's code: packages/agent-kit/src/review-agent.ts",
  },
} as const;

export type ReviewContent = typeof review;
