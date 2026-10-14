# Blind signing by agents, measured

An agent that can pay holds a key, and a key signs whatever it is handed. This example hands the same twenty requests to two agents on Monad testnet and counts what each would sign:

- **The blind agent** is an agent with a key and nothing else. It signs every request.
- **The guarded agent** asks Baret first, through the published SDK (`@baret/guard` from npm), and signs only on a **Safe** verdict that is still fresh and for the right chain. A Caution, a Blocked, an expired verdict, a verdict for another chain or no answer at all is a refusal.

It needs no key and sends nothing: "signs" means "would sign". Every verdict is the live API's answer for that exact request, simulated on Monad testnet at the time of the run.

## Run it

```bash
cd examples/agent-blind-signing
npm install
node run.mjs
```

Node 20 or later. It talks to `https://baret-monad-api.onrender.com` (the API sleeps when idle, so the first request can take up to a minute; `--api <url>` points it at another server, `--pause <ms>` sets the wait between requests). It exits 1 if the guarded agent would sign a harmful request, refuses an honest one, or signs in any failure case.

## Result

Run on 2026-10-14 against the live API at commit `72ea27b`, with `@baret/guard` 0.1.4. The full output is in [`results.txt`](results.txt).

| | Requests | Blind agent would sign | Guarded agent would sign |
|---|---|---|---|
| Harmful, or outside the owner's limits | 12 | 12 | **0** |
| Honest | 8 | 8 | **8** |
| The check itself fails (3 cases) | 3 | n/a | **0** |

No honest request was refused, and no verdict differed from what the demo sites expect.

What the twelve refusals were, by the finding that carried them:

| Request | Verdict | Why |
|---|---|---|
| NovaSwap: "Enable trading" is an unlimited allowance to a look-alike of the router | Blocked | `ERC20_APPROVAL_UNLIMITED`, `KNOWN_MALICIOUS_ADDRESS`, `LOOKALIKE_ADDRESS` |
| PixelDrop: a mint that hands over the whole collection | Blocked | `NFT_OPERATOR_GRANTED`, `KNOWN_MALICIOUS_ADDRESS` |
| OrbitYield: a pool that keeps the MON and sends no receipt token | Blocked | `VALUE_KEPT_BY_UNKNOWN_CONTRACT` |
| ClaimHub: a claim that is an unlimited USDC allowance | Blocked | `ERC20_APPROVAL_UNLIMITED`, `KNOWN_MALICIOUS_ADDRESS` |
| LaunchPad: a sale behind a proxy whose code its deployer can replace | Blocked | `DELEGATECALL_DETECTED` |
| Scrybe: the sixth x402 payment in an hour, past the owner's hourly cap | Blocked | `X402_HOURLY_CAP_EXCEEDED` |
| Agent: an unlimited allowance to an unknown contract | Blocked | `ERC20_APPROVAL_UNLIMITED` |
| Agent: an x402 payment to an address that is not the merchant's | Caution | `X402_DESTINATION_MISMATCH` |
| Agent: an x402 payment in a token that only looks like USDC | Blocked | `X402_ASSET_MISMATCH`, `X402_NON_CANONICAL_ASSET` |
| Agent: a collection handed to a plain wallet | Blocked | `NFT_OPERATOR_GRANTED`, `APPROVAL_TO_WALLET` |
| Agent: a transfer to a wallet on the reputation registry | Blocked | `KNOWN_MALICIOUS_ADDRESS` |
| Cleanverse: aUSDC to a wallet with no verified identity | Blocked | `COMPLIANCE_NO_CREDENTIAL` |

The three failure cases, which are the part a pre-sign check most often gets wrong:

| Case | Guarded agent |
|---|---|
| Baret cannot be reached, and the request is an honest one | Refuses: no answer is not a yes |
| A Safe verdict, one second past its `expiresAt` | Refuses: `expired` |
| A Safe verdict, presented for another chain id | Refuses: `wrong_chain` |

## What this shows, and what it does not

- **It shows** that the decision to sign can be taken away from the agent and given to a simulation and written rules, with one SDK call, and that honest work still goes through.
- **The twenty requests are Baret's own demo scenarios**, against contracts we deployed to Monad testnet to behave honestly or to attack. They are the same requests `pnpm --filter @baret/server verify:demo` sends, written out by `export:scenarios` (`apps/server/scripts/demo-scenarios.ts`). This is a reproducible demonstration on known cases, not an independent benchmark, and 12 of 12 here is not a detection rate for attacks in the wild.
- **Nothing is signed.** The blind agent "signing" every request is the definition of a key with no check in front of it, not a measurement.
- **One request is refused on a Caution.** An agent has nobody to ask, so the guarded agent signs on Safe only; `@baret/agent-kit` does the same unless the owner sets `allowCaution`.
- **An answer the SDK cannot read is a refusal too.** Run with `@baret/guard` 0.1.3, two of the twelve came back as "no answer": the live engine had gained two finding codes (`LOOKALIKE_ADDRESS`, `APPROVAL_TO_WALLET`) that 0.1.3's schema did not know, and the SDK refused the whole answer rather than sign on a body it could not check. The agent was still safe; the reason was lost. 0.1.4 knows both codes.

## The two lines behind the check

The check is the first line. An agent that skips it, or a key that leaks, still meets the second and third:

- **On-chain caps.** The agent's money sits in a `PaymentGuard` vault: per-merchant caps per payment, per hour and per day, enforced by the contract, and a revoke the owner can pull. Source: [`contracts/src/PaymentGuard.sol`](../../contracts/src/PaymentGuard.sol); tests, with fuzz and invariant runs: [`contracts/test/PaymentGuard.t.sol`](../../contracts/test/PaymentGuard.t.sol).
- **A reviewer that can only veto.** Before a payment, a Qwen 3.8 Max reviewer reads the vault, the merchant and the amount with four read-only tools and can veto a payment that does not match what the agent was asked to do. Tests with instructions planted in the intent: [`packages/agent-kit/src/intent-injection.test.ts`](../../packages/agent-kit/src/intent-injection.test.ts). Live: <https://usebaret.com/review>.

## Where the engineering is

| Part | File |
|---|---|
| The SDK call used here, and its fail-closed errors | [`packages/guard/src/guard.ts`](../../packages/guard/src/guard.ts) |
| The agent signer that cannot sign past a verdict | [`packages/agent-kit/src/agent-wallet.ts`](../../packages/agent-kit/src/agent-wallet.ts) |
| The x402 payment check | [`apps/server/src/risk/detectors/x402.ts`](../../apps/server/src/risk/detectors/x402.ts) |
| Allowances, look-alike addresses, reputation, identity | [`apps/server/src/risk/detectors/`](../../apps/server/src/risk/detectors) |
| The twenty scenarios and what each must answer | [`apps/server/scripts/demo-scenarios.ts`](../../apps/server/scripts/demo-scenarios.ts) |
| Architecture | [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) |
