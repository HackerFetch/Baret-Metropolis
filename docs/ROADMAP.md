# Baret — 6-Week Roadmap

> This file is a **live checklist**. At the end of every week the boxes are ticked, and slips/delays are written into the "Notes" line. The status table in `README.md` is kept in sync with this file.

Last updated: 2026-10-09 · Currently: **the final week**. **Submission closes Wed 14 Oct 2026, 06:59 (GMT+3).** The plan for all three people is the section "Final week — the board" below; the boxes of Weeks 1 to 4 are history and are brought up to date by Hale (H14)

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

## Final week — the board (written 2026-10-08, redistributed 2026-10-09; replaces Weeks 5 and 6)

**This section is the single plan for all three people and their agents.** Every open piece of work has one line here with an ID, an owner and a day. The detail of a task is in its owner's file: `E` tasks in `tasks/FOR_EZGIN.md`, `M` tasks in `tasks/FOR_MERIC.md`, `H` tasks in `tasks/FOR_HALE.md`. When a task is finished, slips or changes owner, change its line here **and** in the owner's file in the same commit. Decisions behind it: D-025, D-031. What every bounty page asks, word for word: `docs/QA_AND_DELIVERY.md` §8.1.

### The goal

Two things, and both are needed:

1. **The demo:** on the same site, with the same button, a wallet with no pre-sign check lets the user sign the attack and the money leaves; with Baret the same request is read, explained and stopped before anything is signed. The six showcase sites exist for that.
2. **The frame:** the track is for "a protocol, primitive, or infrastructure layer that other applications build on — not a standalone consumer product". Baret is entered as the pre-sign policy layer that any wallet, dapp or agent calls. The wallet and the showcase are proof that the layer works, not the product. 45% of the track's score is "Founder & Market Readiness" (who adopts this and why) and "Traction & Path Forward" (evidence of developer interest, "even one other team integrating it during the hackathon"); 20% is "Design & Craft", which the page defines as developer experience: clear docs and a clean API. H9 and the pitch video carry these.

### Dates

| When | What |
|---|---|
| Fri 9 Oct | Build day: the wallet goes live, the real signature path lands on NovaSwap, Hale sets up and takes the playground live |
| Sat 10 Oct | Build day: the site-to-wallet window, the model layer, history and `/agents`, the test pass, the scripts |
| **Sun 11 Oct, 12:00** | **Feature freeze.** After it only P0 and P1 fixes merge. Recording starts in the afternoon |
| Mon 12 Oct | Final regression, articles published, forms filled in, **submit** |
| Tue 13 Oct | Buffer. Nothing new merges |
| **Wed 14 Oct, 06:59 (GMT+3)** | Submission closes. Bounty selections stay editable until then |

### Where things stand (checked 2026-10-08 against the live system, commit `2965c57`)

