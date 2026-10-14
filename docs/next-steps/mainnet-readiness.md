# Mainnet readiness

**The decision so far: testnet only.** Ezgin ruled mainnet out for the event on 2026-10-13: nothing is deployed on Monad mainnet (chain id 143), and no plan, pitch or submission text names a mainnet step ([`docs/HANDOFF_EZGIN_SECOND_MACHINE.md`](../HANDOFF_EZGIN_SECOND_MACHINE.md)). This page lists what would have to change before that decision could be revisited. It promises no dates.

The code is ready to name mainnet: the chain constants (`packages/guard/src/chains.ts`) name only Monad testnet (10143) and mainnet (143), the server reads `MONAD_MAINNET_*` variables, and the MetaMask plugin takes `--chain-id 143`. What is missing is everything around the code. Known gaps with their owners: [`docs/SYSTEM_GAPS.md`](../SYSTEM_GAPS.md).

Owner roles: **Contracts** (Solidity, deploys), **Backend** (API, detectors, data sources, infra), **Frontend** (wallet, extension, showcase), **QA** (tests, release checks). On the current team these are Ezgin (contracts and backend), Meriç (frontend) and Hale (QA).

---

## 1. Contracts

- [ ] **External audit** of `PaymentGuard`, `PaymentGuardFactory`, `ReputationRegistry`, `ReputationOracleReceiver`, `CompliantPaymentGuard` and `SealedStore`. Today they are unaudited testnet deployments (G-18), tested with 85 Foundry tests including fuzz and invariants, and source verified on Monad's Sourcify. Owner: Contracts.
- [ ] Close the two unticked items in [`docs/CONTRACTS.md`](../CONTRACTS.md): the fuzz of the cap arithmetic as its own item, and recorded traces of the main attack scenarios. Owner: Contracts, QA.
- [ ] **Ownership and admin keys** of the registry, the oracle receiver and the factory moved to a multisig; a written procedure for pausing and for rotating the registry's writer. Owner: Contracts.
- [ ] **The Chainlink CRE workflow on a DON.** Today it runs in the CRE simulator with real testnet writes; deploying needs Chainlink's access (an NDA and commercial terms, their answer of 2026-10-12). Until then the registry's feed depends on a person running the simulator. Owner: Backend.
- [ ] Deploy on mainnet and verify every source on Monad's Sourcify; fill the mainnet row of [`docs/CONTRACTS.md`](../CONTRACTS.md). Owner: Contracts.
- [ ] Cleanverse: confirm `CompliantPaymentGuard` against Cleanverse's mainnet contracts and asset list. Owner: Contracts.

## 2. Keys

Today these keys are testnet keys holding test funds, set as environment variables on Render (names in `apps/server/.env.example`, values never in the repository).

- [ ] **Relayer and facilitator key** (`BARET_SEALED_RELAYER_PRIVATE_KEY`; the x402 facilitator falls back to it when `BARET_X402_FACILITATOR_PRIVATE_KEY` is unset, [D-046](../DECISIONS.md)): give each job its own key, hold them in a key-management service or HSM rather than a plain variable, fund them with a small float, and alert on low balance (today nothing warns when the relayer runs low; `/v1/sealed` then answers 502, G-15). Owner: Backend.
- [ ] **Demo agent keys** (`BARET_DEMO_AGENT_PRIVATE_KEY` for `/review`; the Dynamic server wallet for `/agents`): on mainnet a public demo must not spend real funds. Either keep the demos on testnet or run them against vaults with tiny caps and a kill switch (`BARET_REVIEW_ENABLED=0` exists). Owner: Backend.
- [ ] A key-rotation and incident procedure written into [`docs/runbooks/`](../runbooks/). Owner: Backend.

## 3. Abuse controls and rate limits

- [ ] **API keys or signed client tokens** for paid routes. Today the API is open with no keys and any origin (G-17): per-visitor limits key on a trusted proxy address (closed 2026-10-11), and the daily caps for KIMI, review and sealed writes are counted per process, so one caller can use up a day's budget for everyone. Owner: Backend.
- [ ] Per-integrator quotas, so one dapp's traffic cannot starve another's checks. Owner: Backend.
- [ ] Keep the fail-closed rule under load: a 429 or a timeout is Blocked in the SDK, which is right for safety and wrong for availability; capacity has to be sized so honest traffic is not blocked. Owner: Backend, QA.

