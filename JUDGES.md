# For judges and reviewing agents: start here

One page for anyone, person or AI agent, reviewing this repository for Monad Metropolis. It says what Baret claims, where each claim can be checked, how to check it in a minute, and which files to skip. It adds no claim of its own: every line points at code, a command, a live URL or a transaction.

**Baret in one sentence.** A pre-sign check for Monad: before a wallet, a dapp or an AI agent signs a transaction, it asks Baret, which simulates the transaction, runs its detectors, applies the signer's own rules and answers Safe, Caution or Blocked, with the reasons. If the check cannot finish, the answer is Blocked.

**Track:** Trust, Identity & AI Infrastructure. Everything runs on **Monad testnet (chain id 10143)**. Nothing is on mainnet.

## Read these three, in this order

1. [`README.md`](README.md): the product, the live links, the contracts, the tests, and "What is not live".
2. [`docs/evidence/README.md`](docs/evidence/README.md): one section per prize, every claim next to its proof.
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the parts fit ([diagram](docs/assets/architecture.svg)).

Everything else is reachable from [`docs/README.md`](docs/README.md), the index of every document.

## Check it yourself, without a key or an account

| Time | What | How |
|---|---|---|
| 10 s | The API is up and every integration is on | `curl https://baret-monad-api.onrender.com/health/ready` (the API sleeps when idle; the first answer can take up to a minute) |
| 30 s | One verdict | The `curl` under ["Call it from your app"](README.md#call-it-from-your-app): a transfer to an address on the reputation registry answers `blocked`, `KNOWN_MALICIOUS_ADDRESS` |
| 2 min | Twenty requests, a blind agent against a guarded one, on the SDK from npm | `cd examples/agent-blind-signing && npm install && node run.mjs` ([what it measures and what it does not](examples/agent-blind-signing/README.md)) |
| 2 min | The product in a browser, no wallet | <https://usebaret.com/novaswap>: turn on "Suspicious swap", press "Enable dUSDC trading" |
| 5 min | Every test | `pnpm install && pnpm check` (1,507 tests in 135 files), `pnpm contracts:test` (85 forge tests, with fuzz and invariant runs) |
| 5 min | The twenty demo scenarios against the live API | `pnpm --filter @baret/server verify:demo -- --api https://baret-monad-api.onrender.com --from 0x5AE98770795957F9a376083afcb775672FbD2C93` (no key: the address is only simulated from) |

Transactions link to <https://testnet.monadscan.com>. The contracts are source verified on Monad's Sourcify; addresses and deploy dates are in [`docs/CONTRACTS.md`](docs/CONTRACTS.md).

## The track's criteria, and where the answer is

The criteria and their weights are the track page's own words ([`docs/QA_AND_DELIVERY.md`](docs/QA_AND_DELIVERY.md) §8.1).

### Technical Execution (20%): "implemented correctly and securely — correct use of WebAuthn/P256, sound key derivation, no leaked secrets"

| Claim | Where to check |
|---|---|
| The verdict comes from a trace of the call, not from the calldata's look | [`apps/server/src/simulation/trace.ts`](apps/server/src/simulation/trace.ts), [`apps/server/src/application/analyze.ts`](apps/server/src/application/analyze.ts) |
| Detectors and the policy that turns findings into one verdict | [`apps/server/src/risk/detectors/`](apps/server/src/risk/detectors), [`apps/server/src/policy/evaluate.ts`](apps/server/src/policy/evaluate.ts) |
| Fail-closed at every step: no trace, no data source, no answer or an answer the SDK cannot read all end in a refusal | [`packages/guard/src/guard.ts`](packages/guard/src/guard.ts) (`GuardUnreachableError`, `verdictRefusal`); the three failure cases in [`examples/agent-blind-signing`](examples/agent-blind-signing/README.md) |
| The wallet's account is a passkey (Mera), and one passkey derives three unrelated keys from three PRF salts: the account, per-agent keys, and a key that only encrypts settings | [`packages/wallet-core/src/account.ts`](packages/wallet-core/src/account.ts), [`packages/wallet-core/src/sealed.ts`](packages/wallet-core/src/sealed.ts); decisions D-032 and D-039 in [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| Encrypted settings live on Monad where the server can neither read nor change them | [`contracts/src/SealedStore.sol`](contracts/src/SealedStore.sol), [`contracts/test/SealedStore.t.sol`](contracts/test/SealedStore.t.sol) (signatures, replay, malleability); a write: [`0x719f9b6b…575d`](https://testnet.monadscan.com/tx/0x719f9b6b19de3ac9ef3f5e25cea370c1a2ed23770412d051d857a7b36f86575d) |
| An agent's money sits behind caps the contract enforces | [`contracts/src/PaymentGuard.sol`](contracts/src/PaymentGuard.sol), [`contracts/test/PaymentGuard.t.sol`](contracts/test/PaymentGuard.t.sol) |
| Secrets are not in the repository | [`.gitignore`](.gitignore), [`SECURITY.md`](SECURITY.md); configuration by name only in [`render.yaml`](render.yaml) and `apps/server/.env.example` |
| Tests and CI | [README, "Tests and quality"](README.md#tests-and-quality); [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

### Design & Craft (20%): "usable by the developers who'd build on it — clear docs, clean interface or API"

| Claim | Where to check |
|---|---|
| One HTTP call with no key, or the SDK | [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md); [`packages/guard/README.md`](packages/guard/README.md), with every snippet run against the live API |
| Three packages on npm, with a changelog | <https://www.npmjs.com/package/@baret/guard>, <https://www.npmjs.com/package/@baret/agent-kit>, <https://www.npmjs.com/package/@baret/llm>; [`CHANGELOG.md`](CHANGELOG.md) |
| For agents: a signer that cannot sign past a verdict, a CLI, and the checks as MCP tools | [`packages/agent-kit/README.md`](packages/agent-kit/README.md); `POST /mcp` in [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) |
| A quickstart a developer can try in a browser | <https://usebaret.com/agents> |
| Every decision is written down with its reason | [`docs/DECISIONS.md`](docs/DECISIONS.md) |

### Originality & Track Insight (15%): "privacy-preserving and not capturable by a single platform"

| Claim | Where to check |
|---|---|
| The models never decide: KIMI explains a verdict it cannot change, and the Qwen reviewer can only veto | [`apps/server/src/api/routes/explain.ts`](apps/server/src/api/routes/explain.ts), [`packages/agent-kit/src/reviewer.ts`](packages/agent-kit/src/reviewer.ts); instructions planted in an intent: [`packages/agent-kit/src/intent-injection.test.ts`](packages/agent-kit/src/intent-injection.test.ts); live: <https://usebaret.com/review> |
| The rules are the signer's, not Baret's | [`packages/guard/src/policy.ts`](packages/guard/src/policy.ts), [`packages/guard/src/policy-templates.ts`](packages/guard/src/policy-templates.ts) |
| Threat data is a public contract on Monad, filled by a Chainlink CRE workflow | [`contracts/src/ReputationRegistry.sol`](contracts/src/ReputationRegistry.sol), [`workflows/README.md`](workflows/README.md) |
| A person's settings are encrypted with a key from their own passkey | The `SealedStore` row above |
| How Baret differs from other pre-sign tools | [`docs/analysis/competitive-landscape.md`](docs/analysis/competitive-landscape.md) |

### Founder & Market Readiness (25%): "which specific applications or developers would adopt this primitive, and why they'd choose it over rolling their own"

| Claim | Where to check |
|---|---|
| Who adopts it and why | [`docs/analysis/market-and-integrators.md`](docs/analysis/market-and-integrators.md); the submitted answer in [`docs/submission/TEXTS.md`](docs/submission/TEXTS.md) section 1 |
| The pitch | <https://youtu.be/fjZsmcU3QpQ> (1:53); [`docs/submission/baret-pitch-deck.pdf`](docs/submission/baret-pitch-deck.pdf) |
| What is needed before mainnet | [`docs/next-steps/mainnet-readiness.md`](docs/next-steps/mainnet-readiness.md) |

### Traction & Path Forward (20%): "any evidence of developer interest ... and a specific plan to get more integrations post-event"

| Claim | Where to check |
|---|---|
| An independent developer put `@baret/guard` in front of every signature of their project, Venue, during the hackathon | [their commit](https://github.com/brutaldevvin/venue/commit/cf3371607ccccca80e099b9718a6a16f7c730803), [their report](https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md) |
| Their transaction found a fault in Baret; it was fixed the same day | [README, "Used outside the team"](README.md#used-outside-the-team); D-049 in [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| Their feedback shipped in the SDK | [`CHANGELOG.md`](CHANGELOG.md), 0.1.3 |
| The plan after the event | [`docs/submission/TEXTS.md`](docs/submission/TEXTS.md) section 1, "Go-to-market"; the MetaMask Agent Wallet plugin is D-027 in [`docs/DECISIONS.md`](docs/DECISIONS.md) |

## The sponsor prizes

One section each in [`docs/evidence/README.md`](docs/evidence/README.md): KIMI, Qwen, Nansen, Dynamic, the two Mera prizes, Cleanverse, Envio, Alchemy, Chainlink CRE and the community prize. The submitted text of each is in [`docs/submission/TEXTS.md`](docs/submission/TEXTS.md).

## What is not live

Stated in the README so that nothing is read as more than it is: [README, "What is not live"](README.md#what-is-not-live). In short: a plain-text `personal_sign` message is not checked; the CRE workflow is simulated with the CRE CLI with real writes on testnet, not deployed to a DON; the Cleanverse settlements are few; the extension is installed from a zip while the Chrome Web Store reviews it; nothing is on mainnet. The longer list is [`docs/SYSTEM_GAPS.md`](docs/SYSTEM_GAPS.md).

## Files you can skip

These are the team's working files. They are kept in the repository as a record, they carry dated history lines that describe earlier states, and none of them is needed to judge the project:

| Path | What it is |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The working agreement for the team's own coding agents: roles, branches, hand-offs |
| [`tasks/`](tasks) | Each person's task list during the hackathon |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The plan and the final-week board |
| [`docs/QA_LOG.md`](docs/QA_LOG.md), [`docs/GAP_AUDIT.md`](docs/GAP_AUDIT.md) | The test log and an audit of 2026-10-11 |
| [`docs/HANDOFF_EZGIN_SECOND_MACHINE.md`](docs/HANDOFF_EZGIN_SECOND_MACHINE.md), [`docs/runbooks/`](docs/runbooks) | Setup notes and procedures |
| [`docs/research/`](docs/research) | Notes from the kickoff and the sponsor workshops |
| [`docs/REFERENCE_REPOS.md`](docs/REFERENCE_REPOS.md) | A review of the five earlier Baret versions on other chains; no code was copied |

Where a dated line in one of them disagrees with the README or the evidence index, the README and the evidence index are the current state.
