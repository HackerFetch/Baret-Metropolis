# Baret — 6-Week Roadmap

> This file is a **live checklist**. At the end of every week the boxes are ticked, and slips/delays are written into the "Notes" line. The status table in `README.md` is kept in sync with this file.

Last updated: 2026-10-08 · Currently: **the final week**. **Submission closes Wed 14 Oct 2026, 06:59 (GMT+3).** The plan for all three people is the section "Final week — the board" below; the boxes of Weeks 1 to 4 are history and are brought up to date by Hale (H12)

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

## Final week — the board (rewritten 2026-10-08, replaces Weeks 5 and 6)

**This section is the single plan for all three people and their agents.** Every open piece of work has one line here with an ID, an owner and a day. The detail of a task is in its owner's file: `E` tasks in `tasks/FOR_EZGIN.md`, `M` tasks in `tasks/FOR_MERIC.md`, `H` tasks in `tasks/FOR_HALE.md`. When a task is finished, slips or changes owner, change its line here **and** in the owner's file in the same commit. Decisions behind it: D-025, D-031.

### The goal

The demo has to show one thing: **on the same site, with the same button, a wallet with no pre-sign check lets the user sign the attack and the money leaves; with Baret the same request is read, explained and stopped before anything is signed.** The six showcase sites exist for that. Everything on the board is ordered by how much it serves this story, then by the sponsor bounty it completes.

### Dates

| When | What |
|---|---|
| Fri 9 Oct | Build day: the wallet goes live, the real signature path lands on NovaSwap, Hale sets up and starts testing |
| Sat 10 Oct | Build day: the site-to-wallet window, the model layer, the second test pass |
| **Sun 11 Oct, 12:00** | **Feature freeze.** After it only P0 and P1 fixes merge. Videos are recorded in the afternoon |
| Mon 12 Oct | Final regression, forms filled in, **submit** |
| Tue 13 Oct | Buffer. Nothing new merges |
| **Wed 14 Oct, 06:59 (GMT+3)** | Submission closes (the time on the bounty page) |

### Where things stand (checked 2026-10-08 against the live system, commit `2965c57`)

- Live: the API on Render, the showcase and the wallet site on Vercel, the extension zips, the Envio indexer. `verify:demo` agrees with the live API on 20 of 20 scenarios. Every branch is merged; CI on `main` is green.
- **The demo sites sign nothing.** A wallet connects only so the site can read its address (`apps/showcase/src/sites/kit/wallet/engine.ts`). The moment where an ordinary wallet approves the attack is not on the site.
- **Baret is a panel on the page, not a wallet that refuses.** The extension's background and provider are empty stubs (cut for the hackathon). `apps/wallet` runs on sample data: no app imports `@baret/wallet-core`. No site can open the wallet's connect or sign window.
- No screen reads `/v1/audit/*`. The agents playground answers its six actions from samples.
- Two of the six attacks answer Caution, not Blocked, under Balanced: OrbitYield's silent pool and LaunchPad's proxy sale.
- Off on the live API: Nansen (`nansen: false`), the explanation route (`explain: false`).
- Hale has GitHub access since 2026-10-08 and has not had a first session yet.

### Sponsor bounties: what each one asks and what is missing

The wording in the second column is from the bounty page (`Bounties.txt`). The full status history is `docs/BOUNTIES_AND_TRACKS.md`; the form fields per bounty are `docs/QA_AND_DELIVERY.md` §8.

