# @baret/agent-kit

A guarded wallet for AI agents on Monad: every call goes through Baret's `/v1/analyze` before it is signed, and a call Baret does not clear is never signed, not retried, not sent anyway. Pair it with [`PaymentGuard.sol`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/contracts/src/PaymentGuard.sol) and the agent never holds a raw, unbounded key, only a signer scoped to a vault's caps.

## Install

```
npm install @baret/agent-kit
```

It brings `@baret/guard` and `@baret/llm` with it, and the `baret` CLI: `npx baret --help`. The commands below that start with `pnpm --filter @baret/agent-kit baret` run the same CLI from a clone of this repository.

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

`guardedSubmit` checks, then prepares, signs and broadcasts in one call; `guardedSign` stops after signing and leaves broadcast to you; `evaluate` only asks, for an agent that wants to read the verdict before deciding anything. `agent.allows(verdict)` is the one-line check: `true` for `safe`, and for `caution` only when `allowCaution` is set: a Caution carries findings meant for a person to read, and by default an agent cannot sign through one unsupervised.

## From a terminal

The package installs the `baret` CLI (`npx baret --help` lists every command, flag, setting and exit code; `baret <command> --help` shows one command). Settings come from the environment, never from flags, so a key never lands in shell history. The CLI also reads a `.env` file in the directory it runs from, when there is one; a variable already set in the environment wins. Put the signer's key there:

```sh
# .env in your project (git-ignore it)
BARET_AGENT_PRIVATE_KEY=0x...
```

```sh
npx baret analyze --to 0xac9517a70c88480c9fA7E9a280DA485F7f552C29 --value 100000000000000000
```

From a clone of this repository the same command is `pnpm --filter @baret/agent-kit baret analyze ...`, and the `.env` is `packages/agent-kit/.env`. This one prints the whole verdict and exits `1`: the address is on Baret's blocklist.

The commands:

- `baret address`: the signer's address.
- `baret analyze --to 0x.. [--data 0x..] [--value <wei>]`: Baret's verdict on a call, nothing signed.
- `baret submit --to 0x.. [--data 0x..] [--value <wei>] [--intent <text>]`: check, then sign and send when Baret clears it.
- `baret pay --vault <vault> --merchant <merchant> --amount <base units> --ref <text> [--intent <text>]`: pay through a deployed `PaymentGuard` vault instead of a raw transaction.
- `baret x402 <url> [--max <base units>]`: pay an HTTP 402 (x402), see the next section.
- `baret review --intent <text> [--from 0x..]` with the flags of `pay` or of `submit`: Baret and the Qwen reviewer on a call, never signed.
- `baret wallet create`: a Dynamic server wallet for the agent (needs the optional Dynamic SDK, below).
- `baret policy list`: the policy templates.

`submit`, `pay` and `review` also take `--transcript <file>` and `--trace`, described under the reviewer below. Exit codes: `0` when Baret clears the call (for `submit` and `pay`, once it is sent; for `review`, once the reviewer approves), `1` when Baret does not clear it (Blocked, or Caution without `BARET_ALLOW_CAUTION=1`) or the reviewer vetoes it, and nothing was signed, `2` for anything else.

The settings, as `baret --help` prints them: `BARET_API_URL` (default: the live API above), `BARET_API_KEY`, `BARET_NETWORK` (`testnet` unless set; `mainnet` also needs `MONAD_MAINNET_RPC_URL`), `MONAD_TESTNET_RPC_URL`, `BARET_POLICY_TEMPLATE`, `BARET_ALLOW_CAUTION`, the `QWEN_*` settings below, and one signer: `BARET_AGENT_PRIVATE_KEY`, or a Dynamic server wallet (`DYNAMIC_ENVIRONMENT_ID`, `DYNAMIC_AUTH_TOKEN` and `BARET_AGENT_WALLET_PASSWORD`).

### The Dynamic signer is optional

`dynamicSigner` and `baret wallet create` use Dynamic's server-wallet SDK, which is an optional peer dependency and is loaded only when a Dynamic wallet is created or signs. A project that uses `localSigner` never installs it. For a Dynamic wallet: `npm install @dynamic-labs-wallet/node-evm@1.1.28`; without it the signer throws an error that says so, and nothing is signed. The package needs Node 22 or newer.

## Paying an HTTP 402 (x402)

