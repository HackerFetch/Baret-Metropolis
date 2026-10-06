# Baret — QA and Delivery

> Hale's working document: how Baret is tested, how a bug is reported, and what has to be handed in by the deadline. Hale's task list is `tasks/FOR_HALE.md`; this file is the method and the plan behind it.

Last updated: 2026-10-07 · Owner: Hale · **Submission closes 2026-10-13** (confirm the exact hour and time zone on the hackathon platform on day 1)

---

## 0. First session: what the agent tells Hale

Hale has just cloned the repo and opened a session. The agent does this, in this order, talking to Hale in Turkish and assuming no knowledge of the project:

1. **Say what Baret is** in three sentences (`README.md`, "What Is This in One Sentence?") and that the submission closes on 2026-10-13.
2. **Say what Hale's job is and is not** (§1 and §2): test everything, hand the project in; no product code.
3. **Read `docs/QA_LOG.md` §1** and say where things stand. On the very first session that is "nothing tested yet".
4. **Check the machine with Hale**, one command at a time, explaining what each does: `git config user.name`, `node -v`, `pnpm -v`, `forge --version`, then §3 steps 3 to 5. Install what is missing. Write each result, and every problem with its fix, into `docs/QA_LOG.md` as it happens.
5. **Create the `qa` branch** from an up-to-date `main` (`git switch main && git pull && git switch -c qa`) and put Hale's git identity into the team table of `CLAUDE.md` as the first commit.
6. **List what Hale must ask Ezgin for** (repo write access, platform team membership, MON and test USDC for the test wallet address) and give Hale the exact message to send.
7. **Show the day's tasks** from `tasks/FOR_HALE.md` and the row for today in §9, and ask which one to start with. If the calendar is behind the plan, say so and propose what to cut (§9, last line).
8. **Before the session ends:** tick the finished tasks, rewrite `docs/QA_LOG.md` §1, commit, and ask Hale whether to push and open the `qa` PR.

Every later session starts the same way from step 3: the log, then today's tasks.

## 1. The role in one paragraph

Hale joined on 2026-10-06, seven days before the deadline. Ezgin writes the backend and the contracts, Meriç writes every screen. Hale does the two things neither has time for: **proving that what is built really works** (on the live URLs, as a stranger would use it) and **getting the project handed in** (demo video, pitch video, the submission form of every bounty, documents that match the code). Hale does not write product features.

## 2. What Hale may change, and what not

| May change | Does not change (file a task for the owner instead) |
|---|---|
| Test files: `**/*.test.ts(x)`, `contracts/test/**` | `apps/server/src/**`, `contracts/src/**`, `packages/guard`, `packages/agent-kit`, `packages/wallet-core`, `packages/demo`, `indexer/` → Ezgin |
| `docs/QA_AND_DELIVERY.md`, `docs/QA_LOG.md`, `tasks/*.md` | `apps/showcase`, `apps/wallet`, `apps/extension`, `packages/ui`, `packages/web-ui`, `packages/wallet-ui`, `packages/content`, `docs/BRAND.md` → Meriç |
| Status tables and dated notes in `README.md`, `docs/ROADMAP.md`, `docs/BOUNTIES_AND_TRACKS.md`, `docs/RESOURCES.md` | Deploy config: `render.yaml`, `apps/*/vercel.json`, `.github/workflows/` → Ezgin |
| A plain factual fix in any doc (a wrong address, a dead link, a number the code contradicts) | A decision. Decisions go to `docs/DECISIONS.md` and are taken by the owner |

Rule of thumb: **Hale finds and reports, the owner fixes, Hale checks the fix.** A bug fixed silently by the tester is a bug nobody learned from, and the owner's next change will bring it back.

## 3. First-day setup

1. **Access** (ask Ezgin): write access to `HackerFetch/Baret-Metropolis`, membership of the team on the hackathon platform. No dashboard access (Render, Vercel, Dynamic, Nansen) is needed, and no key that belongs to Ezgin.
2. **Tools:** Node ≥ 22.22, pnpm ≥ 11 (`corepack enable`), Foundry (`forge`, `cast`), Chrome.
3. **Install and prove the machine works:**
   ```
   pnpm install --frozen-lockfile
   pnpm check                      # lint, types, copy lint, every vitest project
   pnpm contracts:test             # forge tests
   ```
   All three green before anything else. If one fails on a clean clone of `main`, that is the first bug report.