| Bounty | The page asks for | State on 2026-10-08 | Closed by |
|---|---|---|---|
| Main track: Trust, Identity & AI Infrastructure ($30,000) | Protocol-level primitives for trust | 🔶 The product works; the demo story cannot be shown yet | M1, M2, E9, E10, H9, H11 |
| Best use of Nansen ($5,000 pool) | A product experience on Nansen data, beyond raw data | ❌ Off on the live API, no key | E4, H7 |
| Best Use of Dynamic ($5,000) | The SDK in a deployed, demoable app | 🔶 A Dynamic server wallet paid from a vault through the CLI; nothing on a deployed page | M5, E6 |
| Best Mera-Powered UX ($2,500) | Mera as the entire account layer | ❌ The wallet app is on sample data | E5, M6 |
| Mera: One Passkey, Many Keys ($2,500) | A creative non-wallet use of PRF-derived keys | 🔶 Agent keys checked on testnet by script; the delegation screen is not wired | E6, M6 |
| Best Integration of Cleanverse ($2,000) | An app that gates CVA movement behind on-chain CVI identity | 🔶 The server reads the chain, 2 of 2 live scenarios agree; nothing on a screen, no Baret contract | M7, E12 |
| Best Use of Envio ($1,000) | Indexed data driving a core feature | 🔶 Indexer and `/v1/audit/*` live; no screen reads them | E7, M6 |
| Best Projects using Alchemy ($1,000 credits) | At least one Alchemy service, meaningfully | ✅ Every read goes through Alchemy (`alchemy: ok` on live answers). Thin, but it meets the text | H12 |
| Best workflow with CRE ($3,000) | Build, simulate or deploy a CRE workflow | ✅ Simulated with a real write; the live API blocks an address it wrote (`SCAMSNIFFER_BLACKLIST`) | H6, H12 |
| Best Agent Wallet Plugin, MetaMask ($2,500) | A new trading superpower for the Agent Wallet | 🔶 Built and checked with a real Agent Wallet. Risks: the bounty sits in another track, the plugin is a safety gate, no confirmed send on testnet | E3, M5, H6 |
| Best Builds Powered by KIMI ($3,000 credits) | A project genuinely powered by KIMI | ❌ Back in (D-031). The route exists and has never called the model | M3, E11 |
| Best Builds with Qwen 3.8 Max ($5,000 credits) | Genuinely agentic use on Monad (and, per the page, a published article) | ❌ Back in (D-031). A one-call reviewer exists and has never called the model | M4, H10 |
| Best Community Team Project ($5,000) | A team of Metropolis community supporters | ❌ Not checked on the platform | E3 |

### Who does what, and why it crosses the usual roles

For this week the split follows who can finish a thing fastest, not the folder it lives in (D-031):

- **Ezgin** wires the wallet's data layer, the history and the playground, because `@baret/wallet-core`, `/v1/audit/*` and the `@baret/demo` builders are Ezgin's code. Ezgin changes the stores and the sources behind the screens, not the screens.
- **Meriç** builds everything the viewer sees in the demo, and owns the two model bounties (KIMI and Qwen) end to end, including the code in `packages/llm`, `packages/agent-kit/src/reviewer.ts` and `apps/server/src/api/routes/explain.ts`.
- **Hale** tests everything, records the videos, fills in the forms, and takes every job that needs no product code.

### Ezgin

| ID | Task | Day | Needs | Serves |
|---|---|---|---|---|
| E1 | Finish Hale's onboarding: platform team, funded test wallet, a vault to test against | Thu 8 to Fri 9 | Hale's wallet address | everything Hale does |
| E2 | Agree the freeze (Sun 11, 12:00) and this board with Meriç and Hale | Thu 8 | | |
| E3 | On the platform: community supporter status; whether a sponsor bounty needs its own track; collect every bounty's requirements into `docs/QA_AND_DELIVERY.md` §8 | Thu 8 to Fri 9 | | Community, MetaMask, all forms |
| E4 | Nansen live: credits, `NANSEN_API_KEY` and `NANSEN_MODE=labels` on Render, checked on the live API | Fri 9 | credits | Nansen |
| E5 | Wallet live, part 1: passkey account, lock, balances, send, sign requests through `@baret/wallet-core` | Fri 9 | | Mera UX |
| E6 | Wallet live, part 2: delegation (vault, caps, pause, revoke, the agent from a passkey key or a Dynamic address) | Fri 9 | E5 | Many Keys, Dynamic |
| E7 | History and the vault's merchants from `/v1/audit/*` | Fri 9 | E5 | Envio |
| E8 | The agents playground's six actions answer from the live API | Fri 9 | | main track |
| E9 | A site can open the wallet's connect and sign windows; NovaSwap offers "Check with Baret" through it | Sat 10 | E5, M1 | main track, Mera UX |
| E10 | Decide and build: do the two Caution attacks become Blocked | Sat 10 | | main track |
| E11 | Put the model keys Meriç sends on Render, confirm `explain: true` on `/health/ready` | Sat 10 | M3 | KIMI |
| E12 | Cleanverse contract side, only if the sponsor's guides and an A-Pass arrive | when unblocked | sponsor | Cleanverse |
| E13 | Render on the Starter plan before recording; back up `~/.baret/` | Sun 11 morning | | videos |
| E14 | README and ARCHITECTURE final; one evidence note per bounty for H12 | Sun 11 to Mon 12 | | all forms |

### Meriç

