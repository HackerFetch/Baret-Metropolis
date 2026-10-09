# Baret — QA and Delivery

> Hale's working document: how Baret is tested, how a bug is reported, and what has to be handed in by the deadline. Hale's task list is `tasks/FOR_HALE.md`; this file is the method and the plan behind it.

Last updated: 2026-10-09 · Owner: Hale · **Submission closes Wed 14 Oct 2026, 06:59 (GMT+3)**; the team submits on Mon 12 Oct. Hale's days are the `H` rows of the board in `docs/ROADMAP.md` ("Final week — the board"), which replace the day table in §9. Since 2026-10-09 Hale also builds and writes (D-031); §8.1 holds what every prize's page asks

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
- [ ] KIMI and Qwen: each article published and linked, `/review` and the KIMI blocks checked on the live URLs (H16), `/health/ready` showing `explain`, `review`, `reviewSends` and `policyDraft` true
- [ ] The main submission entered in Track 4 (Trust, Identity & AI Infrastructure): the Qwen credits go to its top 3
- [ ] `docs/BOUNTIES_AND_TRACKS.md` Status column current
- [ ] Sponsor perks in `docs/RESOURCES.md` §1 claimed or marked not needed
- [ ] Submitted at least 12 hours before the deadline; the confirmation saved
- [ ] Final mentor update sent

## 8. Submission tracker

One row per prize the team enters (twelve are selected on the project). What each page asks is in §8.1 below; the second column here is for anything the form itself adds (H2). Hale fills in the rest (H14, H15).

| Bounty | Form fields / criteria (from the platform) | Evidence in the product (URL, tx, file) | Text written | Submitted |
|---|---|---|---|---|
| Main track: Trust, Identity & AI Infrastructure (logo, demo video max 3 min, pitch video max 2 min, live link with access instructions) | | | ⬜ | ⬜ |
| Nansen | | | ⬜ | ⬜ |
| Dynamic | | | ⬜ | ⬜ |
| Mera-Powered UX | | | ⬜ | ⬜ |
| Mera: One Passkey, Many Keys | | | ⬜ | ⬜ |
| Cleanverse (demo video required, max 5 min) | | | ⬜ | ⬜ |
| Envio | | | ⬜ | ⬜ |
| Alchemy | | | ⬜ | ⬜ |
| Best Community Team Project (campus group in all three profiles) | | | ⬜ | ⬜ |
| Chainlink: Best workflow with CRE (demo video required, max 2 min) | | | ⬜ | ⬜ |
| KIMI (only if M4 is live at the freeze; published article required) | The published article's link | Built and run with the real key on 2026-10-09, not yet live in production. Deployed 2026-10-09 (#51), live once the keys are on Render (E7); until then `/v1/explain` answers 503. Screens: "In plain words" under the findings on the demo sites' panel (on production the panel checks live with no wallet, since `VITE_BARET_DEMO_FROM` is set on Vercel; "Check it live" appears only on builds without it) and in the wallet's sign window, en / tr / zh; the wallet's rules page drafts policy changes from a sentence. Routes: `POST /v1/explain` (by `requestId`, D-036), `POST /v1/policy/draft`. Evidence: `docs/evidence/kimi/*.png`, `docs/evidence/README.md`. Article facts: H12 in `tasks/FOR_HALE.md` | ⬜ | ⬜ |
| Qwen 3.8 Max (only if M5 is live at the freeze; published article required; the main submission must be in Track 4) | The published article's link | Run for real on Monad testnet on 2026-10-09, not yet live in production. Deployed 2026-10-09 (#51), live once the keys are on Render (E7); until then `/review` shows its recorded run, labelled "Recorded run, 9 October 2026". The agent reviewer plans and calls four read-only tools, veto only (D-035): a 9x overpayment vetoed, an injected intent vetoed, the matching payment approved and sent, tx `0x206bbd5cc3ee0ee092b52076d9da054b53e50b134c173427f87a7dc08821095d` from vault `0x46F159DA1aD40A78526d35ea1Adb8531aDa52158`. A judge runs it at `https://baret-metropolis.vercel.app/review` (`POST /v1/review`). Evidence: `docs/evidence/qwen/*.json`, `docs/evidence/README.md`. Article facts: H12 in `tasks/FOR_HALE.md` | ⬜ | ⬜ |

