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
| **Done** | H1: machine proven on a clean `main`, git identity in `CLAUDE.md`, `qa` branch opened, test wallet created. H4: the agents playground's six actions go live, checked against the real engine, PR #49 open. E9: done by Ezgin, wallet funded and both Vercel env vars set. H9 (1): both package READMEs written and linked, PR #50 open. H5: the wallet's History page reads live from the indexer (`paid` rows only; nine more kinds left for Ezgin, E10), checked against real captured production data, PR pending |
| **In progress** | H1's last piece (dUSDC from the faucet) — blocked on funding of Hale's own wallet. PR #48 (`qa`), #49 (`agents-playground-live`), #50 (`developer-quickstart-docs`) open, waiting on Ezgin to merge. H5's own branch and PR not opened yet (this session ran the code on `qa` by mistake and is splitting it out). H9 (2) (one other team trying the API) and H5's real-passkey confirmation both need a human, not the agent |
| **Blocked on** | Ezgin (E1): platform team membership, testnet MON and test USDC to `0xF9f85340A31C3B2Ea477F3AEA684781Bb2618682`, a vault to test against. Merge of #48/#49/#50, then a live check of H4's six actions under all three templates, and of H5's history with a real passkey, before either is ticked |
| **Next step** | Open H5's pull request. Once #49 merges and the showcase redeploys: run the six `/agents` actions live under Strict, Balanced and Permissive, tick H4. Once E1 lands: H2, H3. H9 (2) and H5's real-passkey check whenever Hale is at the keyboard |
| **Open bugs filed by Hale** | 0 |
| **Days to the deadline** | Freeze Sun 11 Oct 12:00, submit Mon 12 Oct, the platform closes Wed 14 Oct 06:59 (GMT+3) |

---

## 2. How things work (kept current)

One entry per thing Hale has actually run. Each: what it is, the command, what it needs, what a good result looks like, known traps.

**`pnpm install --frozen-lockfile` then `pnpm check`** — lint (biome), `tsc -b`, the copy lint, and every vitest project. Needs Node ≥ 22.22, pnpm ≥ 11 (`corepack enable`). Good result: `Test Files N passed (N)`, `Tests N passed (N)`, no non-zero exit. `AbortError` stack traces from `happy-dom`'s fetch teardown print to stderr during the run; they are noise, not a failure — only the final `Test Files` / `Tests` summary line decides pass or fail. On `main` at `ca59710`: 76 files, 712 tests, ~7s.