4. **A test wallet of your own.** Create a fresh key (`cast wallet new`), use it for nothing else, and keep it in a local `.env` that is never committed. Ask Ezgin to send it testnet MON and test USDC; `DemoUSDC.faucet()` gives 100 dUSDC by itself (`docs/CONTRACTS.md` §7.1). Never ask for, and never accept, the deploy key.
5. **Write your git identity into `CLAUDE.md`** (team table, Hale's row) in your first commit, so the next session recognises you.
6. **Read, in this order:** `README.md`, `docs/PROJECT_OVERVIEW.md`, `docs/ARCHITECTURE.md` §5 to §7 (the analyze contract, the finding codes, the policy fields), `docs/FRONTEND.md` §2.3 (the six demo sites), `docs/CONTRACTS.md` §2 and §7, `docs/BOUNTIES_AND_TRACKS.md`.

## 4. What is live

| Surface | URL | Notes |
|---|---|---|
| Showcase (landing, hub, six demo sites, agents, docs, install) | `https://baret-metropolis.vercel.app` | Demo sites: `/scrybe`, `/novaswap`, `/pixeldrop`, `/orbityield`, `/claimhub`, `/launchpad`; hub `/showcase` |
| Wallet | `https://baret-wallet.vercel.app` | A passkey belongs to the domain it was made on: this URL and `localhost` are two different wallets |
| API | `https://baret-monad-api.onrender.com` | `/health` shows the running commit, `/health/ready` what is configured. The free plan sleeps after 15 idle minutes; the first request can take about 50 s. That is not a bug |
| Extension | zip artifact of the CI `Build apps` job | A preview on a sample wallet. Its live background is cut for the hackathon: do not report "does not connect to sites" |
| Contracts | Monad testnet, chain `10143` | Addresses: `docs/CONTRACTS.md` §2.6, §3.4, §7 |

Before a test session, open `/health` and write down the commit. A bug report without the commit it was seen on cannot be checked.

## 5. Test plan

Each row is a task in `tasks/FOR_HALE.md`. "Expected" comes from the docs named in the row; when the product and the doc disagree, that is a finding either way (one of them is wrong) and the owner decides which.

### 5.1 Automated suites (the baseline)

| Suite | Command | Owner of a failure |
|---|---|---|
| Everything CI runs | `pnpm check` | whoever owns the failing package |
| Guard SDK and server | `pnpm exec vitest run --project guard --project server` | Ezgin |
| Contracts | `cd contracts && forge test` | Ezgin |
| Showcase scenarios against a running API | `pnpm --filter @baret/server verify:demo -- --api https://baret-monad-api.onrender.com --from <your test wallet>` | Ezgin (engine) or Meriç (the site's expectation) |
| The wallet's whole life on testnet | `BARET_WALLET_TEST_PRF=<64 hex> pnpm --filter @baret/server verify:wallet -- --api <api>` | Ezgin |

Gaps to fill with new tests (from `docs/REFERENCE_REPOS.md` §4.3):
- one positive test per finding code, and for every `GuardPolicy` field a test that the verdict changes when the field changes;
- contracts: cap overflow, `pay` reverts after revoke, window rollover with `vm.warp`, the withdraw reserve, fuzz on the cap math (the open box in `docs/CONTRACTS.md` §6).

A new test that fails because of a real bug is not pushed red. File the bug, commit the test as an expected failure (`it.fails(...)` in vitest, with the bug's title in the name) and flip it when the fix lands. CI stays green and the bug stays visible.

### 5.2 Live walkthrough of the six demo sites

For every site, on the live URL, with the test wallet connected: the honest action, then the attack switch. Record the verdict and the finding codes shown, and compare them with `docs/FRONTEND.md` §2.3 ("Watch for") and the verdict tables in `docs/CONTRACTS.md` §7.

| Site | Honest (expected) | Attack (expected) |
|---|---|---|
| NovaSwap | Safe | Blocked: unlimited allowance to a look-alike router |
| Scrybe (x402) | Safe within the hourly cap | Blocked once the agent loop passes the cap |
| PixelDrop | Safe | operator approval for the whole collection |
| OrbitYield | Safe | Caution: a pool on no list that returns nothing |
| ClaimHub | Safe | unlimited approval to a reported spender |
| LaunchPad | Safe | a proxy sale whose logic the deployer can replace |

The exact verdict and codes per attack are in the two docs above; the table is only the map. Also check on each site: the page with no wallet installed, the wallet picker, a rejected signature, and the API unreachable (the site must say it cannot reach Baret, never show Safe: fail-closed is hard constraint 3 in `CLAUDE.md`).

### 5.3 Wallet, end to end

On `https://baret-wallet.vercel.app`, once Meriç's live wiring is merged (`tasks/FOR_MERIC.md`, "The wallet can go live"): create the passkey account → receive MON and USDC → open a vault → deposit (two sign requests: an exact allowance, then the deposit) → add a merchant with caps → set the agent → pay as the agent → pause → revoke → the agent's payment is refused. Each step shows a verdict before the signature; a Blocked verdict has no sign button. Then the unhappy paths: a passkey provider without PRF, the prompt dismissed, an expired verdict (wait past the countdown), history while the indexer is down ("history unavailable", not an empty list).

Until the wiring is merged, the same flow runs from the terminal with `verify:wallet` (5.1).

### 5.4 Agent and x402

With the `baret` CLI (`pnpm --filter @baret/agent-kit baret <command>`; signing needs a key, so use `BARET_AGENT_PRIVATE_KEY` with a key of your own, or ask Ezgin to run the Dynamic one while you watch): `analyze`, then the four scenarios of `docs/X402_FACILITATOR.md` §5 (in-cap payment passes, asset outside the allowlist, destination mismatch, hourly cap overflow). Tick the boxes in that section when each is seen working, with the transaction hash or the refusal.

### 5.5 Contracts on testnet

Read-only checks with `cast call` against the addresses in `docs/CONTRACTS.md` (the commands are in the "Contracts are live" task that moved to `tasks/FOR_HALE.md`). State-changing calls on the shared demo vault go through Ezgin; on a vault you opened with your own wallet they are yours.

### 5.6 A stranger's pass

- **Cross-browser and phone:** landing, hub and one demo site on Chrome, Firefox, Safari and a real phone. Passkeys on a phone are the wallet's main case.
- **One real user** (ROADMAP Week 5): somebody who has never seen Baret opens the showcase with no explanation. Watch, do not help, write down where they stop. The success criterion is `docs/PROJECT_OVERVIEW.md` §7: "I almost lost my money, Baret stopped it" within 30 seconds.
- **Copy truth:** every claim on the landing and `/agents` is something the product does today. A sentence the product cannot back is a P1 for Meriç.

## 6. Reporting a bug

Bugs go to the **owner's** task file, newest on top: backend, contracts, SDK, deploy → `tasks/FOR_EZGIN.md`; any screen or copy → `tasks/FOR_MERIC.md`. Not sure which side: file it for Ezgin when the API answer is wrong, for Meriç when the answer is right and the screen shows it wrong (the browser's network tab settles it).

```
- [ ] 🐛 **[P0|P1|P2] Short title** — Steps: 1) … 2) … Expected: … (source: doc §). Actual: …. Where: URL or command, commit <sha from /health>, browser. File: path if known. Left by: Hale · Date: YYYY-MM-DD
```

| Priority | Meaning | By when |
|---|---|---|
| **P0** | The demo breaks, a dangerous transaction shows Safe, money can be lost, or a page judges will open is down | Tell the owner in chat at once, then write it down. Fixed before anything else |
| **P1** | A flow works but shows something wrong, or a claim the product cannot back | Before the video is recorded |
| **P2** | Cosmetic, rare, or outside the demo path | Listed; fixed only if time remains |

One bug per bullet. A screenshot or recording goes in the PR or the chat, not in the repo. When the owner marks it `[x]`, Hale re-tests on the live URL and adds `Verified by Hale, <date>, commit <sha>` under it, or reopens it.

## 7. Delivery checklist

Requirements must be read on the platform, not guessed: the first delivery task is to copy each bounty's real form fields and review criteria into §8 below.

- [ ] Exact deadline (hour, time zone) and the list of required fields confirmed on the platform
- [ ] Team on the platform is complete (three people); "Best Community Team Project" eligibility checked (`docs/BOUNTIES_AND_TRACKS.md` row 9)
- [ ] Demo video: script and shot list approved by Ezgin and Meriç, recorded on the live URLs, the magic moment inside the first 30 seconds, every Tier S integration visible on screen at least once
- [ ] Pitch video: problem, what Baret does, why Monad, what is live, who built it
- [ ] Live links open from a clean browser profile, with the API warmed up beforehand
- [ ] Public repository: `README.md` status table and `docs/ROADMAP.md` say what is true on the day
- [ ] One submission text per targeted bounty, each saying where in the product that sponsor's tool does real work
- [ ] `docs/BOUNTIES_AND_TRACKS.md` Status column current
- [ ] Sponsor perks in `docs/RESOURCES.md` §1 claimed or marked not needed
- [ ] Submitted at least 12 hours before the deadline; the confirmation saved
- [ ] Final mentor update sent

## 8. Submission tracker

Filled in by Hale from the platform. One row per bounty the team enters.

| Bounty | Form fields / criteria (from the platform) | Evidence in the product (URL, tx, file) | Text written | Submitted |
|---|---|---|---|---|
| Main track: Trust, Identity & AI Infrastructure | | | ⬜ | ⬜ |
| Nansen | | | ⬜ | ⬜ |
| Dynamic | | | ⬜ | ⬜ |
| Mera-Powered UX | | | ⬜ | ⬜ |
| Mera: One Passkey, Many Keys | | | ⬜ | ⬜ |
| Cleanverse | | | ⬜ | ⬜ |
| Envio | | | ⬜ | ⬜ |
| Alchemy | | | ⬜ | ⬜ |
| Best Community Team Project | | | ⬜ | ⬜ |

A bounty whose integration is not working on the live URL two days before the deadline is not entered; write the reason in `docs/BOUNTIES_AND_TRACKS.md` (`❌ Dropped`).

## 9. Seven-day plan

Dates are 2026. Each evening: update `docs/QA_LOG.md`, push the day's work, update the tracker, write tomorrow's blockers for Ezgin and Meriç into their task files.

| Day | Testing | Delivery |
|---|---|---|
| **Wed 7 Oct** | First session (§0) and setup (§3): access, tools, `pnpm check` and `forge test` green, test wallet funded. Then the live walkthrough of the six demo sites (§5.2) and `verify:demo` against the live API. First bug reports | Platform: deadline hour, fields per bounty into §8, team membership |
| **Thu 8 Oct** | Backend and contract suites, new test cases (§5.1), `cast` checks (§5.5), agent and x402 scenarios (§5.4) | Demo video script and shot list, sent to Ezgin and Meriç for review |
| **Fri 9 Oct** | Wallet end to end (§5.3), cross-browser and phone (§5.6) | One real user test. Sponsor perks claimed |
| **Sat 10 Oct** | Re-test every fixed bug. Second full walkthrough | Submission texts drafted. `README.md` and `docs/ROADMAP.md` status brought up to date |
| **Sun 11 Oct** | **Feature freeze at noon** (agree it with Ezgin and Meriç): after it only P0 and P1 fixes land | Record the demo video and the pitch video |
| **Mon 12 Oct** | Final regression on the live URLs, clean browser, the commit written down | Videos reviewed and re-cut if needed. Every form filled in. Submit |
| **Tue 13 Oct** | Buffer only. Nothing new merges | Confirm the submission is complete, mentor update |

If the plan slips, testing of anything outside the demo path is what gets cut first; the videos and the forms are never cut.

## 10. Status

| Item | Status |
|---|---|
| Setup and access | ⬜ |
| Automated suites green on `main` | ⬜ |
| Demo sites walkthrough | ⬜ |
| Wallet end to end | ⬜ |
| Agent and x402 scenarios | ⬜ |
| Contract checks on testnet | ⬜ |
| Cross-browser, phone, real user | ⬜ |
| Demo video | ⬜ |
| Pitch video | ⬜ |
| Submission forms | ⬜ |
