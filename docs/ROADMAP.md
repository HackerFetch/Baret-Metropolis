# Baret — 6-Week Roadmap

> This file is a **live checklist**. At the end of every week the boxes are ticked, and slips/delays are written into the "Notes" line. The status table in `README.md` is kept in sync with this file.

Last updated: 2026-10-06 · Currently: **Week 3** (backend caught up to the end of Week 2) · **Submission closes 2026-10-13.** The day-by-day plan for the last week (testing, videos, forms) is `docs/QA_AND_DELIVERY.md` §9; Hale joined on 2026-10-06 for QA and delivery and brings the boxes below up to date

---

## Week 0 — Planning (completed: 2026-09-13)
- [x] The two old repos (Baret-Stellar, Baret-EVM) reviewed at code level
- [x] Bounties/Resources/Notes analyzed
- [x] Track selected: Trust, Identity & AI Infrastructure
- [x] Document set created (these files)

---

## Week 1 — Foundation + Decisions
- [x] New git repo created (clean history, commits starting today)
- [x] pnpm workspace skeleton (`apps/`, `packages/`, `contracts/`; `workflows/` and `indexer/` come with their modules)
- [ ] Monad testnet RPC (Alchemy) + sponsor perks claimed (Tenderly, QuickNode, Zerion) — see `RESOURCES.md` §1
- [x] `contracts/PaymentGuard.sol` written, tested, deployed to Monad testnet — `CONTRACTS.md` §2.6 filled in (2026-10-02, with ReputationRegistry)
- [x] **Milestone demo:** catch and block a single risky transaction end to end (`verify:demo`, 18 of 18)

**Notes:** Backend started late (2026-10-01). Server answers `/health/ready` and traces a transaction against the public Monad testnet RPC. CLI milestone demo: `curl` against `/v1/analyze`.

---

## Week 2 — Core Analysis Engine
- [x] `apps/server`: decode → simulate (`debug_traceCall`) → basic detectors (approvals, programs, evm-danger, simulation) — all 9 detector modules exist
- [x] Policy engine (all 25 rules) + `STRICT/BALANCED/PERMISSIVE` templates
- [x] `packages/guard` SDK (TransactionGuard.evaluate)
- [x] `apps/showcase`: at least 2 threat scenarios (all six have testnet contracts; NovaSwap is wired live)
- [ ] **Milestone demo:** live analysis through the showcase, demonstrable in the browser

**Notes:** _(to be filled in)_

---

## Week 3 — Tier S Integrations (1/2)
- [x] Nansen: `reputation.ts` connected to the real API (client and detector done; live use waits for credits)
- [x] Envio: `indexer/` set up, PaymentGuard events being indexed, `/v1/audit/*` fed from here (live 2026-10-07)
- [x] Alchemy: every read through the Alchemy Monad RPC, batched (traces go to the public RPC: the free tier has no `debug_traceCall`; webhooks and gas sponsorship not built)
- [ ] Cleanverse: `compliance.ts` detector + at least one gated demo scenario

**Notes:** _(to be filled in)_

---

## Week 4 — Tier S Integrations (2/2)
- [ ] Mera: `apps/wallet` moved to the passkey account layer (no seed phrase) — the account layer is `@baret/wallet-core`; wiring the screens is open
- [x] Mera PRF sub-key → PaymentGuard agent signer flow working (checked on testnet with `verify:wallet`)
- [x] Dynamic: `packages/agent-kit` autonomous/server wallet + delegation (a Dynamic wallet paid from the vault)
- [ ] `apps/extension`: x402 interceptor finished, the 4 scenarios in `X402_FACILITATOR.md` §5 tested
- [ ] Best Community Team Project eligibility verified

**Notes:** _(to be filled in)_

---

## Final week — 2026-10-07 to 2026-10-13 (replaces Weeks 5 and 6)