```ts
import { localSigner, payX402 } from "@baret/agent-kit";

const paid = await payX402("https://baret-monad-api.onrender.com/demo/paywall?q=what%20is%20x402", {
  signer: localSigner(process.env.BARET_AGENT_PRIVATE_KEY as `0x${string}`),
  baretUrl: "https://baret-monad-api.onrender.com",
  maxAmount: 100_000n, // never sign a 402 that asks more than 0.10 USDC
});
console.log(paid.response.status, paid.receipt?.transaction, await paid.response.json());
```

The first request comes back 402 with a price, a token and an address. `payX402` builds the EIP-3009 `TransferWithAuthorization` for exactly those terms, sends it to Baret with the terms beside it, and signs only when Baret clears it; a message that pays another address or token, or more than the agent's caps, throws `GuardBlockedError` with nothing signed. The payer needs test USDC and no MON: the server that takes the payment submits it. From a terminal: `pnpm --filter @baret/agent-kit baret x402 <url> --max 100000`. Pass `history` (the agent's payments of the last 24 hours, each call returns its own as `spend`) when the policy has an hourly or daily cap.

## What comes back, and what fail-closed means here

Same contract as `@baret/guard`'s `/v1/analyze` ([its README](https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/guard/README.md)): `decision`, `findings`, `confidence`. `AgentWallet` adds nothing optimistic on top: a verdict it cannot parse, a server it cannot reach, or a timeout all surface as `GuardUnreachableError` from `evaluate()` (re-exported by `@baret/agent-kit`, with `isSafe`), and `guardedSign`/`guardedSubmit` never reach the signer unless the verdict itself says `safe` (or `caution` with `allowCaution: true`). There is no path from "Baret did not answer" to a signature.

## Optional: a second check before the agent signs

Baret answers "is this call dangerous under the rules"; it cannot know what the agent meant to do. Set `reviewer` on `AgentWallet` and every signature also needs the agent's own `intent` (`guardedSubmit(call, { intent })`; `pay` writes a plain one when none is given), which a model compares with the call Baret already cleared. It can veto a call Baret allowed, never clear one Baret blocked: it is asked only about calls Baret cleared, and a missing intent, a model that fails or times out, or an answer off its schema all count as a veto (`ReviewerVetoError`, nothing signed). This is a second, narrower check, not a replacement for Baret's.

- `qwenAgentReviewer({ apiKey, baretUrl })` (also exported as `@baret/agent-kit/review-agent`) is the reviewer as an agent, and the one the CLI uses. Qwen (`qwen3.8-max` on QwenCloud unless `baseUrl` or `model` say otherwise) writes a plan, then calls four read-only tools before it decides: `decode_transaction`, `get_baret_verdict`, `read_vault` (a `PaymentGuard` vault's state and caps, its newest activity, what each merchant was paid in the last hour and day, and whether this payment fits, worked out in code) and `check_reputation`. An approval counts only after it has read the decoded call and Baret's verdict. Each review carries a transcript: the model, the plan, and every tool call with its arguments, result and time.
- `qwenReviewer({ apiKey })` is the earlier one-call reviewer, kept: one prompt over a fixed summary of the call and the verdict, no tools.

From a terminal, `QWEN_API_KEY` turns the agent reviewer on for `submit` and `pay` (`QWEN_BASE_URL` and `QWEN_MODEL` change the endpoint and the model; a `submit` without `--intent` is then vetoed). `baret review --intent <text> [--from 0x..]` with the flags of `pay` (`--vault ...`) or of `submit` (`--to ...`) runs Baret and the reviewer on the same call and never signs, so `--from` can name an account you hold no key for (default: the configured signer's). On `submit`, `pay` and `review`, `--trace` prints the plan, each tool call and the decision on stderr as they happen, and `--transcript <file>` writes Baret's decision and the whole review as JSON, on a veto too. [`docs/ARCHITECTURE.md`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/ARCHITECTURE.md) §8.6 has where each check sits.

## More

- Pre-sign checks without the agent wrapper: [`@baret/guard`](https://www.npmjs.com/package/@baret/guard).
- The vault an agent pays from, its caps and events: [`docs/CONTRACTS.md`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/CONTRACTS.md) §2.
- The wallet, the signers, the reviewer and the CLI in one place: [`docs/ARCHITECTURE.md`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/ARCHITECTURE.md) §8.6.
- x402 payments end to end: [`docs/X402_FACILITATOR.md`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/X402_FACILITATOR.md).
