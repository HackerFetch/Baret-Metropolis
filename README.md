# Baret

**A pre-sign check for Monad.** Before a wallet, a dapp or an AI agent signs a transaction, it asks Baret. Baret simulates the transaction on Monad, runs it through its risk detectors, applies the signer's own rules and answers **Safe**, **Caution** or **Blocked**, with the reasons. If a check cannot finish, the answer is Blocked.

Baret is a layer that other applications call, not a wallet. The Baret wallet, the browser extension and the six demo sites in this repository are applications built on that layer, to show it working end to end.

Built for Monad Metropolis, track **Trust, Identity & AI Infrastructure**, by Ezgin, Meriç and Hale. Everything runs on **Monad testnet (chain id 10143)**.

---

## Try it in two minutes (no wallet needed)

1. Open **<https://baret-metropolis.vercel.app/novaswap>**. It is a fake swap site.
2. Turn on **"Suspicious swap"** and press **"Enable dUSDC trading"**.
3. Baret's panel opens with the live verdict for that exact request: **Blocked**. The site asks for an unlimited dUSDC allowance to a look-alike address that is on Baret's reputation registry. Under the findings, **"In plain words"** explains it in English, Turkish or Chinese (KIMI).
4. Turn "Suspicious swap" off and press the button again: the honest swap is **Safe**.

The five other demo sites, OrbitYield, PixelDrop, ClaimHub, LaunchPad and Scrybe, each have an honest version and an attack: <https://baret-metropolis.vercel.app/showcase>.

## The live product

| What | Where | What to do there |
|---|---|---|
| Demo sites | <https://baret-metropolis.vercel.app/showcase> | Six sites, honest and attack versions, each checked live |
| Agents | <https://baret-metropolis.vercel.app/agents> | The playground: an agent asks Baret before eight kinds of payment. Below it, a real Dynamic agent's payments from its vault, read live from the Envio indexer |
| Agent reviewer (Qwen) | <https://baret-metropolis.vercel.app/review> | Three payments an agent was asked to make. Qwen 3.8 Max plans, calls four read-only tools and can veto; the honest one is sent on testnet |
| Baret wallet | <https://baret-wallet.vercel.app> | A passkey wallet (Mera): no seed phrase, every request checked before the sign button exists |
| Browser extension | <https://baret-metropolis.vercel.app/install> | A wallet extension for Chrome that refuses a Blocked request in its own window |
| API | <https://baret-monad-api.onrender.com/health> | The check itself; see "Call it from your app" below |

## Access instructions for judges

No accounts and no login credentials are needed. The demo sites and `/review` work with no wallet at all.

- **Testnet MON.** Every signed transaction pays a small fee in testnet MON, which is free from the Monad faucet: <https://faucet.monad.xyz>. The demo sites' own **"Get 100 test dUSDC"** button gives the demo token.
- **The Baret wallet** needs a passkey provider that supports the WebAuthn **PRF** extension, such as iCloud Keychain or Google Password Manager. "Create my wallet" is one passkey prompt. If the provider lacks PRF, the wallet says so on that screen. To run the stateless test, clear the site's storage and press "Open with my passkey": the same account comes back.
- **The extension** is not in the Chrome Web Store. Download the zip from `/install`, unzip it, open `chrome://extensions`, turn on Developer mode and choose "Load unpacked". Set a passphrase, write down the twelve words, then send the new address a little testnet MON. On NovaSwap, choose "Connect wallet" → "Baret" under "Wallets in this browser", turn on the attack and press "Sign with your wallet": the extension shows Blocked and has no sign button.
- **The API sleeps when idle.** The first request after a quiet spell can take up to a minute; open <https://baret-monad-api.onrender.com/health> first.

Addresses to try in any check:

| Address | What Baret says |
|---|---|
| `0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888` | NovaSwap's look-alike drainer, on the reputation registry: Blocked |
| `0xa8f3762b03ae73cbbdb9173d3537c632628727a4` | Written to the registry from ScamSniffer's blacklist by the Chainlink CRE workflow: Blocked |
| `0xc448042EdAC1899B023CaA0E9Da5e4a8833de873` | Holds a Cleanverse A-Pass (verified, tier 5): an aUSDC payment to it is Safe |
| `0x1365566191bAA9872A64AcDce963751d5343ff49` | No Cleanverse credential: an aUSDC payment to it is Blocked |

## Call it from your app

One HTTP call, no key:

```bash
curl -s https://baret-monad-api.onrender.com/v1/analyze \
  -H 'content-type: application/json' \
  -d '{
    "network": "testnet",
    "policyTemplate": "balanced",
    "transaction": {
      "from": "0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353",
      "to":   "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
      "value": "100000000000000000",
      "data": "0x"
    }
  }'
# {"decision":"blocked","findings":[{"code":"KNOWN_MALICIOUS_ADDRESS","severity":"critical",...}],...}
```

