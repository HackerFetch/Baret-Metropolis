# Baret — QA Log

> Hale's running record, written by Hale's agent and committed to the repo: what was done in each session, piece by piece, how each thing works, every problem that came up and how it was solved. Anyone (Hale, a new agent session, Ezgin, Meriç) must be able to read this file alone and know where the QA and delivery work stands. Plan: `docs/QA_AND_DELIVERY.md`. Tasks: `tasks/FOR_HALE.md`.

## How this file is kept (rules for the agent)

1. **Read it first.** At the start of every session with Hale, read §1 and the latest entry of §3 before anything else, and tell Hale in two or three sentences where the last session stopped.
2. **Write as you go, not at the end.** After each finished piece of work (one task, one test pass, one bug hunted down), add its block to today's entry straight away. A session that ends abruptly must still leave its record.
3. **One block per piece.** Every separate thing gets its own block with the fields of the template in §4. Never fold two pieces into one line such as "tested the sites".
4. **Problems are written with their solution.** What happened (the exact error text or what was seen), what the cause turned out to be, what fixed it, and how to recognise it next time. A problem that is not solved yet is written too, marked `OPEN`, with what was already tried.
5. **Say how it works.** For anything run or set up for the first time, add or update its entry in §2: the command, what it needs, what a good result looks like. §2 is rewritten in place so it is always current; §3 is append-only history.
6. **Rewrite §1 at the end of every session.** It is a snapshot, not a history: done, in progress, blocked, next.
7. **Facts only.** Write what was run and seen, with the commit from `/health` or `git rev-parse --short HEAD`. No "should work". If something was not checked, say so.
8. **No secrets.** Never a private key, an API key, a passkey PRF value or a seed. Addresses and transaction hashes are fine.
9. **Commit it.** The log goes into the same commit as the work it describes, on the `qa` branch. English only, like every file in the repo.

A bug still goes to the owner's task file (`docs/QA_AND_DELIVERY.md` §6). Here it gets one line with its title and where it was filed.

---

## 1. Where things stand (rewritten every session)

Last updated: 2026-10-09 · by: Hale's agent (session 1)

| | |
|---|---|
| **Done** | H1: machine proven on a clean `main` (`pnpm check`, `pnpm contracts:test` green), git identity in `CLAUDE.md`, `qa` branch opened, test wallet created and its address left for Ezgin |
| **In progress** | H1's last piece (dUSDC from the faucet) — blocked on funding |
| **Blocked on** | Ezgin (E1): platform team membership, testnet MON and test USDC to `0xF9f85340A31C3B2Ea477F3AEA684781Bb2618682`, a vault to test against |
| **Next step** | Once E1 lands: H2 (platform), H3 (MetaMask rehearsal, also needs M1), H4 (build: playground from the live API, no dependency, can start now) |
| **Open bugs filed by Hale** | 0 |
| **Days to the deadline** | Freeze Sun 11 Oct 12:00, submit Mon 12 Oct, the platform closes Wed 14 Oct 06:59 (GMT+3) |

---

## 2. How things work (kept current)

One entry per thing Hale has actually run. Each: what it is, the command, what it needs, what a good result looks like, known traps.

**`pnpm install --frozen-lockfile` then `pnpm check`** — lint (biome), `tsc -b`, the copy lint, and every vitest project. Needs Node ≥ 22.22, pnpm ≥ 11 (`corepack enable`). Good result: `Test Files N passed (N)`, `Tests N passed (N)`, no non-zero exit. `AbortError` stack traces from `happy-dom`'s fetch teardown print to stderr during the run; they are noise, not a failure — only the final `Test Files` / `Tests` summary line decides pass or fail. On `main` at `ca59710`: 76 files, 712 tests, ~7s.

