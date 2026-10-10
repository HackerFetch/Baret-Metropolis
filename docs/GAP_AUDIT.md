# Gap audit, 2026-10-11

A read-only audit of what is still missing before the deadline, run by Meriç's agent at 00:45 GMT+3 on 2026-10-11 (`main` at `8a1a04f`): eight lenses (the prizes, the submission package, the live product, the documents, security, the plan, the public repository, the track's scoring), with every blocker and high finding re-checked by a second agent that tried to refute it. Each owner acts on their own items; the task files point here.

**Done since the audit (2026-10-11, Meriç):** item 20 (the KIMI and Qwen articles fact-checked: the fixes are under Hale's task "Fix the two articles" in `tasks/FOR_HALE.md`), item 21 (`docs/WALLET.md` after D-040), item 22 (the extension says it checks every transaction, not every sign request), and item 23 except the wallet's `.env.example` (`docs/FRONTEND.md` on Scrybe and the agent quickstart, an API reference card on `/docs`). `docs/API_REFERENCE.md` also got its eight checked corrections.

---

This was a read-only run. Nothing was merged, and Ezgin's PRs and commits were not touched. Every merge below still needs Meric's explicit go-ahead.

**Deadlines:** freeze Sun 12:00 · recording Sun afternoon · submit Mon 12 · platform closes Wed 14, 06:59

## Ezgin

**1. [high, verified] Signed messages (EIP-712) come back Safe when they should not, which is a hole in the "fails closed" claim. Fix by the freeze.**
- Gap: the live API returns Safe for some typed-data requests under the default Balanced policy. The fix has no board line, no branch, and is not in SYSTEM_GAPS. FOR_EZGIN.md:22 also says only Strict is affected, which is wrong.
- Evidence:
  - Live `/v1/analyze`, Permit2 `PermitTransferFrom` with amount 2^256-1 → `safe`, no findings.
  - Seaport order with `domain.chainId 1` → `safe`.
  - `primaryType "Whatever"` → `safe` (requestId 680697c5…).
  - `effects.ts:270-295` has no default case. `analyze.ts:153-155` never reads `domain.chainId`.
- Action, today:
  - Add an E-line (P1, allowed after the freeze) and open the branch.
  - An unknown primaryType should give at least Caution.
  - Decode Permit2.
  - Block a foreign `domain.chainId`.
  - Read `authorizationList`.
  - Add the gap to SYSTEM_GAPS. Meric's M16 copy goes on the same branch.

**2. [high, verified] The extension cannot sign any typed data.**
- Gap: every `eth_signTypedData_v4` ends on "Can't reach Baret" because the request leaves out `signer`.
- Evidence:
  - `apps/extension/src/live/requests.tsx:319-331` builds the typed data without `signer`, and `:408` hides the type error with `as never`.
  - `packages/guard/src/analyze.ts:35-42` requires `signer`.
  - The live API answers `invalid_request typedData.signer`.
- Action:
  - Add `signer: owner.address` and a test, but ship it only together with or after fix 1. Shipped alone, the extension would sign whatever the API wrongly calls Safe.
  - Until both land, reject typed data with a clear message.

**3. [high, verified; blocker for the Community prize] Hale is still not on the platform team (E1 part 1), so H2 is blocked.**
- Evidence:
  - ROADMAP:127/129: "the platform team is left", due Fri 9.
  - FOR_EZGIN.md:39-41.
  - TEXTS.md:167 still has `[H2: the group's name]`.
- Action: add Hale today. She then checks the 12 selected prizes and the campus group on all three profiles. If no onboarded group exists, mark Community as dropped.

**4. [high, verified] The MetaMask rehearsal (H3) is overdue, and its handover to Ezgin exists only on `origin/qa`.**
- Evidence:
  - ROADMAP:169 on main has no handover note.
  - main FOR_EZGIN.md has no H3 task; the handover is at qa FOR_EZGIN.md:21.
  - SCRIPTS.md:110 still shows the [H3] row as open.
- Action: run it Sunday morning, before the take. Otherwise record with the neutral line "a wallet with no pre-sign check".

**5. [high, verified] The pitch lines marked [E8] are not confirmed, and the pitch is recorded today.**
- Gap: these lines are the adopters and the post-event plan, about 45% of the track score.
- Evidence:
  - SCRIPTS.md:52-53 `[E8: confirm]`.
  - ROADMAP:134 dates E8 "Sun 11 to Mon 12", which is after the recording.
  - TEXTS.md §1 has no adopters, no "why not build it yourself" and no plan.
- Action: confirm by 12:00, and answer the CRE clip question at the same time. Hale then adds a three-line adopters / plan paragraph to TEXTS §1.

**6. [high, verified] Cleanverse: no real settlement, and nobody has asked the sponsor for test aUSDC.**
- Evidence:
  - ROADMAP:134 E6 is "Parked".
  - The deploy wallet holds 0 aUSDC.
  - `packages/demo/src/cleanverse.ts:20`: the demo wallets "are not ours".
  - No request for aUSDC is logged anywhere.
- Action: ask in the sponsor's Discord or Telegram now. If nothing arrives by Monday, record the check and canPay only, and say in TEXTS §6 that no settlement ran.

**7. [medium] PR #77 is merged but not live, because Vercel's daily limit blocks deploys until about Monday 00:00.**
- Evidence:
  - FOR_EZGIN.md:18-19.
  - A fallback exists at :20 (record with a profile that has no extension).
- Action: decide on Vercel Pro before the recording, or confirm the fallback with Hale in writing.

**8. [medium] Anyone can use up the daily caps by forging X-Forwarded-For during judging.**
- Evidence:
  - `app.ts:22-29` sets `trustProxy: true` with one global limiter.
  - `config/env.ts:89/101/117`: KIMI cap 500, sealed cap 200, shared by the whole process.
  - SYSTEM_GAPS:51 says the daily caps limit the damage, which they do not.
  - There is no board line.
- Action: before 14 Oct, raise the limits on Render (a config change, so the freeze does not block it), add a board line and correct G-01 and G-17.

**9. [medium] `/v1/analyze` returned 503 after a burst of about 18 calls.**
- Evidence:
  - `verify:demo` on the live API gave 18/20, with both Cleanverse lines failing on HTTP 503.
  - A re-run a minute later passed 2/2.
  - The 503 comes from `rpc.ts:52-55`.
  - On a 503 the demo panels show an honest swap as Blocked.
- Action: add a retry with backoff, or move to a higher-limit trace RPC. Hale should not record within a minute of a full verify run.

**10. [medium] Nansen is still listed as "In progress" although it is off on the live API.**
- Evidence:
  - `/health/ready` → `nansen:false`.
  - BOUNTIES:30.
  - QA §8 rule: a bounty not working live two days before the deadline is not entered.
- Action: decide on E2 by 12:00, or mark it ❌ Dropped and leave it unselected.

**11. [low] Small hygiene items:**
- `apps/server/.env.example` is missing three `MONAD_MAINNET_*` variables (`config/env.ts:60-62`).
- guard and agent-kit have no `license` or `repository` field.

## Hale

**12. [blocker, verified] Judges see a stale README, and `origin/qa` has no PR and conflicts with main.**
- Gap:
  - The main README says the apps run on sample data and are frontend only.
  - TEXTS.md and the two articles exist only on qa.
- Evidence:
  - main README:18, :19 ("62 tests; 18 of 18") and :50 (deadline 10-13).
  - `gh pr list --state open` → [].
  - `git merge-tree` shows conflicts in `tasks/FOR_EZGIN.md` and `tasks/FOR_MERIC.md`.
- Action:
  - Merge main into qa.
  - Keep main's [x] on M10, M11 and M12.
  - Mark Meric's P1 and P2 as fixed in #77.
  - Keep both sides of FOR_EZGIN, so Ezgin's lines, the three P2s and the H3 handover all survive.
  - Open the PR. It merges only when Meric says so. This is Hale's branch, not Ezgin's.

**13. [high, verified] There is no traction evidence yet (H9 part 2, due Sat 10).**
- Evidence:
  - qa QA_LOG:127 "not done".
  - SCRIPTS:53/56 gate the line on it.
- Action: post the curl from the guard README in the Metropolis Discord today and log any reply. With no reply, the pitch says "open to integrate" and never implies an integration happened.

**14. [medium] The script and README use the old wallet name in the connect dialog.**
- Evidence:
  - qa README:37 and SCRIPTS:26 say choose "Baret".
  - Since #77 the extension's entry reads "Baret extension".
  - The SCRIPTS:20 P1 gate is now stale.
- Action: update both during the rebase, but only once a build with #77 is live. Until then, name the entry by its icon in the script.

**15. [medium] Docs that still contradict D-040 or G-05 (not fixed on qa either):**
- ROADMAP:88 and :200 still call the extension's background and provider cut or stubs.
- ARCHITECTURE:259 says the wallet is "on sample data".
- ARCHITECTURE:24 shows an "x402 interceptor" that does not exist.
- PROJECT_OVERVIEW §4.2 (:61-63) describes x402 interception and payment as built.
- BOUNTIES rows 1, 4, 5, 7 and 8 have stale status. Row :28 says "the demo story cannot be shown", although M1-M3 are done. Alchemy still claims webhooks and gas sponsorship, which are not planned.
- Board: E12 not marked Done, E7 not updated, H1 not ticked.
- Action: fix all of it in the same qa PR.

**16. [medium] The README's "What is not live" list leaves out two things.**
- Missing: `personal_sign` is signed with no check (`background.ts:386`), and the typed-data fail-open (item 1).
- Action: add both, and remove the fail-open line once Ezgin's fix is live.

**17. [medium] The QA §8 tracker has empty "Form fields" and "Evidence" cells for 10 of 12 prizes.**
- Evidence: qa QA_AND_DELIVERY:161-170.
- Action: fill them from TEXTS and the address table, and the form fields once H2 is done.

**18. [medium] The demo script runs exactly 3:00 against a 3-minute cap.**
- Evidence: SCRIPTS:24-34.
- Action: aim for about 2:45, pick in advance which shot to cut, and warm up `/health` before the take.

**19. [low] Small fixes:**
- QA_AND_DELIVERY:13 still gives 10-13 as the deadline.
- Check that the `/kit` v-01 video plays in real browsers (headless Chromium showed `ERR_ABORTED`).
- Decide whether the README should link REFERENCE_REPOS.md. If it stays, add a "written from scratch" line.

## Meric

**20. [medium] The KIMI and Qwen articles are unpublished and wait on your fact check.**
- Evidence:
  - qa FOR_MERIC.md:20 is unticked.
  - `kimi.md:4` and `qwen.md:4` are drafts. The M11 paragraph is already fixed (`qwen.md:73`).
- Action: check them before the freeze, so Hale can publish on Sunday and put the links into TEXTS §10 and §11.

**21. [medium] `docs/WALLET.md:35/40/41` contradicts D-040.**
- Gap: it still says the sample wallet, "nothing is signed", and that the background and provider are untouched. qa does not fix it.
- Action: rewrite those lines, or mark them as history (2026-10-04).

**22. [low] Extension copy says "Baret checks every sign request", but `personal_sign` is not checked.**
- Evidence:
  - `onboarding.content.ts:173/181`, `settings.content.ts:84`, `policies.content.ts:12`.
  - `requests.tsx:510-520` signs messages with no check.
- Action: change it to "every transaction and typed-data request".

**23. [low] Stale or missing docs:**
- `FRONTEND.md:107` promises an x402 settlement for Scrybe, which never happens.
- `FRONTEND.md:189-198` gives an npm install and `AgentWallet.fromSecret`; neither exists.
- The `/docs` page has no API_REFERENCE card (`docs.content.ts:145-159`).
- `apps/wallet` has no `.env.example`.

## Team

**24. [medium] The cut list was never applied.**
- Evidence:
  - E6 is parked and E10 has no day (ROADMAP:132/136).
  - The rule at :186 says to write cuts down on the board and in BOUNTIES.
- Action: at the freeze, write down the E10 cut and the E6 settlement fallback in both files.

**25. [low] Repo-root hygiene:**
- Seven loose notes and paste `.txt` files sit at the root (added by Ezgin in c7bd19c). They contain no secrets.
- CLAUDE.md:13-15 publishes three personal Gmail addresses.
- Action: move or remove them only with the team's agreement.

## In good shape
- The live API is up. `/health/ready` reports explain, policyDraft, review, reviewSends, sealed, cleanverse and indexer as configured. The known-drainer case returns Blocked with `KNOWN_MALICIOUS_ADDRESS`.
- `verify:demo` passes all 20 scenarios when not run in a burst. Under a burst it gives 18/20, and the Cleanverse pair passes on re-run.
- All 14 showcase routes and the wallet return 200 with no console errors. The only failed request was the `/kit` video, and unknown paths return a real 404.
- The examples in the guard and agent-kit READMEs match the source and the live replies.
- Hale's qa rewrite (judge access instructions, TEXTS, both articles) is substantive and mostly correct.
- No secrets or Turkish text were found in the files checked. LICENSE is MIT.