A bounty whose integration is not working on the live URL two days before the deadline is not entered; write the reason in `docs/BOUNTIES_AND_TRACKS.md` (`❌ Dropped`).

### 8.1 What each page asks (copied from the platform by Ezgin on 2026-10-09)

The wording below is the platform's. Every prize closes on **Oct 14, 2026 at 06:59 GMT+3**; "selections stay editable until the final submission deadline". Twelve are selected on the project. Read the entry of a prize before building, testing, filming or writing for it. If the page changes, change this section first.

#### The track: Trust, Identity & AI Infrastructure — $30,000, "split evenly among 3 winners - $10,000 each"

- **Belongs here if:** "the primary output is a protocol, primitive, or infrastructure layer that other applications build on — not a standalone consumer product."
- **Core question:** "What does the trust and data ownership layer look like for an AI-native internet — built in a way that is privacy-preserving, composable, and impossible for any single platform to capture?" The page names Monad's building blocks: the native P256 precompile for WebAuthn verification, ERC-8004 as a trustless agent registry, BTX encrypted mempools.
- **Judges look for:**
  - Technical Execution (20%): "is the trust/identity/data primitive implemented correctly and securely — correct use of WebAuthn/P256, sound key derivation, no leaked secrets?"
  - Design & Craft (20%): "is the primitive usable by the developers who'd build on it — clear docs, clean interface or API — even without an end-user-facing UI? Design here means developer experience, not just visuals."
  - Originality & Track Insight (15%): "does this solve trust, provenance, or data ownership in a way that's privacy-preserving and not capturable by a single platform, or does it just centralize the problem differently?"
  - Founder & Market Readiness (25%): "does the team know which specific applications or developers would adopt this primitive, and why they'd choose it over rolling their own?"
  - Traction & Path Forward (20%): "any evidence of developer interest (even one other team integrating it during the hackathon), and a specific plan to get more integrations post-event."
- **To have ready:**
  - Project logo or graphic: JPG, JPEG, PNG or WEBP, at most 3 MB.
  - Public GitHub repository, "fully accessible by metropolis@hackathon.monad.xyz".
  - Technical demo video: at most 3 minutes, on YouTube, Loom or Vimeo, "must show the live working product, not slides or a code walkthrough".
  - Pitch video: at most 2 minutes, "introducing the team, the problem being solved, and why you're building it".
  - Live product link: "deployed on Monad Mainnet or Testnet, accompanied by clear access instructions and any necessary test login credentials for judges".
  - Optional: a product advertisement of at most 30 seconds, not judged.

#### Best use of Nansen — $5,000 pool (1st $2,000, 2nd $1,500, 3rd $1,000, honorable mention $500) · all tracks

- **For:** "The strongest projects will use Nansen to create a meaningful product experience — not simply expose raw data."
- **Judges look for:** at least one Nansen API endpoint, MCP tool or the CLI, meaningfully integrated; Nansen data "as part of a core product feature, not just a superficial API call"; a working product; a clear explanation of how Nansen is integrated ("endpoints, data categories, MCP tools, CLI commands used"); a public repository; a short video or live demo.
- **Asked at submission:** how the project integrates the Nansen API, MCP or CLI; an optional demo video of up to 2 minutes.

#### Best Use of Dynamic — $5,000, single prize · all tracks

- **For:** the Dynamic SDK "for authentication, embedded wallets (or server & agent wallets), and/or signing". "App must be deployed and usable/demoable by judges, and fit within one of Monad's four tracks."
- **Judges look for:** creative use (wallets, money movement, agent wallets); technical execution ("would real users use this?"); bonus for combining primitives, "e.g., embedded wallets + Fireblocks Flow, or agent wallets + delegated access"; bonus for depth over breadth.
- **Asked at submission:** how the project integrates the SDK; an optional demo video of up to 2 minutes.

