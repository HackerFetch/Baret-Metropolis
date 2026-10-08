# Baret — Monad Metropolis Hackathon · Agent Instructions

This file is loaded automatically at the start of every Claude Code session. Read it first, then `README.md`, then whichever `docs/` file matches the task.

## The project in one sentence

Baret is a security/policy layer on Monad that runs **before** a wallet, dApp or AI agent signs a transaction: it simulates the transaction, runs it through risk detectors, applies the user's policy and returns a `Safe / Caution / Blocked` verdict with reasons. For agents it provides an on-chain spending-limited vault (PaymentGuard). Details: `docs/PROJECT_OVERVIEW.md`, architecture: `docs/ARCHITECTURE.md`.

## Team and roles (3 people)

| Person | Git identity | Role | Owns |
|---|---|---|---|
| **Meriç** | `Meric` / mericcintosunn@gmail.com / GitHub `mericcintosun` | **Frontend Developer** | All UI/UX: `apps/extension`, `apps/wallet`, `apps/showcase`, `packages/ui`, `packages/web-ui`, brand / `docs/BRAND.md`, `docs/FRONTEND.md`, `docs/WALLET.md`. Tests of Meriç's own screens and components stay with Meriç. |
| **Ezgin** | GitHub `Aeztrest` / ezgincapkan64@gmail.com (author of the five earlier Baret repos) | **Backend + Contracts + System Developer** | `apps/server` (analysis engine, detectors, policy engine, API), `contracts/` (PaymentGuard, ReputationRegistry, Foundry), `packages/guard`, `packages/agent-kit`, `indexer/` (Envio), `workflows/` (Chainlink CRE), x402/facilitator, sponsor API integrations (Nansen, Cleanverse, Dynamic, Alchemy), deploy/infra. |
| **Hale** | to be filled in by Hale's agent in the first session (`git config user.name` / `user.email`, GitHub user) | **QA/Tester + Demo & Submission** (joined 2026-10-06) | **Testing of everything:** contracts, backend, SDK, the three apps, end-to-end flows on the live URLs — writing tests, running tests and reporting bugs. **Delivery:** demo video, pitch video, the submission form of every bounty, keeping the status tables in `README.md`, `docs/ROADMAP.md` and `docs/BOUNTIES_AND_TRACKS.md` true. Owns `docs/QA_AND_DELIVERY.md` and `docs/QA_LOG.md`. Writes test files anywhere; does **not** change product code or deploy config: a bug goes to its owner's task file. |

An identity that matches none of the three rows: ask who it is before doing anything.

## At the start of every session (every agent, every time)

0. If `docs/HANDOFF.md` exists locally, read it first. It is Meriç's working
   notes, deliberately not committed: what is built against what is only
   stubbed, the decisions already settled with their reasons, and the traps
   that have already cost time. Absent on a fresh clone, and that is expected.
1. Identify who you are working with via `git config user.name` / `user.email`. If unsure, ask.
2. In your first message remind the person of their role and give a one-paragraph "where the project is right now" (`README.md` status table + the current week in `docs/ROADMAP.md`).
3. Read the person's task file and summarise the open items:
   - Working with Meriç → `tasks/FOR_MERIC.md` (work Ezgin and Hale left for Meriç)
   - Working with Ezgin → `tasks/FOR_EZGIN.md` (work Meriç and Hale left for Ezgin)
   - Working with Hale → `tasks/FOR_HALE.md` (work Ezgin and Meriç left for Hale), then `docs/QA_AND_DELIVERY.md` (the test plan, the bug format, the day-by-day plan to the deadline). **Before either, read `docs/QA_LOG.md`** §1 and its latest session entry, and tell Hale where the last session stopped. On Hale's first session follow `docs/QA_AND_DELIVERY.md` §0 step by step.
4. Read `docs/ROADMAP.md` → "Final week — the board": the one plan for all three people, with every open task (`E` Ezgin, `M` Meriç, `H` Hale), its day, what it waits on and the state of every prize. Tell the person which of the other two's tasks theirs wait on, and which wait on theirs. Before work that serves a prize, read that prize's entry in `docs/QA_AND_DELIVERY.md` §8.1 (what its page asks, word for word).
5. Then move on to the user's request for the day.

## Final week: the split crosses the roles (2026-10-08 to the deadline, D-031)

