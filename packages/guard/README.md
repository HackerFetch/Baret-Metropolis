# @baret/guard

A pre-sign check for Monad transactions. Send Baret the transaction (or the x402 payment) before you sign it, and it answers `safe`, `caution` or `blocked` with the reasons — your own code decides what to do with the answer.

Published on npm as `@baret/guard`. It is the client for `https://baret-monad-api.onrender.com`, which anyone can call without it: install the package, or skip straight to the HTTP API below.

## Install

```
npm install @baret/guard
```

The published package is built JavaScript with type declarations and runs on plain Node: no chain library inside, and the only runtime dependency is `zod`. Inside this repository, add `"@baret/guard": "workspace:*"` to a package's dependencies instead; the workspace resolves it to the TypeScript source (`src/index.ts`), so run it through a TypeScript-aware tool (tsx, Vite, a bundler).

## The smallest working call

```ts
import { TransactionGuard } from "@baret/guard";

const guard = new TransactionGuard({ baseUrl: "https://baret-monad-api.onrender.com" });

const verdict = await guard.evaluate({
  network: "testnet",
  transaction: {
    from: "0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353",
    to: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
    value: "100000000000000000", // 0.1 MON, in wei
    data: "0x",
  },
  policyTemplate: "balanced", // or "strict" / "permissive"
});

console.log(verdict.decision); // "blocked"
console.log(verdict.findings.map((f) => f.code)); // ["KNOWN_MALICIOUS_ADDRESS"]
```

Run live against Monad testnet on 2026-10-09 (commit `d05fb2b`), this is the real reply, trimmed to what matters:

```json
{
  "decision": "blocked",
  "findings": [
    {
      "code": "KNOWN_MALICIOUS_ADDRESS",
      "severity": "critical",
      "values": { "address": "0xac9517a70c88480c9fA7E9a280DA485F7f552C29" },
      "blocking": true
    }
  ],
  "confidence": "high"
}
```

The same `from`, sending nothing to a plain wallet instead, comes back clean:

```json
{ "decision": "safe", "findings": [], "confidence": "high" }
```

No SDK needed — the whole contract is one HTTP call:

```sh
curl -X POST https://baret-monad-api.onrender.com/v1/analyze \
  -H "content-type: application/json" \
  -d '{
    "network": "testnet",
    "transaction": {
      "from": "0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353",
      "to": "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
      "value": "100000000000000000",
      "data": "0x"
    },
    "policyTemplate": "balanced"
  }'
```

An x402 payment goes the same way: `typedData` (the EIP-3009 `TransferWithAuthorization` message) in place of `transaction`, plus `payment` (what the merchant's 402 asked for), which the x402 detector compares with what the signature would actually pay. The request shapes are in `docs/ARCHITECTURE.md` §5, the flow in `docs/X402_FACILITATOR.md`.

## What comes back

`decision` is one of `safe`, `caution` or `blocked`. `findings` names every detector that fired, with the values its sentence needs ([`findings.ts`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/guard/src/findings.ts) has the full list, [`docs/ARCHITECTURE.md`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/ARCHITECTURE.md) §6 the detectors behind them). `firedRules` names which of your policy's fields decided it. `estimatedChanges` and `approvals` are only the changes to `userWallet` (the sender, unless you set it) — never the whole trace. `confidence` is `low` when the simulated call reverted or a source a rule needed did not answer (a `…_UNAVAILABLE` finding), and `medium` when there was nothing to simulate (a signature request) or the call could not be traced; your policy still decides, Baret never hides the gap.

`policy` takes the full rule set (`GuardPolicy`, [`policy.ts`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/guard/src/policy.ts)); `policyTemplate` takes `"strict"`, `"balanced"` or `"permissive"` and the server fills in the rest, including the network's own USDC as the one allowed payment asset. Send one or the other, never both; with neither, the server applies Balanced.

## Fail-closed

`evaluate()` checks your request against `analyzeRequestSchema` first: a request that breaks it throws zod's `ZodError`, and nothing is sent. After that it only ever returns a parsed, schema-valid `AnalyzeResponse` or throws `GuardUnreachableError` — a non-2xx status, a body that does not match the contract, or no answer within 15 seconds (configurable via `timeoutMs`). There is no silent fallback: a caller that cannot reach Baret has to treat that the same way it treats `blocked`, because a transaction Baret could not check is not a transaction Baret cleared. This is the same rule the live showcase and wallet follow (`CLAUDE.md` hard constraint 3): missing data is never read as safe.

```ts
import { type AnalyzeRequest, GuardUnreachableError, isSafe, TransactionGuard } from "@baret/guard";

const guard = new TransactionGuard({ baseUrl: "https://baret-monad-api.onrender.com" });

/** True only when Baret answered and the answer is Safe. */
async function clearedToSign(request: AnalyzeRequest): Promise<boolean> {
  try {
    return isSafe(await guard.evaluate(request));
  } catch (err) {
    if (err instanceof GuardUnreachableError) return false; // not checked is not cleared
    throw err; // a request that breaks the schema: a bug in the caller
  }
}
```

`isSafe(verdict)` (Safe: sign without asking anyone) and `isSignable(verdict)` (anything but Blocked: a person may sign after reading the findings) are the two one-line checks most callers need instead of reading `decision` by hand.

## What the SDK leaves to you

Reported by the first outside integration (Venue, 2026-10-13); each is the caller's job today.

- **Caution is not consent.** `isSignable` is true for Caution. Show the findings and get a confirmation for that exact transaction before signing; do not sign a Caution unattended.
- **Check the verdict is fresh and for your chain.** The response carries `expiresAt` and `meta.chainId`; the SDK validates their shape and does not compare them. Refuse a verdict that has expired or names another chain, and ask again if a person took longer than that to confirm.
- **Hosted networks.** The types accept `testnet` (10143) and `mainnet` (143). The hosted API at `baret-monad-api.onrender.com` is set up for testnet only.
- **Who is protected.** `estimatedChanges` and `approvals` describe `userWallet` (the sender by default). When the sender is an agent settling for other parties, their balances are not checked separately.
- **"Unlimited" allowance.** An `approve` or permit at or above the largest uint96 (2^96 - 1) is reported `unlimited: true`, so the maximum minus one does not pass as a bounded grant.
- **Errors.** A non-2xx answer, a body that breaks the contract and a timeout all throw `GuardUnreachableError`: a non-2xx answer carries only its status (the body is dropped), the other two carry the detail in `cause`; a request that breaks the schema throws `ZodError` before anything is sent. Treat every one of them as "do not sign".

## More

- The full request and response shapes: [`packages/guard/src/analyze.ts`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/guard/src/analyze.ts) (`analyzeRequestSchema`, `analyzeResponseSchema`).
- Two more contracts in the same package, both answered by a language model on the server (`503` when none is configured): `/v1/explain` (`src/explain.ts`) puts a verdict into plain words in `en`, `tr` or `zh`. Send `{ requestId, language }` with the verdict's `meta.requestId`; the older `{ verdict, language }` still works, and the server reads only its `meta.requestId`. The `decision` in the answer is copied from the server's own cached verdict, never from the model or the request. `/v1/policy/draft` (`src/policy-draft.ts`) turns a sentence into proposed rule changes: each one checked against the policy schema, the ones that loosen a rule marked, none applied.
- Every detector and finding code: [`docs/ARCHITECTURE.md`](https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/ARCHITECTURE.md) §5 to §7.
- Agent payments and a spending-limited vault instead of a raw key: [`@baret/agent-kit`](../agent-kit/README.md).