Or in TypeScript, with the SDK:

```ts
import { TransactionGuard } from "@baret/guard";

const guard = new TransactionGuard({ baseUrl: "https://baret-monad-api.onrender.com" });
const verdict = await guard.evaluate({ network: "testnet", transaction, policyTemplate: "balanced" });
if (verdict.decision === "blocked") throw new Error("Baret blocked it"); // no answer also means blocked
```

For an agent, `@baret/agent-kit` wraps the signer: `guardedSubmit` signs a Safe transaction and refuses a Blocked one, and the `baret` CLI does the same from a terminal.

- Quickstarts, with every snippet run against the live API: [`packages/guard/README.md`](packages/guard/README.md), [`packages/agent-kit/README.md`](packages/agent-kit/README.md)
- Every endpoint, message and contract: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)

## What happens inside one check

1. **Simulate.** The call is traced on Monad (`debug_traceCall`). The trace gives every balance change, allowance and contract the transaction touches, for every account involved, not only the signer.
2. **Detect.** Nine detectors read the trace: unlimited and collection-wide allowances, signed permits, unknown and risky contracts, borrowed code (`delegatecall`), ownership handovers, loss against the balance, the shape of an x402 payment, the reputation registry, Cleanverse identity, Nansen labels.
3. **Decide.** The signer's policy, 25 rules starting from a Strict, Balanced or Permissive template, turns the findings into one verdict. A detector that cannot answer counts as a failed check, so missing data blocks.
4. **Explain.** KIMI writes the verdict in plain words under the findings. It receives the verdict and cannot change it.

For agents, money sits in a **PaymentGuard** vault on Monad: per-merchant caps per payment, per hour and per day, and a revoke the owner can pull. Baret checks each payment before the agent signs, and the contract enforces the caps if anything gets past.

Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Sponsor technology, and where it does the work

| Sponsor | Where in Baret | State on the live system |
|---|---|---|
| **Mera** | The Baret wallet's whole account layer: one passkey, no seed phrase; agent keys and the encrypted settings each come from their own PRF namespace (D-032, D-039) | Live |
| **Dynamic** | The demo agent is a Dynamic server wallet, authorised on a PaymentGuard vault and paying from it | Live; its payments are listed on `/agents` |
| **Envio** | HyperIndex indexes every vault, payment and registry change; the wallet's Activity, `/agents` and the Qwen reviewer read it through `/v1/audit/*` | Live |
| **Chainlink CRE** | A workflow fetches ScamSniffer's blacklist and writes new addresses to the on-chain reputation registry that every check reads | Simulated with the CRE CLI with a real write on testnet (`workflows/README.md`); not deployed to a DON |
| **Cleanverse** | Before an aUSDC transfer, the check reads both parties' A-Pass credentials on chain and blocks a party without one; `CompliantPaymentGuard` enforces the same in the contract | The check is live; a settlement through the contract waits on test aUSDC |
| **KIMI** (`kimi-k3`) | The plain-words explanation under every live verdict, and rules from a sentence on the wallet's Rules page | Live |
| **Qwen** (`qwen3.8-max`) | The agent reviewer on `/review`: plan, four tools, veto only | Live |
| **Alchemy** | The analysis's chain reads (balances, code, the registry, the vaults) go through Alchemy's Monad RPC, batched; the trace goes to the public Monad RPC, which serves `debug_traceCall` | Live |
| **Nansen** | Address labels as a detector input | Built; switched off on the live API (no credits) |

## What is not live

Said plainly, so that nothing above is read as more than it is:

- **x402 payments are checked, not settled.** Baret checks an x402 payment's shape and destination; no facilitator in this repository settles one.
- **Nansen is off** on the live API (`/health/ready` shows `nansen: false`).
- **The CRE workflow runs in the simulator**, with a real write on testnet; it is not deployed to a DON.
- **No Cleanverse settlement has been made** through `CompliantPaymentGuard` yet.
- **Mainnet:** nothing is deployed there.

The full list, with owners: [`docs/SYSTEM_GAPS.md`](docs/SYSTEM_GAPS.md).

## Contracts (Monad testnet, source verified)