#### Best Mera-Powered UX on Monad — $2,500, single prize · all tracks

- **For:** "an app on Monad where Mera is the entire account layer. No seed phrase. No wallet extension. No custody backend. The winner is the app where the user never notices there's a blockchain underneath."
- **Judges look for:** "Time-to-first-transaction — taps and seconds from landing page to confirmed Monad transaction"; "Session design — sensible scoping of prompt-free vs. re-prompt actions, clean session-expiry UX"; the stateless test; bonus for combining Mera with the broader account stack (gas sponsorship, intents, recovery flows, smart-account patterns).
- **To have ready:** deployed on Monad testnet or mainnet "with real transactions and a live demo"; "One-prompt onboarding — a single passkey ceremony, no seed phrase, extension install, or email/OTP dance"; "Prompt-free signing via Mera signing sessions with a clearly scoped session"; "Must pass the stateless test — judges clear local storage or open the app on a fresh device mid-demo, and identity/access must fully reconstruct from the passkey (plus untrusted storage if used)".
- **Asked at submission:** how the project integrates Mera as the entire account layer; an optional demo video of up to 2 minutes "focusing on UX elements".
- **For us:** this is entered with `apps/wallet` only. The extension (a preview, with a passphrase setup) is not part of this entry.

#### Mera: One Passkey, Many Keys — $2,500, single prize · all tracks

- **For:** "the most creative use of that primitive for anything that is NOT signing blockchain transactions from a wallet account." "every salt is an isolated namespace — one passkey can mint unlimited unrelated keys for encryption, identities, or capabilities, all reconstructible from the passkey alone, with zero secrets stored anywhere."
- **Judges look for:** "Novelty — the further from 'passkey wallet,' the better"; "Correct use of the primitives — encryption vs. derivation used appropriately, salts genuinely namespaced, nothing sensitive persisted to disk or server"; "The cross-device test — same passkey on a second device or fresh browser profile reproduces the same derived keys / decrypts the same state, live".
- **To have ready:** "A submission (may include a wallet, but the wallet can't be the point) where at least one PRF namespace does non-account work, demonstrated live".
- **Ideas the page lists that are near ours:** "Per-agent or per-app isolated identities minted from salt namespaces"; "AI agent memory encrypted to the user's passkey"; "Secret vaults that wrap existing credentials".
- **Asked at submission:** how the project uses Mera in non-account work; an optional demo video of up to 2 minutes.

#### Best Integration of Cleanverse Verified Identity & Assets — $2,000 cash, single prize · our track

- **For:** "an application that integrates Cleanverse Verified Identity (CVI) with Cleanverse Verified Assets (CVA), where asset movement is gated by on-chain identity verification."
- **Judges look for:** "Priority given to projects where identity verification is structurally coupled to asset movement, not added as an optional layer".
- **To have ready:** "Verify wallet-bound CVI credentials before executing any CVA transfer or settlement"; "a working end-to-end flow on Monad"; "a real-world compliance use case such as Travel Rule-compliant payments, permissioned DeFi, or verified RWA settlement"; "CVI/CVA integration is mandatory".
- **Asked at submission:** the compliance use case, described; **a demo video (up to 5 minutes)** "showing the mandatory CVI/CVA integrations where wallet-bound CVI credentials are verified before executing any CVA transfer or settlement".
- **Resources on the page:** the API reference (`docs.cleanverse.com`) with an app id and key, and three integration guides on Google Drive (CVI compliance, wrapped CVA, CVA). The key is on the bounty page; it is never copied into this repository.

#### Best Use of Envio — $1,000, single prize · all tracks

- **For:** "your project must meaningfully use Envio's HyperIndex, HyperSync or HyperRPC to power real on-chain data in your app — not just installed, but actually driving a feature."
- **Judges look for:** "Depth of use — multichain indexing, non-trivial schema design, derived/aggregated entities, or creative use of HyperSync for analytics scores higher than a single-event ERC-20 indexer"; "Working product — it runs, the data is live and correct"; originality; "Craft — readable code, sensible schema, a repo someone else could pick up".
- **To have ready:** "A working indexer or data pipeline built with Envio, deployed to Envio Cloud or self-hosted, with a public repo showing config.yaml, schema.graphql and event handlers"; "A frontend, dashboard, agent, bot or API that consumes that data and does something useful with it"; "A short demo (video or live link) showing the data flowing end to end".
- **Asked at submission:** how the project uses Envio; an optional demo video of up to 2 minutes.

