# @baret/agent-kit

A guarded wallet for AI agents on Monad: every call goes through Baret's `/v1/analyze` before it is signed, and a call Baret does not clear is never signed, not retried, not sent anyway. Pair it with `contracts/PaymentGuard.sol` and the agent never holds a raw, unbounded key — only a signer scoped to a vault's caps.

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

Run live against Monad testnet on 2026-10-09, with an address Baret has flagged as a drainer's sink, this is the real reply:

```
blocked, nothing signed. decision: blocked
findings: [ 'SIMULATION_FAILED', 'KNOWN_MALICIOUS_ADDRESS' ]
```

`guardedSubmit` checks, then prepares, signs and broadcasts in one call; `guardedSign` stops after signing and leaves broadcast to you; `evaluate` only asks, for an agent that wants to read the verdict before deciding anything. `agent.allows(verdict)` is the one-line check: `true` for `safe`, and for `caution` only when `allowCaution` is set — a Caution carries findings meant for a person to read, and by default an agent cannot sign through one unsupervised.

## From a terminal

```sh
export BARET_AGENT_PRIVATE_KEY=0x...
pnpm --filter @baret/agent-kit baret analyze --to 0xac9517a70c88480c9fA7E9a280DA485F7f552C29 --value 100000000000000000
```

Exits `0` when Baret clears the call (and, for `submit`/`pay`, once it is sent), `1` when it is Blocked or a reviewer vetoes it, `2` for anything else. `baret pay --vault <vault> --merchant <merchant> --amount <base units> --ref <text>` pays through a deployed `PaymentGuard` vault instead of a raw transaction. Settings come from the environment, never flags, so a key never lands in shell history — see the comment at the top of `src/cli.ts` for the full list.

## What comes back, and what fail-closed means here

Same contract as `@baret/guard`'s `/v1/analyze` (`../guard/README.md`): `decision`, `findings`, `confidence`. `AgentWallet` adds nothing optimistic on top — a verdict it cannot parse, a server it cannot reach, or a timeout all surface as `GuardUnreachableError` from `evaluate()`, and `guardedSign`/`guardedSubmit` never reach the signer unless the verdict itself says `safe` (or `caution` with `allowCaution: true`). There is no path from "Baret did not answer" to a signature.

## Optional: a second check before the agent signs

`reviewer` (an LLM review of the agent's own stated `intent` against the call Baret already cleared) can veto a call Baret allowed, never clear one Baret blocked — `qwenReviewer({...})` is the one built in. This is a second, narrower check, not a replacement for Baret's: see `docs/ARCHITECTURE.md` for where each one sits.

## More

- Pre-sign checks without the agent wrapper: [`@baret/guard`](../guard/README.md).
- The vault an agent pays from, its caps and events: `docs/CONTRACTS.md` §2.
- x402 payments end to end: `docs/X402_FACILITATOR.md`.
