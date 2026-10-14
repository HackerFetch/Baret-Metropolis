# Security Policy

Baret is a security product: it decides whether a transaction should be signed. A flaw in Baret can turn a "Blocked" into a "Safe", so we treat reports about it as the most important issues we get.

## Status

- **Testnet only.** Everything runs on Monad testnet (chain id `10143`). No contract holds mainnet value and no mainnet deployment exists yet. Test tokens (dUSDC, testnet USDC, testnet MON) have no monetary value.
- **No bug bounty yet.** We cannot pay for reports today. We credit reporters in the fix's commit and release notes unless they ask us not to.

## How to report a vulnerability

Report privately through GitHub's private vulnerability reporting:

**https://github.com/HackerFetch/Baret-Metropolis/security/advisories/new**

Do not open a public issue, pull request or discussion for a vulnerability, and do not post it on social media before a fix is out. If the form is not available to you, open a public issue that says only "security contact requested" with no details, and we will reach you through GitHub.

## What to include

- What is affected: the component (see scope below), the URL, endpoint, contract address or package version.
- The impact in one sentence: for example "an unlimited approval to a flagged address comes back Safe".
- Steps to reproduce: the exact request body, transaction (`to`, `data`, `value`, `chainId`), typed data or call sequence, and the policy preset in use.
- What you expected and what you saw: the verdict, the findings, the HTTP status or the revert.
- Any transaction hash on Monad testnet, linked on https://testnet.monadscan.com.
- Whether you want to be credited, and under which name.

Never include a private key, seed phrase or API key in a report. Use a fresh test key for anything you sign.

## Response times

| Step | Target |
|---|---|
| Acknowledge the report | within 72 hours |
| Triage (confirmed or not, severity, owner) | within 7 days |
| Fix | depends on severity; a bypass of a Blocked verdict or a loss of vault funds comes first |

We tell you when the fix is released and ask you to check it.

## Scope

In scope:

| Component | Where |
|---|---|
| The analysis API (simulation, detectors, policy engine, `/v1/*` routes) | https://baret-monad-api.onrender.com, source `apps/server` |
| The contracts on Monad testnet (PaymentGuard, the vault factory, CompliantPaymentGuard, ReputationRegistry, SealedStore, the CRE receiver) | addresses in [`docs/CONTRACTS.md`](docs/CONTRACTS.md), source `contracts/` |
| The SDK packages on npm: `@baret/guard`, `@baret/llm`, `@baret/agent-kit` | `packages/guard`, `packages/llm`, `packages/agent-kit` |
| The Baret web wallet (passkey account, the check before every signature) | https://wallet.usebaret.com, source `apps/wallet`, `packages/wallet-core` |
| The browser extension | `apps/extension`, zips from the `extension-latest` release |
| The showcase and the demo sites (`/novaswap` and the others, `/agents`, `/review`) | https://usebaret.com, source `apps/showcase` |

Most valuable findings:

- A transaction, signed message or typed data that should be Blocked or Caution but comes back Safe.
- Any path where missing or failing data produces Safe instead of Blocked (see "Fail-closed design" below).
- A way for an agent to move funds from a PaymentGuard vault beyond its caps, to a non-allowed merchant, or after it was revoked.
- A way to make the language-model layer (KIMI or Qwen) change a verdict or approve a payment the rules veto.
- Leaking a wallet's key material, sealed settings or another user's data.

Out of scope:

- Denial of service by volume, and the API's rate limits being shared or reached (the API runs on a free Render instance).
- The third-party services Baret calls (Alchemy, Nansen, Envio, Cleanverse, Chainlink, Dynamic, Moonshot KIMI, Qwen) unless Baret uses them unsafely; report their own bugs to them.
- The Monad testnet itself, its RPC lag or its faucet.
- Findings that need a compromised device, browser or OS, or a malicious browser extension already installed.
- Social engineering of the team, and physical attacks.
- Missing security headers or best-practice notes with no exploit.
- The old Baret versions on other chains; they are not part of this repository.

## Fail-closed design

Baret is built to refuse when it cannot be sure:

- When simulation fails, a data source does not answer, or a request cannot be read, the decision is **Blocked**, not Safe (hard constraint 3 in [`CLAUDE.md`](CLAUDE.md), decisions in [`docs/DECISIONS.md`](docs/DECISIONS.md)).
- A signed message or typed data whose kind Baret does not know is graded, never passed as Safe.
- The SDK treats a non-2xx answer, a broken response and a timeout as "do not sign" (`GuardUnreachableError`, see [`packages/guard/README.md`](packages/guard/README.md)); since 0.1.3, `verdictRefusal` refuses a verdict that has expired or names another chain.
- The demo sites and the wallet fail closed when the API does not answer within 15 seconds.
- The language models explain and review; they never decide alone. A verdict is set by Baret's rules, and a Qwen approval cannot override a rule's veto.
- PaymentGuard enforces per-payment, hourly and daily caps and an allowed merchant on chain, whatever the agent's software says.

A report that shows any of these promises broken is in scope even if the impact looks small.