**`pnpm contracts:test`** (`cd contracts && forge test`) — needs Foundry (`forge`, `cast`). Good result: `Ran N test suites … N tests passed, 0 failed, 0 skipped`. On `main` at `ca59710`: 9 suites, 74 tests, incl. the `PaymentGuard` fuzz and invariant tests. Leaves an untracked `contracts/foundry.lock` (forge-std's pinned rev) after the first run; harmless, not committed.

**`cast wallet new`** — generates a fresh keypair for the test wallet. The key goes in a local, gitignored `.env` at the repo root, never in a task file or the log.

---

## 3. Sessions (newest on top)

### 2026-10-09 — session 1 (commit `43b766d` on `qa`, off `main` `ca59710`)

Goal of the session: H1 — first session, machine setup, `qa` branch, identity, test wallet.

- **Piece: read the updated plan** (task: "H1 · First session and setup")
  - What: pulled `main` (`a29f040` → `ca59710`, 98 files) before starting; `tasks/FOR_HALE.md`, `docs/QA_LOG.md`, `docs/QA_AND_DELIVERY.md`, `CLAUDE.md` had all changed since the role was set up. Read `README.md`, `docs/PROJECT_OVERVIEW.md`, `docs/ROADMAP.md` "Final week — the board", `docs/QA_AND_DELIVERY.md` §8.1.
  - How it works: as of 2026-10-09 (D-031) Hale's role is no longer only testing; the board in `docs/ROADMAP.md` is the one plan for all three people, with `H1`–`H15` replacing the old task list. `tasks/FOR_HALE.md`'s "Earlier items" section is history only.
  - Result: understood. The submission deadline is **Wed 14 Oct 06:59 (GMT+3)**, not 2026-10-13 as the pre-update `docs/QA_AND_DELIVERY.md` and `tasks/FOR_HALE.md` said — that discrepancy is now resolved by the newer board/doc update, not a live bug.
  - Files changed: none (reading only).
- **Piece: machine check** (task: "H1 · First session and setup")
  - What: `node -v`, `pnpm -v`, `forge --version`, `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm contracts:test` on a clean working tree of `main` at `ca59710`.
  - How it works: see §2.
  - Result: passed. Node `v22.22.3`, pnpm `11.1.3`, Foundry `1.7.1`. `pnpm check`: 76/76 test files, 712/712 tests. `pnpm contracts:test`: 9/9 suites, 74/74 tests. No first bug report needed.
  - Problem: none.
  - Files changed: none (`contracts/foundry.lock` appeared untracked, left alone).
- **Piece: `qa` branch and git identity** (task: "H1 · First session and setup")
  - What: `git switch -c qa` off the up-to-date `main`; filled Hale's row in `CLAUDE.md`'s team table (name, email, GitHub user) as the first commit.
  - Result: done. Commit `43b766d` on `qa`.
  - Files changed: `CLAUDE.md`.
- **Piece: test wallet** (task: "H1 · First session and setup")
  - What: `cast wallet new` → address `0xF9f85340A31C3B2Ea477F3AEA684781Bb2618682`, key written to a local `.env` (gitignored, never committed). Left the address for Ezgin in `tasks/FOR_EZGIN.md` under E1.
  - Result: wallet created, has 0 MON and 0 USDC — cannot yet call `DemoUSDC.faucet()` (needs gas). That part of H1 stays open.
  - Bugs filed: none.
  - Files changed: `.env` (not committed), `tasks/FOR_EZGIN.md`.

End of session: tasks ticked in `tasks/FOR_HALE.md`: none ticked `[x]` (H1 is noted in progress, not complete — funding is outstanding). Left unfinished: dUSDC from the faucet (needs MON first), platform access (H2), everything depending on E1. Next session starts with: checking whether Ezgin funded the wallet and gave platform access; if not, start H4 (the playground, no dependency). §1 rewritten: yes.

---

### 2026-10-07 — session 0 (Ezgin's agent, setup of the role)

- **Piece: the role and its documents**
  - What: Hale added as the third team member (QA + delivery). Created `tasks/FOR_HALE.md`, `docs/QA_AND_DELIVERY.md` and this log; updated `CLAUDE.md`, the two other task files, `README.md`, `docs/ROADMAP.md`.
  - How it works: the agent identifies Hale by git identity, reads this log, then the task file, then the plan (`CLAUDE.md` → "At the start of every session").
  - Problems: none.
  - Result: merged through the `team-hale` PR. No product code touched, nothing tested.
  - Next: Hale's first session.

---

## 4. Template

Copy for each session; one "Piece" block per separate thing.

```
### YYYY-MM-DD — session N (commit <short sha of main>, API commit <from /health>)

Goal of the session: …

- **Piece: <short name>** (task: "<title in tasks/FOR_HALE.md>")
  - What: what was done, on which URL / with which command.
  - How it works: what this thing is and how to run it again (also update §2).
  - Result: what was seen. Passed / failed / partly, with the numbers (e.g. 11 of 12 scenarios).
  - Problem: the exact error or behaviour. Cause: …. Solution: …. Recognise it by: …. (or `OPEN`, tried: …)
  - Bugs filed: 🐛 "<title>" → tasks/FOR_EZGIN.md | tasks/FOR_MERIC.md
  - Files changed: …

End of session: tasks ticked in `tasks/FOR_HALE.md`: …. Left unfinished: …. Next session starts with: …. §1 rewritten: yes.
```