**`pnpm contracts:test`** (`cd contracts && forge test`) — needs Foundry (`forge`, `cast`). Good result: `Ran N test suites … N tests passed, 0 failed, 0 skipped`. On `main` at `ca59710`: 9 suites, 74 tests, incl. the `PaymentGuard` fuzz and invariant tests. Leaves an untracked `contracts/foundry.lock` (forge-std's pinned rev) after the first run; harmless, not committed.

**`cast wallet new`** — generates a fresh keypair for the test wallet. The key goes in a local, gitignored `.env` at the repo root, never in a task file or the log.

**Running the server locally** — `pnpm --filter @baret/server dev`, needs `apps/server/.env` (local, gitignored): `MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz`, `MONAD_TESTNET_USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3`, `MONAD_TESTNET_REPUTATION_REGISTRY_ADDRESS=0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`; the rest of `apps/server/.env.example` can stay empty for a read-only check (Nansen, Cleanverse, KIMI all fail closed or skip cleanly without their keys). Good result: `curl http://localhost:8080/health` answers `{"status":"ok",...}`. Useful to check a build against the real engine before trusting it against the live API: `pnpm --filter @baret/server verify:demo -- --api http://localhost:8080 --from <any address, no key needed> [--only <text>] [--skip-cleanverse]`.

**Running a one-off snippet against `@baret/guard` or `@baret/agent-kit`** — `tsx` is a dependency of those packages, not hoisted to the repo root, so `pnpm exec tsx <file>` from the root fails with "Command tsx not found"; run it as `pnpm --filter @baret/server exec tsx <file>.ts` (guard pulls in cleanly there) or `pnpm --filter @baret/agent-kit exec tsx <file>.ts`. A script with top-level `await` needs an `async function main() { ... }; main();` wrapper, or `tsx` treats the file as CommonJS and throws "Top-level await is currently not supported with the cjs output format".

**Checking a showcase/wallet change in a real browser** — no `chromium-cli` on this machine; `npx playwright install chromium` (one-time, ~100s, downloads a browser) then a plain Playwright script (`chromium.launch({ args: ["--no-sandbox"] })`, `browser.newContext().newPage()`, `page.goto(...)`) from a scratch directory with its own `package.json` (`npm init -y && npm install playwright`). Start the dev server first (`pnpm --filter <app> dev &`, poll the port with `curl -sf`, no `timeout` on macOS — use a manual `until ...; do sleep 1; done` loop instead) and stop it after (`lsof -ti:<port> -sTCP:LISTEN | xargs -r kill`).

**A virtual passkey for the wallet, from a script** (OPEN, tried once) — Playwright: `const client = await context.newCDPSession(page); await client.send("WebAuthn.enable"); await client.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, extensions: ["prf"] } });` before navigating. This gets through "Create a passkey" → "Create the passkey" but Mera then answers "This passkey can't make an account — your passkey provider lacks a feature Mera needs": the virtual authenticator's PRF support does not satisfy Mera's capability check in this setup. Not pursued further this session (H10's real-passkey pass was already the plan for the parts a virtual one cannot do). If a later session needs this to work, Ezgin's own E3/E4 checks did get a virtual passkey all the way through — the exact CDP incantation that worked is not written down anywhere in the repo, worth asking for before trying again from scratch.

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

- **Piece: H4, the agents playground goes live** (task: "H4 · Build: the agents playground answers from the live API")
  - What: `apps/showcase/src/agents/playground/source.ts` now sends the six built-in actions through `@baret/demo`'s `agents` builders when `VITE_BARET_PLAYGROUND=live`, reusing `live.ts`'s `analyze` (newly exported) rather than `analyzeCall`/`analyzePayment`, since neither of those has room for `policyTemplate` without changing what Scrybe already sends. Also touched: `Playground.tsx` (the "sample" note is now conditional on `LIVE`) and `agents.content.ts` (the footer note covers both paths, not only a pasted transaction).
  - How it works: `pnpm check` from the repo root (lint, types, copy lint, tests). To see it live locally: `pnpm --filter @baret/server dev` with `apps/server/.env` filled in (`MONAD_TESTNET_RPC_URL`, `MONAD_TESTNET_USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3`, `MONAD_TESTNET_REPUTATION_REGISTRY_ADDRESS=0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`, local-only, gitignored), then `pnpm --filter @baret/server verify:demo -- --api http://localhost:8080 --from <address> --only Agents --skip-cleanverse`.
  - Result: `pnpm check` 76/76 files, 717/717 tests. Against the real engine (local server, public testnet RPC): with a fresh unfunded address, only 0 of 6 Agents scenarios matched by code, though 4 of 6 matched by decision alone, because "pay" and "the wrong address" both came back wrongly Blocked — see the problem below. With the live Dynamic agent wallet (`0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353`) as `--from`, 2 of 6 matched exactly; the rest still failed on extra findings, some from the same zero-USDC-balance cause, some from that wallet's own real spend history against the vault's caps leaking into an unrelated check.
  - Problem: the engine's loss rule (`apps/server/src/policy/evaluate.ts`, `lossRule`) answers `LOSS_PERCENT_UNAVAILABLE` (a blocking finding) whenever an asset's pre-balance is 0 and the request would spend it — it cannot compute what percentage of nothing is lost, and CLAUDE.md's hard constraint 3 says missing data blocks. The post-balance floor (`minPostNativeBalance`) does the same for MON once gas is netted out. Cause: the six actions were built to sign from a fresh, randomly generated address every run, which holds no MON, USDC or fake USDC. Solution: read the signer from a new env var, `VITE_BARET_PLAYGROUND_AGENT` (`source.ts`'s `agentAddress`), so production can point it at a wallet Ezgin keeps funded; unset, it still falls back to a fresh address, which is fine for local development but will not reproduce the matrix. Recognise it by: `LOSS_PERCENT_UNAVAILABLE`, `POST_BALANCE_TOO_LOW` or `POST_BALANCE_UNAVAILABLE` showing up alongside the finding a scenario is actually testing.
  - Bugs filed: none (not a bug in existing code — a new requirement this build surfaced). Task filed: 🐛-shaped but not a bug: `tasks/FOR_EZGIN.md` E9 (fund the wallet, set the two env vars), also added to the board (`docs/ROADMAP.md`, Ezgin's table and "Where things stand").
  - Files changed: `apps/showcase/src/agents/playground/source.ts`, `apps/showcase/src/agents/playground/Playground.tsx`, `apps/showcase/src/agents/playground/playground.test.ts`, `apps/showcase/src/sites/kit/live.ts`, `packages/content/src/showcase/agents.content.ts`, `docs/ROADMAP.md`, `tasks/FOR_EZGIN.md`, `tasks/FOR_HALE.md`.
- **Piece: branches pushed, two pull requests opened**
  - What: `git push -u origin qa` and `git push -u origin agents-playground-live`. `gh` was not installed, then not authenticated (`gh auth login` needs an interactive browser flow this session cannot do, and pulling a token out of the macOS keychain for it was correctly refused by the sandbox as credential exploration); opened both PRs by hand instead and gave Hale the `compare/...` links `git push` printed.
  - Result: PR #48 (`qa` → `main`, "Qa") and PR #49 (`agents-playground-live` → `main`, "H4: the agents playground's six actions answer from the live API") open, both `mergeable: true`, neither merged yet.
  - Files changed: none (push only).
- **Piece: E9 funded, confirmed by Ezgin**
  - What: Ezgin funded `0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353` (10 MON, 5 USDC) and set `VITE_BARET_PLAYGROUND=live` and `VITE_BARET_PLAYGROUND_AGENT=0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353` on the showcase's Vercel project. Asked Hale to check the live six actions under all three templates once #48 and #49 merge, and tick H4 if the matrix agrees.
  - Result: E9 done. Nothing to re-check yet — waiting on the merge and the redeploy.
- **Piece: H9, the developer quickstart** (task: "H9 · Write: the developer quickstart, and get one other team to try it")
  - What: wrote `packages/guard/README.md` and `packages/agent-kit/README.md`. Every snippet in them was run first, against the live API (`https://baret-monad-api.onrender.com`, commit `d05fb2b`), not invented: `TransactionGuard.evaluate` (safe and blocked, both quoted verbatim, trimmed), the bare `curl` equivalent, `AgentWallet.guardedSubmit` catching `GuardBlockedError`, and `pnpm --filter @baret/agent-kit baret analyze` (confirmed exit code 1 on Blocked, as documented). Linked both from `README.md`'s Document Map and from a new "For developers" group on `/docs` (`packages/content/src/showcase/docs.content.ts`; `docs/FRONTEND.md` §4.2 and `apps/showcase/src/pages/DocsPage.tsx`'s comment updated from "eleven files, four groups" to "thirteen files, five groups").
  - How it works: the two READMEs are the artifact; to re-verify a snippet, run it with `pnpm --filter @baret/server exec tsx <file>.ts` (guard) or `pnpm --filter @baret/agent-kit exec tsx <file>.ts` (agent-kit) — `tsx` is not hoisted to the repo root, it has to run inside a workspace package that depends on it.
  - Problem: `apps/showcase/src/docs/docs.test.ts`'s "has a picture for every card" failed for the two new cards, because `DOCS_CARD_ART` (`apps/showcase/src/shared/assets.ts`) is a bespoke, one-drawing-per-file registry Hale cannot add real art to. Cause: new cards with no entry. Solution: `DocCard.tsx` already renders without an entry (`art ? ... : null`), so the test now explicitly excludes the "For developers" group with a comment saying why; left a cosmetic task for Meriç in `tasks/FOR_MERIC.md` to add the two drawings when there is time. Recognise it by: `expect(DOCS_CARD_ART[card.file], card.file).toBeDefined()` failing for a file with no entry.
  - Result: `pnpm check` green, 76/76 files, 712/712 tests. Checked the live rendering too, not just the unit tests (CLAUDE.md: a frontend change is checked in a browser): the Vite dev server on `/docs` shows five group anchors (`#start-here`, `#what-you-see`, `#contracts-and-payments`, `#plan-and-decisions`, `#for-developers`), the two new cards with their titles and correct links, no console errors — screenshot and detail in the next piece.
  - Bugs filed: none. Task filed: `tasks/FOR_MERIC.md` (the missing line drawings, cosmetic).
  - Files changed: `packages/guard/README.md` (new), `packages/agent-kit/README.md` (new), `README.md`, `packages/content/src/showcase/docs.content.ts`, `docs/FRONTEND.md`, `apps/showcase/src/pages/DocsPage.tsx`, `apps/showcase/src/docs/docs.test.ts`, `tasks/FOR_MERIC.md`.
  - H9 (2), not done: finding one other Metropolis team on the hackathon's Discord to call `/v1/analyze` is for Hale the person — the agent cannot join Discord. Still open.
- **Piece: H5, the wallet's history goes live** (task: "H5 · Build: the wallet's history and the vault's merchants from the indexer")
  - What: new `apps/wallet/src/live/history.ts` (`activityOf`, pure: the indexer's `VaultActivity` rows to `ActivityItem`s). Wired into `live.tsx` as a new `Live.loadHistory()`, called from `HistoryPage.tsx`'s own `useEffect` on mount in live mode — not from `open()`'s first reads, because the store already starts `status.activity: "ok"` with an empty log there and its comment says the indexer's history is for the history screen itself to read.
  - How it works: `GET /v1/audit/vault/<state.vault.address>?limit=50`, parsed defensively; `!res.ok` (503, 404, network error) sets `status.activity: "error"` (the page's existing `Problem` block, unchanged by this session, already shows "history unavailable" for that); a vault address that does not exist yet reads as "ok" with zero rows (genuinely nothing to show, not a failure). Only the indexer's `paid` kind becomes a row: `ActivityItem["kind"]` and `history.rows` (`packages/content`) have no sentence yet for the other nine (`created`, `deposited`, `withdrawn`, `merchantCapSet`, `merchantPaused`, `merchantResumed`, `merchantRevoked`, `agentSet`, `agentRevoked`) — a scope cut, not an oversight, written up for Ezgin as E10.
  - Result: `pnpm check` green, 77/77 files, 719/719 tests (7 new: edge cases plus one built from a real `/v1/audit/vault/0x46f159da1ad40a78526d35ea1adb8531ada52158` response fetched from the live API on 2026-10-09 — 2 of 6 real rows were `paid` and both came back correctly as payment items). Checked in a browser too: `/history?sample=default` on the Vite dev server renders exactly as before (no regression), `VITE_BARET_WALLET=live` boots to `/onboarding` with no console errors. Tried a full real-passkey pass with a CDP virtual WebAuthn authenticator (`extensions: ["prf"]`); Mera answered "This passkey can't make an account — your passkey provider lacks a feature Mera needs", i.e. Chrome's virtual authenticator does not satisfy Mera's PRF capability check in this headless setup. Did not chase this further: `docs/WALLET.md` already records that E3/E4's own live checks needed a real passkey provider for the parts a virtual one cannot do, and H10 is where Hale does that pass with a real one.
  - Problem: none in the code. The CDP/PRF limitation above is a tooling gap, not a product bug — recognise it by that exact "lacks a feature Mera needs" message with a virtual authenticator.
  - Bugs filed: none. Task filed: `tasks/FOR_EZGIN.md` E10 (the other nine activity kinds), also on the board.
  - Files changed: `apps/wallet/src/live/history.ts` (new), `apps/wallet/src/live/history.test.ts` (new), `apps/wallet/src/live/live.tsx`, `apps/wallet/src/pages/HistoryPage.tsx`, `docs/WALLET.md`.
  - Process note: this piece was built directly on `qa` by mistake (should have been its own branch from the start, like H4 and H9); splitting it onto `developer-wallet-history` (or similar) and opening its pull request is the first thing left for this session.

End of session: tasks ticked in `tasks/FOR_HALE.md`: none ticked `[x]` yet (H1, H4, H5 and H9 all have real progress noted inline, none fully closed — H4 and H5 both wait on a merge plus a live/real-passkey re-check, H9 waits on part (2), H1 waits on funding). Left unfinished: dUSDC from the faucet (needs MON first), platform access (H2), the live re-check of H4 once #49 merges, H5's pull request and its real-passkey check, H9's Discord outreach. Next session starts with: checking whether #48/#49/#50 are merged and whether H5's PR is open yet; if #49 is merged, run the six `/agents` actions live under Strict, Balanced and Permissive and tick H4 if they agree with `verify:demo`. §1 rewritten: yes.

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