| ID | Task | Day | Needs | Serves |
|---|---|---|---|---|
| M1 | NovaSwap: a real signature path. In attack mode the connected wallet signs and sends the attack, and the page shows the money leaving | Fri 9 | | main track |
| M2 | The comparison flow and its copy: same site, same button, two wallets | Fri 9 | M1 | main track |
| M3 | KIMI live: a key, the first real call, the explanation on a screen | Fri 9 to Sat 10 | E11 for production | KIMI |
| M4 | Qwen: the reviewer run against the real model and made agentic (several steps, tools). Dropped again if not working by Sat 10, 20:00 | Sat 10 | a key | Qwen |
| M5 | `/agents` tells the truth: the shipped agent-kit API, the Dynamic wallet and its transaction, the MetaMask plugin, no MCP sample | Sat 10 | | Dynamic, MetaMask |
| M6 | The wallet screens on live data: fix what breaks, remove the sample notice | Sat 10 | E5, E6, E7 | Mera, Envio |
| M7 | Cleanverse on a screen: one aUSDC scenario and the wording for a finding that comes from the asset | Sun 11 before 12:00 | | Cleanverse |
| M8 | Small copy and the extension: the ScamSniffer reason, the agent-key sentence, the extension's API URL, the unused `scripting` permission | Sun 11 before 12:00 | | |

### Hale

| ID | Task | Day | Needs | Serves |
|---|---|---|---|---|
| H1 | First session: machine, `qa` branch, git identity into `CLAUDE.md`, a test wallet | Fri 9 morning | | |
| H2 | Check the platform's form fields against `docs/QA_AND_DELIVERY.md` §8 and fill the gaps | Fri 9 | E3 | all forms |
| H3 | The MetaMask rehearsal: sign NovaSwap's attack with MetaMask and record exactly what MetaMask shows | Fri 9 | M1, E1 | main track |
| H4 | Walk the six demo sites on the live URL; run `verify:demo` | Fri 9 | E1 | main track |
| H5 | Backend and contract suites, the cap fuzz test, the contract addresses on the explorer | Fri 9 | | |
| H6 | The four x402 scenarios, the CRE oracle, the MetaMask plugin with its screen capture | Sat 10 | E1 | Chainlink, MetaMask |
| H7 | Wallet end to end on the live URL; Nansen labels on the screens; browsers and a phone | Sat 10 | E4 to E7, M6 | Mera, Envio, Nansen |
| H8 | Sponsor perks (Tenderly, QuickNode, Zerion): claim or mark not needed | Sat 10 | | |
| H9 | The demo video script: the drain in MetaMask and the block in Baret inside the first 30 seconds, every sponsor on screen once | Sat 10 | H3 | all |
| H10 | The Qwen article, if M4 is working | Sat 10 to Sun 11 | M4 | Qwen |
| H11 | Record the demo video and the pitch video | Sun 11 afternoon | H9, E13 | all |
| H12 | Status tables true, the tracked root notes checked, one submission text per bounty | Sun 11 to Mon 12 | E14 | all forms |
| H13 | Final regression and submit | Mon 12 | | all |

### What is cut first

If a day slips, drop in this order and write it down here and in `docs/BOUNTIES_AND_TRACKS.md`: E12 (Cleanverse contract), M4 and H10 (Qwen), M8, M7, E10, M3 (KIMI), E9. **Never cut:** M1 and M2 (the story), E5 to E7 (three bounties depend on them), H3, H9, H11, H13.

If E9 is not working by Saturday evening, the Baret side of the story stays the panel on the page, the MetaMask drain is still real, and the video is told with those two.

### Known risks

- Ezgin is the bottleneck on Friday: Mera (both), Envio and Dynamic all wait on E5 to E7.
- H3 can change the story. If MetaMask warns on that transaction, the claim becomes "it does not tell you what will change", never "it does not protect you". Nothing about another wallet is said in the copy or the video that H3 did not see.
- The MetaMask bounty is tagged for another track; E3 answers whether it can be entered at all.

### Not planned before the deadline

The extension's live background and provider, a real 402 paywall endpoint for Scrybe, Alchemy webhooks and gas sponsorship, the CRE workflow on a DON, the Perpl panel, `POST /vitals`, the sources-zip rebuild job in CI.

---

## Cut Rule (if time runs short)

Priority order (see `BOUNTIES_AND_TRACKS.md`): Main track + Nansen + Mera + Envio + Cleanverse + Alchemy are **never dropped**. First all of Tier A is cut, then if necessary Dynamic's scope is reduced (down to the minimum "beyond login" integration in agent-kit only).