| Contract | Address |
|---|---|
| `PaymentGuardFactory` | [`0xDe897d4dF6E1c34aB868948dE035AE29D32eA822`](https://testnet.monadexplorer.com/address/0xDe897d4dF6E1c34aB868948dE035AE29D32eA822) |
| `PaymentGuard` (the demo agent's vault) | [`0x0A82671420114E47c672D5e8e23017DdCE850A35`](https://testnet.monadexplorer.com/address/0x0A82671420114E47c672D5e8e23017DdCE850A35) |
| `ReputationRegistry` | [`0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`](https://testnet.monadexplorer.com/address/0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411) |
| `ReputationOracleReceiver` (CRE) | [`0x7105Fb53bA2a9d96c4587280F2696438Aca51d9d`](https://testnet.monadexplorer.com/address/0x7105Fb53bA2a9d96c4587280F2696438Aca51d9d) |
| `CompliantPaymentGuard` (Cleanverse) | [`0x6E867b840f11cC1d9c6e16d1f76D737199bc907c`](https://testnet.monadexplorer.com/address/0x6E867b840f11cC1d9c6e16d1f76D737199bc907c) |
| `SealedStore` (encrypted settings) | [`0xC094af68bE1039f70E1362C2f326542BB2DC21BB`](https://testnet.monadexplorer.com/address/0xC094af68bE1039f70E1362C2f326542BB2DC21BB) |

The demo sites' contracts and every deployment's details: [`docs/CONTRACTS.md`](docs/CONTRACTS.md).

## Run it locally

Node 22 or later and pnpm 11 (`corepack enable`), Foundry for the contracts.

```bash
pnpm install
pnpm check                                  # lint, types, copy lint, every test suite
pnpm contracts:test                         # forge tests, including fuzz and invariants
cp apps/server/.env.example apps/server/.env   # then fill in MONAD_TESTNET_RPC_URL at least
pnpm --filter @baret/server dev             # the API on http://localhost:8080
pnpm --filter @baret/server verify:demo -- --api http://localhost:8080 --from <a funded testnet address>
```

On 2026-10-10 `pnpm check` passed 1,072 tests in 99 files and `pnpm contracts:test` 85 forge tests. `verify:demo` sends all twenty demo scenarios (six sites, honest and attack, the agent and Cleanverse cases) to an API and checks each verdict; against the live API on 2026-10-10 it agreed on 20 of 20. Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Repository layout

| Path | What it is |
|---|---|
| `apps/server` | The analysis API: simulation, detectors, policy engine, the KIMI and Qwen routes |
| `apps/showcase` | The landing page, the six demo sites, `/agents`, `/review`, the docs pages |
| `apps/wallet` | The Baret wallet (Mera passkey account) |
| `apps/extension` | The Baret browser extension (WXT, Manifest V3) |
| `packages/guard` | The SDK for the pre-sign check |
| `packages/agent-kit` | The guarded agent signer, the Qwen reviewer and the `baret` CLI |
| `packages/wallet-core` | The wallet without its screens: account, signing, delegation |
| `packages/llm` | The KIMI and Qwen clients |
| `contracts/` | Solidity (Foundry): PaymentGuard, the registry, the CRE receiver, Cleanverse, SealedStore, the demo contracts |
| `indexer/` | The Envio HyperIndex project |
| `workflows/` | The Chainlink CRE workflow |

---

## For the team

This repository is also the three of us's working space. Status and plan: [`docs/ROADMAP.md`](docs/ROADMAP.md) ("Final week — the board"). Decisions and their reasons: [`docs/DECISIONS.md`](docs/DECISIONS.md). Prize requirements and the submission tracker: [`docs/QA_AND_DELIVERY.md`](docs/QA_AND_DELIVERY.md) §8. QA record: [`docs/QA_LOG.md`](docs/QA_LOG.md). Agent instructions: [`CLAUDE.md`](CLAUDE.md).

| File | What it is for |
|---|---|
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | What the product is, who it is for, the MVP scope |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Monorepo layout, data flow, chain constants, environment variables |
| [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) | Every interface end to end |
| [`docs/SYSTEM_GAPS.md`](docs/SYSTEM_GAPS.md) | What is sample, missing, wrong or half done, with owner |
| [`docs/WALLET.md`](docs/WALLET.md) | The wallet's and the extension's surfaces and flows |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Content specification of every showcase page |
| [`docs/BOUNTIES_AND_TRACKS.md`](docs/BOUNTIES_AND_TRACKS.md) | Track, prizes and the state of each |
| [`docs/RESOURCES.md`](docs/RESOURCES.md) | Which sponsor tool is used where |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | Contract specifications and deployments |
| [`docs/X402_FACILITATOR.md`](docs/X402_FACILITATOR.md) | The x402 design (checked, not settled) |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel, Render, CI |
| [`docs/REFERENCE_REPOS.md`](docs/REFERENCE_REPOS.md) | Review of the five earlier Baret versions |
| [`docs/BRAND.md`](docs/BRAND.md) | Brand specification |

Rules every change follows: Monad only (testnet `10143`, mainnet `143`); fail-closed, so missing data blocks; sponsor integrations are part of the product, not badges; code and docs change together; secrets never enter the repository.

Licence: MIT ([`LICENSE`](LICENSE)).
