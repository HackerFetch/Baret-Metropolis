# @baret/agent-kit

A guarded wallet for AI agents on Monad: every call goes through Baret's `/v1/analyze` before it is signed, and a call Baret does not clear is never signed, not retried, not sent anyway. Pair it with `contracts/src/PaymentGuard.sol` and the agent never holds a raw, unbounded key — only a signer scoped to a vault's caps.

## Install

Not published; clone the repository and use it from the workspace.

```
git clone https://github.com/HackerFetch/Baret-Metropolis
cd Baret-Metropolis
pnpm install
```

## The smallest working call

```ts
import { AgentWallet, GuardBlockedError, localSigner } from "@baret/agent-kit";

const agent = new AgentWallet({
  signer: localSigner("0x..."), // a key held in memory; a deployed agent uses Dynamic (dynamicSigner)
  baretUrl: "https://baret-monad-api.onrender.com",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  policyTemplate: "balanced",
});

try {
  const { hash, verdict } = await agent.guardedSubmit({
    to: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
    value: 100_000_000_000_000_000n, // 0.1 MON
  });
  console.log("sent", hash);
} catch (err) {
  if (err instanceof GuardBlockedError) {
    console.log("blocked, nothing signed:", err.verdict.findings.map((f) => f.code));
  } else {
    throw err;
  }
}
```

Run live against Monad testnet on 2026-10-09, with an address Baret has flagged as a drainer's sink, this is what it prints. The key was a fresh one with no MON, so the simulation fails too; a funded key gets `KNOWN_MALICIOUS_ADDRESS` alone, as in `@baret/guard`'s example:

```
blocked, nothing signed: [ 'SIMULATION_FAILED', 'KNOWN_MALICIOUS_ADDRESS' ]
```

`guardedSubmit` checks, then prepares, signs and broadcasts in one call; `guardedSign` stops after signing and leaves broadcast to you; `evaluate` only asks, for an agent that wants to read the verdict before deciding anything. `agent.allows(verdict)` is the one-line check: `true` for `safe`, and for `caution` only when `allowCaution` is set — a Caution carries findings meant for a person to read, and by default an agent cannot sign through one unsupervised.

## From a terminal

Settings come from the environment or from `packages/agent-kit/.env` (git-ignored), which the `baret` script loads; never from flags, so a key never lands in shell history. Put the signer's key there:

```sh
# packages/agent-kit/.env
BARET_AGENT_PRIVATE_KEY=0x...
```

```sh
pnpm --filter @baret/agent-kit baret analyze --to 0xac9517a70c88480c9fA7E9a280DA485F7f552C29 --value 100000000000000000
```

This one prints the whole verdict and exits `1`: the address is on Baret's blocklist. The commands are `address`, `analyze`, `submit`, `pay`, `review`, `wallet create` and `policy list`; `baret pay --vault <vault> --merchant <merchant> --amount <base units> --ref <text>` pays through a deployed `PaymentGuard` vault instead of a raw transaction. Exit codes: `0` when Baret clears the call (for `submit` and `pay`, once it is sent; for `review`, once the reviewer approves), `1` when Baret does not clear it (Blocked, or Caution without `BARET_ALLOW_CAUTION=1`) or the reviewer vetoes it, and nothing was signed, `2` for anything else. The full list of settings is the comment at the top of `src/cli.ts`: `BARET_API_URL` (default: the live API above), `BARET_API_KEY`, `BARET_NETWORK` (`testnet` unless set; `mainnet` also needs `MONAD_MAINNET_RPC_URL`), `MONAD_TESTNET_RPC_URL`, `BARET_POLICY_TEMPLATE`, `BARET_ALLOW_CAUTION`, the `QWEN_*` settings below, and one signer: `BARET_AGENT_PRIVATE_KEY`, or a Dynamic server wallet (`DYNAMIC_ENVIRONMENT_ID`, `DYNAMIC_AUTH_TOKEN` and `BARET_AGENT_WALLET_PASSWORD`).

## What comes back, and what fail-closed means here

Same contract as `@baret/guard`'s `/v1/analyze` (`../guard/README.md`): `decision`, `findings`, `confidence`. `AgentWallet` adds nothing optimistic on top — a verdict it cannot parse, a server it cannot reach, or a timeout all surface as `GuardUnreachableError` from `evaluate()`, and `guardedSign`/`guardedSubmit` never reach the signer unless the verdict itself says `safe` (or `caution` with `allowCaution: true`). There is no path from "Baret did not answer" to a signature.

## Optional: a second check before the agent signs

Baret answers "is this call dangerous under the rules"; it cannot know what the agent meant to do. Set `reviewer` on `AgentWallet` and every signature also needs the agent's own `intent` (`guardedSubmit(call, { intent })`; `pay` writes a plain one when none is given), which a model compares with the call Baret already cleared. It can veto a call Baret allowed, never clear one Baret blocked: it is asked only about calls Baret cleared, and a missing intent, a model that fails or times out, or an answer off its schema all count as a veto (`ReviewerVetoError`, nothing signed). This is a second, narrower check, not a replacement for Baret's.

- `qwenAgentReviewer({ apiKey, baretUrl })` (`src/review-agent.ts`, also exported as `@baret/agent-kit/review-agent`) is the reviewer as an agent, and the one the CLI uses. Qwen (`qwen3.8-max` on QwenCloud unless `baseUrl` or `model` say otherwise) writes a plan, then calls four read-only tools before it decides: `decode_transaction`, `get_baret_verdict`, `read_vault` (a `PaymentGuard` vault's state and caps, its newest activity, what each merchant was paid in the last hour and day, and whether this payment fits, worked out in code) and `check_reputation`. An approval counts only after it has read the decoded call and Baret's verdict. Each review carries a transcript: the model, the plan, and every tool call with its arguments, result and time.
- `qwenReviewer({ apiKey })` is the earlier one-call reviewer, kept: one prompt over a fixed summary of the call and the verdict, no tools.

From a terminal, `QWEN_API_KEY` turns the agent reviewer on for `submit` and `pay` (`QWEN_BASE_URL` and `QWEN_MODEL` change the endpoint and the model; a `submit` without `--intent` is then vetoed). `baret review --intent <text> [--from 0x..]` with the flags of `pay` (`--vault ...`) or of `submit` (`--to ...`) runs Baret and the reviewer on the same call and never signs, so `--from` can name an account you hold no key for (default: the configured signer's). On `submit`, `pay` and `review`, `--trace` prints the plan, each tool call and the decision on stderr as they happen, and `--transcript <file>` writes Baret's decision and the whole review as JSON, on a veto too. `docs/ARCHITECTURE.md` §8.6 has where each check sits.

## More

- Pre-sign checks without the agent wrapper: [`@baret/guard`](../guard/README.md).
- The vault an agent pays from, its caps and events: `docs/CONTRACTS.md` §2.
- The wallet, the signers, the reviewer and the CLI in one place: `docs/ARCHITECTURE.md` §8.6.
- x402 payments end to end: `docs/X402_FACILITATOR.md`.
