# @baret/guard

A pre-sign check for Monad transactions. Send Baret the transaction (or the x402 payment) before you sign it, and it answers `safe`, `caution` or `blocked` with the reasons — your own code decides what to do with the answer.

This package is not published; it is the client for `https://baret-monad-api.onrender.com`, which anyone can call without it. Clone this repository to use the SDK, or skip straight to the HTTP API below.

## Install

```
git clone https://github.com/HackerFetch/Baret-Metropolis
cd Baret-Metropolis
pnpm install
```

Import it from `packages/guard` inside the workspace, or copy `TransactionGuard` (one class, no chain library dependency) into your own project — the only runtime dependency is `zod`.

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

An x402 payment goes the same way, with `typedData` (the EIP-3009 `TransferWithAuthorization` message) and `payment` (what the merchant's 402 asked for) instead of `transaction` — see `docs/X402_FACILITATOR.md`.

## What comes back

`decision` is one of `safe`, `caution` or `blocked`. `findings` names every detector that fired, with the values its sentence needs (`packages/guard/src/findings.ts` has the full list, `docs/ARCHITECTURE.md` §6 the detectors behind them). `firedRules` names which of your policy's fields decided it. `estimatedChanges` and `approvals` are only the signer's own balance and allowance changes — never the whole trace. `confidence` drops to `low` when the simulation could not run or a data source was unavailable; your policy still decides, Baret never hides the gap.

`policy` takes the full rule set (`GuardPolicy`, `packages/guard/src/policy.ts`); `policyTemplate` takes `"strict"`, `"balanced"` or `"permissive"` and the server fills in the rest, including the network's own USDC as the one allowed payment asset. Send one or the other, never both.

## Fail-closed

`evaluate()` only ever returns a parsed, schema-valid `AnalyzeResponse` or throws `GuardUnreachableError` — a non-2xx status, a body that does not match the contract, or no answer within 15 seconds (configurable via `timeoutMs`). There is no silent fallback: a caller that cannot reach Baret has to treat that the same way it treats `blocked`, because a transaction Baret could not check is not a transaction Baret cleared. This is the same rule the live showcase and wallet follow (`CLAUDE.md` hard constraint 3): missing data is never read as safe.

```ts
import { GuardUnreachableError, TransactionGuard } from "@baret/guard";

try {
  const verdict = await guard.evaluate(request);
  // sign only on verdict.decision === "safe" (or "caution" if your policy allows it)
} catch (err) {
  if (err instanceof GuardUnreachableError) {
    // Baret could not be reached or answered with something it should not: treat as blocked
  }
  throw err;
}
```

`isSafe(verdict)` and `isSignable(verdict)` are the two one-line checks most callers need instead of reading `decision` by hand.

## More

- The full request and response shapes: `packages/guard/src/analyze.ts` (`analyzeRequestSchema`, `analyzeResponseSchema`).
- Every detector and finding code: `docs/ARCHITECTURE.md` §5 to §7.
- Agent payments and a spending-limited vault instead of a raw key: [`@baret/agent-kit`](../agent-kit/README.md).