Submission closes **2026-10-14 06:59** (the time on the bounty page). The original six-week plan assumed more calendar than the hackathon has; this section is the real one. Decision: D-025.

**Where things stand on 2026-10-07.** Done and live on Monad testnet: the analysis API (Render), the showcase and wallet sites (Vercel), CI/CD, PaymentGuard + factory + ReputationRegistry + the demo contracts of all six showcase sites (source verified), `@baret/demo` builders with all 18 scenarios agreeing with the live API, agent-kit with a Dynamic server wallet that has paid from a vault, `@baret/wallet-core` (Mera passkey account, agent keys, check before every signature), the Envio indexer feeding `/v1/audit/*`, Alchemy for every read. Waiting on others: Nansen (credits), the frontend wiring of the demo sites, the playground, the wallet and the history screens (Meriç, guides in `tasks/FOR_MERIC.md`).

| Day | Backend work (Ezgin) | Bounty | Needs from Ezgin first |
|---|---|---|---|
| 10-07 → 10-08 | **Chainlink CRE**: `workflows/reputation-oracle` — cron trigger, fetch a threat feed, write to `ReputationRegistry.onReport` through the forwarder; at least a recorded simulation | $3,000 | a CRE account and `cre login` on this machine |
| 10-08 → 10-09 | **MetaMask Agent Wallet plugin**: `packages/metamask-plugin` — a pre-trade check that asks Baret and refuses to propose a transaction Baret blocks | $2,500 | the plugin SDK docs from the bounty page |
| 10-09 → 10-10 | **LLM layer** (one OpenAI-compatible client, two uses): Qwen reviews an agent's transaction against its intent and can veto (`agent-kit`); KIMI turns a verdict into plain language (`POST /v1/explain`) | $5,000 + $3,000 in credits | an Alibaba Cloud Model Studio key and a Moonshot (KIMI) key |
| when unblocked | **Cleanverse**: the compliance detector reads CVI identity on-chain and gates a CVA transfer; one gated demo scenario | $2,000 | the CVI/CVA contract addresses or docs from the sponsor channel |
| when credits arrive | **Nansen**: `NANSEN_MODE=labels`, checked live | $5,000 pool | credits on the account, `NANSEN_API_KEY` on Render |
| 10-11 → 10-12 | **Submission**: README and ARCHITECTURE final, one "what we built, where the proof is" note per bounty, the demo video script, end-to-end QA with Meriç, fixes | all | recording the demo and pitch videos, the forms |
| 10-13 | Buffer. Submit. | | "Community supporter" status checked on the platform ($5,000, no work) |

- [x] Chainlink CRE workflow (2026-10-07: simulated with a real write on testnet, D-026; DON deployment waits for Early Access)
- [x] MetaMask Agent Wallet plugin (2026-10-07: the gates checked with a real Agent Wallet on testnet, D-027; the wallet itself cannot send on testnet)
- [ ] Qwen reviewer
- [ ] KIMI explanation
- [ ] Cleanverse compliance (blocked on sponsor information)
- [ ] Nansen labels live (blocked on credits)
- [ ] README/ARCHITECTURE finalized (in sync with code)
- [ ] Per-bounty evidence notes; status column of every row in `BOUNTIES_AND_TRACKS.md` up to date
- [ ] Demo video and pitch video recorded
- [ ] Submission fields filled in for every targeted bounty
- [ ] Best Community Team Project eligibility verified

**Rule for this week:** each stretch item gets its day and no more. If one is not working by the end of its slot it is dropped and written down, so the submission days (10-11, 10-12) are never spent on a feature.

---

## Cut Rule (if time runs short)

Priority order (see `BOUNTIES_AND_TRACKS.md`): Main track + Nansen + Mera + Envio + Cleanverse + Alchemy are **never dropped**. First all of Tier A is cut, then if necessary Dynamic's scope is reduced (down to the minimum "beyond login" integration in agent-kit only).