## 4. Paid data and model budgets

- [ ] **Nansen.** Today: 10,000 credits bought, `labels` mode with at most 25 label lookups a day, then `first-funder` ([D-041, D-042](../DECISIONS.md)). On mainnet Nansen has records for most wallets and a wallet with no record reads as fresh (`absenceIsFresh` is true on mainnet), so lookups per check rise. A budget per integrator, a cache across instances and a decision on what the verdict does when the budget is spent (fail-closed means Blocked under rules that depend on it). Owner: Backend.
- [ ] **KIMI and Qwen.** Today daily caps per process (`BARET_KIMI_DAILY_LIMIT`, `BARET_REVIEW_DAILY_LIMIT` in `render.yaml`). A monthly spend ceiling with the providers, per-integrator limits, and the explanation kept optional: the verdict never depends on a model ([D-028](../DECISIONS.md)), so a model outage must only remove the plain words. Owner: Backend (routes), Frontend (KIMI and Qwen surfaces).
- [ ] **RPC.** Chain reads go through Alchemy's Monad RPC; the trace goes to the public Monad RPC because Alchemy's free tier has no `debug_traceCall`. Mainnet needs a paid trace-capable RPC with a second provider as fallback. Owner: Backend.

## 5. State, redundancy and the indexer

- [ ] **Shared state.** The server keeps its state in memory in one process (G-10): verdict ids for `/v1/explain`, caches and daily counters are lost on restart and not shared by a second instance. Move them to a shared store and run at least two instances. Owner: Backend.
- [ ] **Indexer redundancy.** The Envio HyperIndex deployment is a hosted development deployment; its free plan deletes a deployment after 30 days, or after 7 days without a request ([`docs/DEPLOYMENT.md`](../DEPLOYMENT.md)). Mainnet needs a production plan, a second indexer or a direct-RPC fallback for `/v1/audit/*`, and coverage of `CompliantPaymentGuard` and `SealedStore`, which are not indexed today (G-19). Owner: Backend.

## 6. Monitoring

- [ ] Uptime checks on `/health/ready` with paging, replacing the GitHub keep-warm job, which GitHub does not run on time (G-03). Owner: Backend.
- [ ] Alerts on: relayer and facilitator balances, daily budget use (Nansen, KIMI, Qwen), RPC and trace error rates, the share of verdicts that are Blocked for a failed check (a rise means a data source is down, not that attacks rose). Owner: Backend.
- [ ] `verify:demo` run on a schedule against production, with its scenarios extended to mainnet addresses. Owner: QA.

## 7. Clients and distribution

- [ ] **Extension store listing.** Submitted to the Chrome Web Store on 2026-10-12, pending review ([`docs/STORE_LISTING.md`](../STORE_LISTING.md)). Before mainnet: a custom node and network choice in Settings (not live in the extension today, [D-040](../DECISIONS.md)), a version bump per release, and the listing text updated to say mainnet. Owner: Frontend.
- [ ] **`personal_sign` messages are not checked** (nothing to simulate); decide whether mainnet clients warn more strongly on them. Owner: Frontend, Backend.
- [ ] **Wallet window message signing** (G-12): typed data and `personal_sign` from a site to the Baret web wallet. Owner: Frontend.
- [ ] Every surface shows which network a verdict is for; the SDK already flags a verdict for the wrong chain (0.1.3). Owner: Frontend, QA.

## 8. Legal and privacy

- [ ] Review [`docs/PRIVACY.md`](../PRIVACY.md) for mainnet: it covers the extension and the analysis server. Add the web wallet, the data each sponsor service receives (Nansen lookups, model providers for explanations), retention, and a contact. Owner: Frontend (wallet and extension text), Backend (server and providers).
- [ ] Terms of use that say a verdict is advice, not a guarantee, and what the user keeps responsibility for. Owner: team, with legal advice.
- [ ] Provider terms checked for commercial use at mainnet volume: Nansen, KIMI, Qwen, Alchemy, Envio, Dynamic, Chainlink. Owner: Backend.
- [ ] Compliance review of the Cleanverse flow for real assets. Owner: Contracts, with Cleanverse.

## 9. Release gate

Mainnet goes ahead only when every box above is ticked or explicitly waived in [`docs/DECISIONS.md`](../DECISIONS.md) with its reason, and the release steps in [`docs/runbooks/release.md`](../runbooks/release.md) pass. Owner: the whole team.