#### Best Projects using Alchemy — $1,000 in Alchemy credits, single prize · all tracks

- **For:** "a functional project deployed on Monad that meaningfully integrates at least one Alchemy service/tool."
- **Judges look for:** quality of the integration; technical execution; usefulness and innovation.
- **Asked at submission:** how the project integrates Alchemy; an optional demo video of up to 2 minutes.

#### Best workflow with CRE (Chainlink) — $3,000, single prize · all tracks

- **For:** "build, simulate, or deploy a CRE Workflow used as an orchestration layer within their project."
- **To have ready:** "Integrate at least one blockchain with an external API, system, data source, LLM, or AI agent"; "Demonstrate a successful simulation (via the CRE CLI) or a live deployment on the CRE network"; "CRE must be meaningfully used in the project".
- **Asked at submission:** how the project uses CRE as an orchestration layer; **a demo video (up to 2 minutes)** "showing a successful simulation (via the CRE CLI) or a live deployment on the CRE network".

#### Best Builds Powered by KIMI — $3,000 in credits, "split across 10 teams who used KIMI to build" · all tracks

- **Judges look for:** "KIMI is meaningfully driving a core feature, not bolted on as a chatbot widget"; "A working, demoable product on Monad"; bonus for creative or unexpected use.
- **To have ready:** a working, demoable product on Monad genuinely powered by KIMI; **"A published article/blog post detailing how Kimi was used and what value Kimi brought to the project."**
- **Asked at submission:** the published article.
- **Ideas the page lists:** an AI agent that trades; a chatbot that reasons over on-chain data; a multilingual dApp interface.
- **Resources on the page:** `platform.kimi.ai`, `platform.kimi.com/docs/overview`.

#### Best Builds with Qwen 3.8 Max (Alibaba Cloud) — $5,000 in credits, "split across the top 3 Track 4 winners" · our track

- **For:** "Push it into genuinely agentic territory on Monad: autonomous agents, coding copilots, on-chain decision-making, or anything that shows Qwen doing real work, not just answering prompts."
- **Judges look for:** "Real agentic use of Qwen 3.8 Max — planning, tool use, multi-step execution"; "A working product deployed and demoable on Monad"; "Depth of integration over surface-level API calls".
- **To have ready:** the product, and **"A published article/blog post detailing how Qwen was used and what value Qwen brought to the project."**
- **Asked at submission:** the published article.
- **Resources on the page:** `qwen.ai/qwencode`, `www.qwencloud.com`.

#### Best Community Team Project — $5,000, single prize · all tracks

- **For:** "the best overall project — across all four tracks — built by a team representing onboarded community supporters". It runs alongside track judging and can be won in addition to anything else.
- **Judges look for:** the same quality bar as the track; no separate criteria.
- **To have ready:** "Team must indicate their campus group when completing their profile on the hackathon portal"; "Community must be on the list of onboarded groups (selectable in the community field on the profile)"; the standard requirements (public repo, demo video, deployed on Monad).
- **Asked at submission:** "Which community does your team represent?"

#### Not selected

The MetaMask "Best Agent Wallet Plugin" bounty (tagged Onchain Finance & Trading) is not in the list copied on 2026-10-09. The plugin is built (D-027) and stays in the repository; it is not entered unless Ezgin selects it.

## 9. Seven-day plan

**Written for a Wednesday 7 Oct start, which did not happen. The days that count are the `H` rows of the board in `docs/ROADMAP.md`; this table is kept for what belongs to each kind of day.** Dates are 2026. Each evening: update `docs/QA_LOG.md`, push the day's work, update the tracker, write tomorrow's blockers for Ezgin and Meriç into their task files.

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
