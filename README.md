# Baret — Monad Metropolis Hackathon

> A Monad-specific transaction security / policy layer that simulates a transaction before it is signed and gives a reasoned answer to the question "is this safe or dangerous?"

This repository and this document set are meant for **live** tracking. They were prepared before any code was written; as the project progresses, **these files must be updated too**. Anyone starting a new conversation / new AI session should read this README first, then the relevant file under `docs/` depending on what they need.

---

## Status Summary (last updated: 2026-10-04)

| Area | Status |
|---|---|
| Phase | Frontend scaffolded. Backend core on the `backend` branch: `packages/guard` (schemas, templates, client), `apps/server` `/v1/analyze` with all 9 detectors and the policy engine, both contracts tested |
| Track decision | **Trust, Identity & AI Infrastructure** ($30k) — see `docs/BOUNTIES_AND_TRACKS.md` |
| Repo | `HackerFetch/Baret-Metropolis`. Frontend work lands on the `frontend` branch |
| Copy | 46 files in `packages/content`, one per page or frame, complete |
| Design system | 37 components in `packages/ui`; the web signature layer in `packages/web-ui` (type scale, motion, reveals, the eyelet cursor); the wallet pieces both wallets share in `packages/wallet-ui` (sign request, rule editor, findings, QR) |
| Apps | Built on sample data, frontend only: `showcase` (landing, hub, agents, docs, install, kit, NovaSwap and five more demo sites), `wallet` (11 screens) and `extension` (12 popup surfaces, 10 options pages with setup). Frontend audit (2026-10-04, branch `frontend-audit`): the landing is prerendered (LCP on a throttled phone 2.74 s to 1.88 s), every route has its own head and preloads, no console warnings on any surface, WCAG AA contrast in both themes and all six demo palettes, fail-closed gaps closed (locked request windows, permits, reachability), copy that claims nothing the product cannot back. Live wiring is next (`docs/WALLET.md`, `tasks/FOR_EZGIN.md`) |
| Server and contracts | Server: 31 tests, all 38 finding codes produced by a scenario, traced live against Monad testnet. Contracts: 26 forge tests. Nansen/Cleanverse clients, Envio, CRE, agent-kit not started |
| Contract deploy | Monad testnet: PaymentGuard, ReputationRegistry and the demo contracts of all six showcase sites, source verified — `docs/CONTRACTS.md` §2.6, §3.4, §7 |
| Hosting / CI | GitHub Actions CI (checks, build, contracts); Vercel for showcase + wallet, Render for the API — config written, projects not created yet (`docs/DEPLOYMENT.md`) |
| Week | 3 / 6 (backend is a week behind: Week 2 core done, Week 3 integrations next) |

Update this table at every major phase transition (when the repo is created, on the first deploy, when the week changes). For detailed weekly progress: `docs/ROADMAP.md`.

---

## Document Map

| File | What it is for | When to read it |
|---|---|---|
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | What the product is, who it is for, what it does end to end, MVP scope | Anyone / any AI looking at the project for the first time should read this first |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical architecture: monorepo layout, data flow, chain constants, environment variables | Before starting to write code / before changing a module |
| [`docs/WALLET.md`](docs/WALLET.md) | All surfaces, screens and flows of the wallet (extension + Mera-backed standalone) | Before touching the wallet UI |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Content specification for every page of the marketing/showcase site (Home, Showcase, Agents, Docs, Install) — contains no design/palette | When writing/updating a frontend page |
| [`docs/BOUNTIES_AND_TRACKS.md`](docs/BOUNTIES_AND_TRACKS.md) | Track selection, targeted bounties, tier list, status tracking for each | When making scope decisions / when asking "should we do this?" |
| [`docs/RESOURCES.md`](docs/RESOURCES.md) | Which sponsor tool is used where and how, claim tracking, env var list | When starting an integration |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | Smart contract specifications, deploy table, security checklist | When writing/deploying contracts |
| [`docs/X402_FACILITATOR.md`](docs/X402_FACILITATOR.md) | x402 payment flow and facilitator design | When touching the x402/agent payment layer |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | 6-week calendar, weekly checklist, progress | Update at the start/end of every week |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture/scope decisions taken and their rationale (ADR log) | Check here first before taking a new decision, then add it |
| [`docs/REFERENCE_REPOS.md`](docs/REFERENCE_REPOS.md) | Comparative review of the 5 previous Baret versions (EVM, Stellar, Casper, Midnight, OKX): what gets reused, which mistakes are not repeated | Read the relevant section before starting to write a module |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel (showcase, wallet) + Render (API) setup, the CI/CD pipeline, running it locally | Before touching `ci.yml`, `render.yaml`, `vercel.json` or deploying |
| [`docs/QA_AND_DELIVERY.md`](docs/QA_AND_DELIVERY.md) | How Baret is tested, the bug report format, the submission checklist and tracker, the day-by-day plan to the 2026-10-13 deadline (Hale's working document) | Before testing, filing a bug, recording a video or filling in a submission form |
| [`docs/QA_LOG.md`](docs/QA_LOG.md) | Hale's running record, one entry per session: what was done piece by piece, how each thing works, every problem and its solution, where QA and delivery stand today | To see what has been tested and what is open; Hale's agent reads it first and updates it in every session |
| [`docs/BRAND.md`](docs/BRAND.md) | Brand spec BK-001 Rev 02: lockout/tagout identity, mark, tag device, palette, type, imagery brief, voice | Before touching any UI, marketing page or generated asset |

---

## What Is This in One Sentence?

Before a wallet, dApp or AI agent on Monad signs a transaction, Baret simulates it, runs it through independent risk detectors (approval drain, unknown contract, Nansen-based reputation, compliance, x402 payment shape), decides according to the user's own policy and returns `safe: true/false` together with the reasoning. For agents, instead of a raw private key it provides an on-chain spend-limited, revocable authorization (PaymentGuard vault + Mera PRF sub-key).

For details: `docs/PROJECT_OVERVIEW.md`.

---

## Critical Constraints (apply to every file, must not be forgotten)

1. **Monad only.** No other network's name will appear in code, docs or the brand name (no Stellar, no Solana, no generic "any EVM chain"). Chain constants are hardcoded: testnet `10143`, mainnet `143`.
2. **Fresh git history.** The repo to be created for this project will take commits starting today (2026-09-13); the git history of the old `Baret-Stellar` / `Baret-EVM` repos will not be carried over. Code/concept inspiration may come from the old repos, but the files are written from scratch.
3. **Name: Baret.** The old code names (`Premon`, `stellar-thorn`, `Blackthorn`, the `DELTAG_*` env prefix) will not be used in any new file.
4. **Sponsor integration = the core of the product, not a badge.** Removing any integration must cause a real breakage in the product (see the Cleanverse test, `docs/BOUNTIES_AND_TRACKS.md`).

---

## How to Contribute (for AI sessions)

1. First read this README + `docs/PROJECT_OVERVIEW.md` + `docs/ARCHITECTURE.md`.
2. Position the work to be done against the weekly plan in `docs/ROADMAP.md`.
3. If an out-of-scope idea comes up, check `docs/BOUNTIES_AND_TRACKS.md` first — it may already have been evaluated and rejected.
4. If a new architecture/scope decision is taken, add it to `docs/DECISIONS.md`.
5. When the work is done, update the status table in the relevant `docs/*.md` file. **Work does not count as "done" unless code and docs are updated together.**