**2026-10-09 evening (the API runs commit `6abf326`):** today's merges made some bullets below false. The wallet window is merged (M3, #46): a site can open the Baret wallet's connect and sign window. The wallet runs on a live passkey account, not sample data (M6, #45). The wallet's Activity reads the vault's payments from the indexer (H5, #52); a headless check with a virtual PRF passkey showed the demo vault's 4 real payments on Home and Activity. The developer quickstarts for `guard` and `agent-kit` are written (H9 part 1, #50). The playground has eight actions since H7 (#56): two Cleanverse ones, a verified wallet (Safe) and a wallet with no credential (Blocked). They go live only with `VITE_BARET_PLAYGROUND=live` and `VITE_BARET_PLAYGROUND_AGENT` (H4, #49); E9 is pending, so it still answers from samples in production. KIMI and Qwen are deployed (#51, commit `f3b40ed`) and not live: the keys are not on Render (E7), so `/v1/explain`, `/v1/review` and `/v1/policy/draft` answer 503 "not configured" and `/review` shows its recorded run. Nansen is still off (`nansen: false`, E2). The older text is kept as written on 2026-10-08.

- Live: the API on Render, the showcase and the wallet site on Vercel, the extension zips, the Envio indexer. `verify:demo` agrees with the live API on 20 of 20 scenarios. CI on `main` is green.
- **The demo sites sign nothing.** A wallet connects only so the site can read its address (`apps/showcase/src/sites/kit/wallet/engine.ts`). Since M1 (2026-10-09, branch `novaswap-sign`) NovaSwap is the exception: "Sign with your wallet" sends the checked request through the connected wallet on Monad testnet. The other five sites still sign nothing.
- **Baret is a panel on the page, not a wallet that refuses.** The extension's background and provider are empty stubs (cut). `apps/wallet` runs on sample data: no app imports `@baret/wallet-core`. No site can open the wallet's connect or sign window.
- No screen reads `/v1/audit/*`. The agents playground answers its six actions from samples.
- **H4, built 2026-10-09: the playground's live answers need a funded sender.** The engine's loss rule and its post-balance floor cannot be computed from a zero balance and fail closed when they cannot (CLAUDE.md hard constraint 3) — a fresh, unfunded address turned "pay" and "the wrong address" into Blocked against `pnpm --filter @baret/server verify:demo --only Agents` run locally, and reusing the live Dynamic agent wallet (which has its own spend history against the vault's caps) made it worse, not better. The code is built and merge-ready: `VITE_BARET_PLAYGROUND_AGENT` picks the signer, falling back to a fresh address only when unset. E9 funds a dedicated wallet for it.
- Two of the six attacks answered Caution under Balanced (OrbitYield's silent pool, LaunchPad's proxy sale). Since D-033 (2026-10-09) both are Blocked.
- Off on the live API: Nansen (`nansen: false`), the explanation route (`explain: false`).
- For the track's "Design & Craft": `packages/guard` and `packages/agent-kit` have no README. The landing says "MIT licence" and the repository has no `LICENSE` file.
- Hale has GitHub access since 2026-10-08 and has not had a first session yet.

### Sponsor bounties: what each page asks and what is missing

Twelve prizes are selected on the project (the list Ezgin copied from the platform on 2026-10-09). The MetaMask Agent Wallet Plugin bounty is **not** among them: it is built (D-027) and not entered unless Ezgin says otherwise.

| Prize | What the page requires (short; full text in `docs/QA_AND_DELIVERY.md` §8.1) | State on 2026-10-09 | Closed by |
|---|---|---|---|
| Main track: Trust, Identity & AI Infrastructure ($30,000, three winners at $10,000) | A primitive others build on. Logo, public repo, demo video (max 3 min, the live product), pitch video (max 2 min), live link with access instructions for judges | 🔶 The product works and the story can be shown (M1, M2, M3 merged 2026-10-09); developer quickstarts for `guard` and `agent-kit` written (H9 part 1); no traction evidence yet (H9 part 2: another team tries it) | M1, M2, M3, E5, H9, H11, H13, H14 |
| Best use of Nansen ($5,000 pool: 2,000 / 1,500 / 1,000 / 500) | Nansen data in a core feature, with the endpoints used explained | ❌ Off on the live API, no key | E2, H10 |
| Best Use of Dynamic ($5,000) | A deployed app judges can use; bonus for agent wallets + delegated access | 🔶 A Dynamic server wallet paid from a vault through the CLI. **2026-10-09:** the playground's live mode is merged (H4, #49) but needs E9 and its Vercel variables; until then nothing a judge can open shows the Dynamic wallet. **Evening:** `/agents` shows it: the Dynamic agent and its vault, linked to the explorer, and its real payments read live from the indexer (H6, #55; live on the showcase once merged) | H6, E4 |
| Best Mera-Powered UX ($2,500) | Mera as the entire account layer; one-prompt onboarding; prompt-free signing in a scoped session; **the stateless test** (judges clear local storage or use a fresh device, everything must come back from the passkey) | 🔶 ~~The wallet app is on sample data~~ **2026-10-09:** the wallet runs on a live passkey account (M6, #45) and a site can open its window (M3, #46); its Activity shows the demo vault's real payments from the indexer (H5, #52). Left: the stateless test on real devices (H10) | E3, M6, H10 |
| Mera: One Passkey, Many Keys ($2,500) | A PRF namespace doing **non-account work** ("anything that is NOT signing blockchain transactions from a wallet account"); salts genuinely namespaced; **the cross-device test** | 🔶 Agent keys exist, on a BIP-44 branch of the one PRF output, and they sign payments: weak against the page's text | E4, H10 |
| Best Integration of Cleanverse ($2,000) | CVI verified before any CVA transfer, end to end on Monad, a real compliance use case; identity "structurally coupled" to movement. **Demo video required (max 5 min)** | 🔶 The server reads the chain, 2 of 2 live scenarios agree. On a screen since 2026-10-09: the `/agents` playground's two Cleanverse actions (H7, #56; sample answers until E9). `CompliantPaymentGuard` deployed (D-034); no live settlement yet | E6 |
| Best Use of Envio ($1,000) | A deployed indexer with a public config, schema and handlers; a frontend that consumes it; depth of schema | 🔶 Indexer and `/v1/audit/*` live. **2026-10-09:** the wallet's Home and Activity read the vault's payments from the indexer (H5, #52; the demo vault's 4 real payments shown in a headless check). **Evening:** `/agents` lists the Dynamic agent's payments from the indexer too (H6, #55) | H5, H6 |
| Best Projects using Alchemy ($1,000 credits) | At least one Alchemy service, meaningfully | ✅ Every read goes through Alchemy (`alchemy: ok` on live answers). Thin, but it meets the text | H14 |
| Best workflow with CRE ($3,000) | A blockchain joined to an external source; a successful simulation by the CRE CLI. **Demo video required (max 2 min)** | ✅ Built and simulated with a real write; the video is missing | H13 |
| Best Builds Powered by KIMI ($3,000 credits, split across 10 teams) | KIMI driving a core feature, "not bolted on as a chatbot widget". **A published article is required** | 🔶 Working (D-036): `kimi-k3` writes the plain words under every live verdict in three languages, checked with the real key and in a browser. A judge with no wallet gets them through "Check it live" in the demo sites' panel; the wallet's Rules page turns a sentence into suggested rule changes (`/v1/policy/draft`: tightening ticked, loosening unticked with a warning, nothing saved until Save). Production waits on the key on Render. **Deployed 2026-10-09** (#51); live once E7 sets the key. On the deployed showcase the panels already check live with no wallet (`VITE_BARET_DEMO_FROM`), so the plain words will show for every visitor | E7, H12, H16 |
| Best Builds with Qwen 3.8 Max ($5,000 credits, "split across the top 3 Track 4 winners") | Planning, tool use, multi-step execution; deployed and demoable. **A published article is required** | 🔶 Working (D-035): the reviewer plans, calls four tools and vetoes or approves; on Monad testnet a mismatched payment vetoed and the matching one sent. Deployable as `POST /v1/review` (three fixed scenarios on the demo vault, streamed) and demoable on the showcase page `/review`, checked live in a browser against a local server (the honest payment approved and sent, overpay and injected vetoed). Production waits on the keys on Render. **Deployed 2026-10-09** (#51): `/review` answers 200 and shows its recorded run; live once E7 sets the keys | E7, H12, H16 |
| Best Community Team Project ($5,000) | Every member names the campus group in the platform profile; the group is on the onboarded list | ❌ Not done | H2 |

### Who does what (redistributed 2026-10-09)

Ezgin's list was the bottleneck and Hale's was only testing, so the work moved (D-031):

- **Ezgin** keeps what only Ezgin can do: the wallet's back side (`@baret/wallet-core` into the store), the engine decision, the Cleanverse contract, and the account-owner steps (credits, keys on Render, funding).
- **Meriç** builds what the viewer sees in the demo, including the window that lets a site open the wallet, and owns the two model bounties (KIMI and Qwen) end to end.
- **Hale** builds as well as tests: the agents playground and the `/agents` page, the history screens, the Cleanverse scenario, the developer quickstart, then the scripts, videos, articles, final documents and the submission. Hale's testing is cut down to the demo path and the sponsors' own tests.

### Ezgin

| ID | Task | Day | Needs | Serves |
|---|---|---|---|---|
| E1 | Finish Hale's onboarding: platform team, funded test wallet, a vault to test against | Fri 9 | nothing (Hale's address sent 2026-10-09) | everything Hale does |
| E2 | Nansen: credits, `NANSEN_API_KEY` and `NANSEN_MODE=labels` on Render | Fri 9 | credits | Nansen |
| E3 | Wallet live, part 1: passkey account (also with no stored credential), lock, balances, send, sign requests through `@baret/wallet-core`. **Done 2026-10-09**, checked on the live URL with a virtual passkey | Fri 9 | | Mera UX |
| E4 | Wallet live, part 2: delegation calls, and agent keys from their own PRF namespace. **Done 2026-10-09** (D-032), checked on the live URL with a virtual passkey | Fri 9 to Sat 10 | E3 | Many Keys, Dynamic |
| E5 | Decide and build: do the two Caution attacks become Blocked. **Done 2026-10-09**: Blocked (D-033); `verify:demo` 20 of 20 on the live API at commit `279bb3d` | Sat 10 | | main track |
| E6 | Cleanverse contract side. **Contract built and deployed 2026-10-09 (D-034, branch `cleanverse-guard`), checked on a fork of the real contracts. Parked 2026-10-09: the owner has its A-Pass and the allowance is set; a live settlement waits only on test aUSDC, which Cleanverse has to send** | Sat 10 | an A-Pass | Cleanverse |
| E7 | Account steps before recording: three keys on Render (`KIMI_API_KEY`, `QWEN_API_KEY`, `BARET_DEMO_AGENT_PRIVATE_KEY`), Render on Starter, `~/.baret/` backed up, the `LICENSE` file. The keys go in on Fri 9 or Sat 10, not Sunday, so H16 can test before recording | Fri 9 or Sat 10 | M4, M5 | KIMI, Qwen, videos |
| E8 | Answer Hale's evidence questions and review the final README and the pitch script | Sun 11 to Mon 12 | H11, H14 | all forms |
| E9 | Fund a dedicated playground-agent wallet (MON, real test USDC, fake USDC; found by H4, see "Where things stand") and set `VITE_BARET_PLAYGROUND_AGENT` with `VITE_BARET_PLAYGROUND=live` on the showcase's Vercel project once H4 merges | Fri 9 to Sat 10 | H4 merged | main track (H4) |
| E10 | Nine more activity kinds for the wallet's history, cosmetic (found by H5); a transaction the wallet already logged must not show twice | — | H5 merged | Envio, Mera UX |

### Meriç

| ID | Task | Day | Needs | Serves |
|---|---|---|---|---|
| M1 | NovaSwap: a real signature path. In attack mode the connected wallet signs and sends the attack, and the page shows the money leaving. **Done 2026-10-09** (#42, live); the live MetaMask run is Hale's H3 | Fri 9 | | main track |
| M2 | The comparison flow and its copy: same site, same button, two wallets. **Done 2026-10-09** (#44); the MetaMask wording waits for H3 | Fri 9 | M1 | main track |
| M3 | A site can open the wallet's connect and sign windows; NovaSwap gets "Check with Baret" through it. **Done 2026-10-09** (#46): the attack comes back Blocked with nothing signed, the honest swap is signed and confirmed; the live run is Hale's | Sat 10 | E3, M1 | main track, Mera UX |
| M4 | KIMI live: a key, the first real call, the explanation as part of the verdict screen | **Built 2026-10-09**, checked with the real key; production after E7 | E7 for production | KIMI |
| M5 | Qwen: the reviewer against the real model and made agentic (planning, tools, several steps), demoable | **Done 2026-10-09** on Monad testnet (D-035) | none | Qwen |
| M6 | The wallet screens on live data: one-prompt onboarding, fix what real data breaks, remove the sample notice. **Done 2026-10-09** (#45): 4 taps and about 6 s to a first confirmed send, the stateless test passes; real-device pass is H10 | Sat 10 | E3, E4 | Mera UX |
| M7 | The project logo for the form: JPG, PNG or WEBP, at most 3 MB | **Done 2026-10-09** (`docs/submission/`) | | main track |

### Hale

| ID | Task | Day | Needs | Serves |
|---|---|---|---|---|
| H1 | First session: machine, `qa` branch, git identity into `CLAUDE.md`, a test wallet | Fri 9 morning | | |
| H2 | The platform: all three profiles name the campus group; the twelve prizes are selected; the form's fields against §8.1 | Fri 9 | E1 | Community, all forms |
| H3 | The MetaMask rehearsal: sign NovaSwap's attack with MetaMask and record exactly what MetaMask shows | Fri 9 to Sat 10 | M1, E1 | main track |
| H4 | Build: the agents playground's six actions answer from the live API. **Built and checked against the real engine 2026-10-09**; needs E9 before it reproduces `verify:demo`'s matrix live (see "Where things stand") | Fri 9 | E9 to go live correctly | main track |
| H5 | Build: the wallet's history and the vault's merchants from `/v1/audit/*`. **Built in part 2026-10-09** (#52): History and Home read the vault's `paid` rows from the indexer; the other nine kinds are E10 | Sat 10 | E3 for the live account | Envio, Mera UX |
| H6 | Build: `/agents` matches what shipped, with the Dynamic agent's real payments read live from the indexer. **Built 2026-10-09** (#55, with Meriç's review on the branch): the samples typecheck against the kit, the live block reads the vault's payments from `/v1/audit/vault` and fails closed | Sat 10 | | Dynamic, Envio |
| H7 | Build: the Cleanverse scenario on a screen, and the wording for a finding that comes from the asset. **Built 2026-10-09** (#56, with the owner's review on the branch): two `/agents` playground actions, a verified wallet (Safe) and a wallet with no credential (Blocked), from sample answers until E9 sets the live flag. The asset's finding reads "..., and this asset only moves between verified wallets." (the server sends the asset's address, so the sentence does not print it) | Sat 10 | | Cleanverse |
| H8 | Build: small copy and the extension (ScamSniffer reason, agent-key sentence, API URL, unused permission). First to be cut. **Built 2026-10-10** (#57, with the owner's review on the branch): a ScamSniffer listing reads "{address} is on ScamSniffer's public blacklist." in every finding list and in KIMI's input; the landing and the delegation page say the same agent-key sentence (D-019); the extension's host access is the API named by `WXT_BARET_API_URL` (the deployed one in the published zips), and `scripting` is gone | Sun 11 before 12:00 | | |
| H9 | Write: the developer quickstart (READMEs for `guard` and `agent-kit`, "call Baret from your app"), and get one other team to try it | Sat 10 | | main track |
| H10 | Test: the six sites and `verify:demo`, the suites once, the wallet end to end with Mera's stateless and cross-device tests, the Nansen label, the CRE checks | Sat 10 to Sun 11 morning | E1 to E4, M6 | all |
| H11 | Write: the scripts. Demo (3 min), pitch (2 min), and the list of sponsor clips | Sat 10 evening | H3, E5 | all |
| H12 | Write and publish: the KIMI article and the Qwen article, each only if its feature is live | Sun 11 to Mon 12 | M4, M5 | KIMI, Qwen |
| H13 | Record: the demo and pitch videos, the Cleanverse clip, the CRE simulation clip, the optional sponsor clips | Sun 11 afternoon to Mon 12 | H11, E7 | all |
| H14 | Final documents: README and ARCHITECTURE, status tables, access instructions for judges, the tracked root notes, one submission text per prize | Sun 11 to Mon 12 | E8 | all forms |
| H15 | Final regression and submit | Mon 12 | | all |
| H16 | Test on the live URLs after the merge deploy and E7 (**2026-10-09:** deployed with #51; waits only on E7): `/review` (the three scenarios live, the honest payment sent, the recorded fallback labelled as such), KIMI's plain words in the panel and in the wallet, "Check it live" with no wallet, and rules from a sentence on the live wallet's Rules page | Sat 10 or Sun 11, after E7 | E7, M4, M5 | KIMI, Qwen |

### What is cut first

If a day slips, drop in this order and write it down here and in `docs/BOUNTIES_AND_TRACKS.md`: H8, E6 (Cleanverse contract), M5 with its article (Qwen), H7, E5, M4 with its article (KIMI), M3. **Never cut:** M1 and M2 (the story), E3 and E4 (three prizes depend on them), H3, H9, H11, H13, H15.

If M3 is not working by Saturday evening, the Baret side of the story stays the panel on the page, the MetaMask drain is still real, and the video is told with those two.

### Known risks

- Hale starts on Friday with fifteen tasks and no session behind them. Hale's build tasks are small and specified to the file; if one takes more than half a day it goes back to its earlier owner (H4, H5 to Ezgin; H6, H7, H8 to Meriç) and the board says so.
- E3 and E4 are still the base of three prizes (both Mera prizes, Dynamic) and of M3, M6, H5.
- H3 can change the story. If MetaMask warns on that transaction, the claim becomes "it does not tell you what will change", never "it does not protect you". Nothing about another wallet is said in the copy or the video that H3 did not see.
- "One Passkey, Many Keys" is weak as built: the page excludes signing transactions from a wallet account and wants namespaced salts. E4 says what would make it stronger; if that does not land, the prize is entered as it is or dropped by Ezgin at the freeze.
- The track is not for a consumer product. Every text and both videos present Baret as the layer; a pitch that reads "a safer wallet" loses the track.

### Not planned before the deadline

The MetaMask plugin bounty (not selected), the extension's live background and provider, a real 402 paywall endpoint for Scrybe, Alchemy webhooks and gas sponsorship, the CRE workflow on a DON, the Perpl panel, the sponsor perks (Tenderly, QuickNode, Zerion), `POST /vitals`, the sources-zip rebuild job in CI.

---

## Cut Rule (if time runs short)

Priority order (see `BOUNTIES_AND_TRACKS.md`): Main track + Nansen + Mera + Envio + Cleanverse + Alchemy are **never dropped**. First all of Tier A is cut, then if necessary Dynamic's scope is reduced (down to the minimum "beyond login" integration in agent-kit only).