The "Owns" column above says who owns a folder. For the last week the work is split by who can finish it, and the board in `docs/ROADMAP.md` is what counts:

- **Ezgin** also changes the data layer behind Meriç's wallet screens (`packages/wallet-ui/src/data`, `apps/wallet`). Not the look of a screen.
- **Meriç** also owns the KIMI and Qwen prizes end to end, including `packages/llm`, `packages/agent-kit/src/reviewer.ts` and `apps/server/src/api/routes/explain.ts`, and the window that lets a site open the wallet (which touches `packages/wallet-core`).
- **Hale** also builds: the agents playground and the `/agents` page, the wallet's history screens, the Cleanverse scenario, small copy and extension fixes, the READMEs of `packages/guard` and `packages/agent-kit`, and the final README. This replaces "does not change product code" for exactly the `H` tasks on the board that say "Build" or "Write". Each goes on its own branch and pull request, not on `qa`.

An agent does not refuse or re-ask about a task because it sits in another person's folder when the board gives it to the person it is working with. A task that is on nobody's line on the board is asked about first. When a task is finished, slips or changes hands, its line on the board and its entry in the owner's task file change in the same commit.

## Task handoff (creating work for the other side)

- When a piece of work is finished, or a dependency on somebody else appears, add a task to the file of **the person who has to act**:
  - Meriç's agent → writes to `tasks/FOR_EZGIN.md` (e.g. "this endpoint must return field X", "contract is missing event Y", "test Z broke, root cause is in the backend").
  - Ezgin's agent → writes to `tasks/FOR_MERIC.md` (e.g. "endpoint is ready, UI can connect").
  - Ezgin's or Meriç's agent → writes to `tasks/FOR_HALE.md` when something is ready to be tested or is needed for the submission (e.g. "contract deployed at address X, please test", "the wallet is live, run the end-to-end pass").
  - Hale's agent → writes to the owner's file: backend, contracts, SDK, deploy → `tasks/FOR_EZGIN.md`; any screen or copy → `tasks/FOR_MERIC.md`.
- Task format (one bullet per task, newest on top):
  ```
  - [ ] **Short title** — what to do, why, which file/endpoint/contract. Depends on: (if any). Left by: Meriç/Ezgin/Hale · Date: YYYY-MM-DD
  ```
- Do not delete completed tasks; mark them `[x]` and add a one-line result underneath. When the file gets long, the agent moves them to the "Done" section.
- When you finish an item in your own task file, mark it `[x]` too.
- Test findings (bugs) are written by Hale into the owner's file with a 🐛 prefix and a priority (`P0`/`P1`/`P2`): steps to reproduce, expected vs actual, where it was seen (URL or command, commit), related file. Full format: `docs/QA_AND_DELIVERY.md` §6. Meriç and Ezgin use the same format when they find a bug on the other side. The owner fixes and marks `[x]`; Hale re-tests and writes the verification line under it.

## Hale's agent keeps a log (`docs/QA_LOG.md`)

Every session with Hale is recorded in `docs/QA_LOG.md`, which is committed. The rules are at the top of that file; in short: one block per separate piece of work, written as soon as the piece is finished (what was done, how the thing works and how to run it again, the result, every problem with its cause and solution, bugs filed, files changed); the "How things work" section kept current; the "Where things stand" snapshot rewritten before the session ends. No secrets in it. A session whose work is not in the log is not finished.

## Git / PR rules

- `main` is protected; no direct commits to `main`.
- Meriç's working branch: **`frontend`** (open PR: "frontend"). Meriç's agent commits to this branch and merges the PR **only when Meriç explicitly says "mergele" / "merge it"**. Never merge on your own initiative.
- Ezgin opens their own branch/PR (suggested: `backend`, `contracts`). Same rule: merge only on explicit instruction.
- Commit messages in English, short, describing what changed. End them with a `Co-Authored-By:` line naming the model you are actually running as, not a pinned one.
- Hale's working branch: **`qa`** (tests, `docs/QA_AND_DELIVERY.md`, `docs/QA_LOG.md`, task files, status tables), kept small and merged often so the task files on `main` stay current. Same rule: merge only on explicit instruction.
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

**Everything in the repository is English**: code, comments, commit messages, README, `docs/`, `tasks/`, UI copy. No Turkish text anywhere in files. The only exception: **talk to the user in Turkish** in the chat (Meriç asked for this explicitly; it holds for Ezgin and Hale too).
