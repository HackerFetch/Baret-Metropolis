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

Last updated: 2026-10-09 · by: Ezgin's agent (before Hale's first session)

| | |
|---|---|
| **Done** | Role, task list, plan and this log exist (`CLAUDE.md`, `tasks/FOR_HALE.md`, `docs/QA_AND_DELIVERY.md`). Nothing tested yet |
| **In progress** | Nothing |
| **Blocked on** | Ezgin (E1): team membership on the hackathon platform, a funded test wallet. GitHub access was given on 2026-10-08 |
| **Next step** | Read the board in `docs/ROADMAP.md` ("Final week — the board") and `docs/QA_AND_DELIVERY.md` §8.1, then H1 in `tasks/FOR_HALE.md`. Since 2026-10-09 the role also builds and writes (H4 to H9, H14), not only tests |
| **Open bugs filed by Hale** | 0 |
| **Days to the deadline** | Freeze Sun 11 Oct 12:00, submit Mon 12 Oct, the platform closes Wed 14 Oct 06:59 (GMT+3) |

---

## 2. How things work (kept current)

One entry per thing Hale has actually run. Each: what it is, the command, what it needs, what a good result looks like, known traps. Empty until the first session; the commands to start from are in `docs/QA_AND_DELIVERY.md` §5.1.

_(nothing run yet)_

---

## 3. Sessions (newest on top)

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
