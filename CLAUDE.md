# Baret — Monad Metropolis Hackathon · Agent Instructions

This file is loaded automatically at the start of every Claude Code session. Read it first, then `README.md`, then whichever `docs/` file matches the task.

## The project in one sentence

Baret is a security/policy layer on Monad that runs **before** a wallet, dApp or AI agent signs a transaction: it simulates the transaction, runs it through risk detectors, applies the user's policy and returns a `Safe / Caution / Blocked` verdict with reasons. For agents it provides an on-chain spending-limited vault (PaymentGuard). Details: `docs/PROJECT_OVERVIEW.md`, architecture: `docs/ARCHITECTURE.md`.

## Team and roles (2 people)

| Person | Git identity | Role | Owns |
|---|---|---|---|
| **Meriç** | `Meric` / mericcintosunn@gmail.com / GitHub `mericcintosun` | **Frontend Developer + QA/Tester** | All UI/UX: `apps/extension`, `apps/wallet`, `apps/showcase`, `packages/ui`, `packages/showcase-ui`, brand / `docs/BRAND.md`, `docs/FRONTEND.md`, `docs/WALLET.md`. **Also testing of everything:** contracts, backend, SDK, end-to-end flows — writing tests, running tests and reporting bugs are Meriç's job. |
| **Ezgin** | GitHub `Aeztrest` / ezgincapkan64@gmail.com (author of the five earlier Baret repos) | **Backend + Contracts + System Developer** | `apps/server` (analysis engine, detectors, policy engine, API), `contracts/` (PaymentGuard, ReputationRegistry, Foundry), `packages/guard`, `packages/agent-kit`, `indexer/` (Envio), `workflows/` (Chainlink CRE), x402/facilitator, sponsor API integrations (Nansen, Cleanverse, Dynamic, Alchemy), deploy/infra. |

## At the start of every session (every agent, every time)

0. If `docs/HANDOFF.md` exists locally, read it first. It is Meriç's working
   notes, deliberately not committed: what is built against what is only
   stubbed, the decisions already settled with their reasons, and the traps
   that have already cost time. Absent on a fresh clone, and that is expected.
1. Identify who you are working with via `git config user.name` / `user.email`. If unsure, ask.
2. In your first message remind the person of their role and give a one-paragraph "where the project is right now" (`README.md` status table + the current week in `docs/ROADMAP.md`).
3. Read the person's task file and summarise the open items:
   - Working with Meriç → `tasks/FOR_MERIC.md` (work Ezgin left for Meriç)
   - Working with Ezgin → `tasks/FOR_EZGIN.md` (work Meriç left for Ezgin)
4. Then move on to the user's request for the day.

## Task handoff (creating work for the other side)

- When a piece of work is finished, or a dependency on the other side appears, add a task to the **other person's** file:
  - Meriç's agent → writes to `tasks/FOR_EZGIN.md` (e.g. "this endpoint must return field X", "contract is missing event Y", "test Z broke, root cause is in the backend").
  - Ezgin's agent → writes to `tasks/FOR_MERIC.md` (e.g. "endpoint is ready, UI can connect", "contract deployed at address X, please test").
- Task format (one bullet per task, newest on top):
  ```
  - [ ] **Short title** — what to do, why, which file/endpoint/contract. Depends on: (if any). Left by: Meriç/Ezgin · Date: YYYY-MM-DD
  ```
- Do not delete completed tasks; mark them `[x]` and add a one-line result underneath. When the file gets long, the agent moves them to the "Done" section.
- When you finish an item in your own task file, mark it `[x]` too.
- Test findings (bugs) are written by Meriç into `tasks/FOR_EZGIN.md` with a 🐛 prefix: steps to reproduce, expected vs actual, related file.

## Git / PR rules

- `main` is protected; no direct commits to `main`.
- Meriç's working branch: **`frontend`** (open PR: "frontend"). Meriç's agent commits to this branch and merges the PR **only when Meriç explicitly says "mergele" / "merge it"**. Never merge on your own initiative.
- Ezgin opens their own branch/PR (suggested: `backend`, `contracts`). Same rule: merge only on explicit instruction.
- Commit messages in English, short, describing what changed. End them with a `Co-Authored-By:` line naming the model you are actually running as, not a pinned one.
- Push only when the user asks, or as part of opening/updating a PR.

## Hard constraints (same as README, repeated on purpose)

1. **Monad only.** No other chain name appears in code. Chain IDs: testnet `10143`, mainnet `143`. Env prefix `MONAD_TESTNET_*` / `MONAD_MAINNET_*`; application prefix `BARET_*`.
2. **No legacy names:** `Premon`, `stellar-thorn`, `Blackthorn`, `DELTAG_*` are not used in any new file.
3. **Fail-closed:** when data is missing, the decision is "block".
4. **Sponsor integrations are the core of the product**, not a badge.
5. **Work is not done until code and docs are updated together.** Update the status table in the relevant `docs/*.md`.
6. **Secrets never go into the repo.** `.env` + `.gitignore`.

## Reference repos (`baret-repos/`, gitignored)

The five previous Baret versions (EVM, Stellar, Casper, Midnight, OKX) live locally under `baret-repos/` and are **never committed**. Their git history is not carried over and files are not copied; they are read for ideas and everything is written from scratch. Comparative review: `docs/REFERENCE_REPOS.md`.

## Language

**Everything in the repository is English**: code, comments, commit messages, README, `docs/`, `tasks/`, UI copy. No Turkish text anywhere in files. The only exception: **talk to the user in Turkish** in the chat (Meriç asked for this explicitly).
