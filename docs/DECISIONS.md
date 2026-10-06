# Baret — Decision Log (ADR Log)

> Format: for every decision, Date, Decision, Rationale, Alternatives considered, Status. **Scan this file before taking a new architecture/scope decision** — so the same discussion is not repeated. If a decision changes, the old entry is not deleted; it points to the new decision with "Updated →".

---

### D-001 — Repo from scratch, fresh git history
**Date:** 2026-09-13
**Decision:** A new git repo will be created; commit history will start today. The git history of the `Baret-Stellar` and `Baret-EVM` repos will not be carried over.
**Rationale:** Hackathon rule / user instruction — the project must be presented as built "from scratch" for Monad Metropolis.
**Alternative:** Fork Baret-EVM and clean it up — rejected, the git history would carry the old commits.
**Status:** ✅ Final

### D-002 — Name: Baret
**Date:** 2026-09-13
**Decision:** The project name is "Baret" everywhere. The old code names (`Premon`, `stellar-thorn`, `Blackthorn`, `DELTAG_*`) will not be used.
**Rationale:** User request; brand consistency.
**Status:** ✅ Final

### D-003 — Monad only, no "any EVM chain" generalization
**Date:** 2026-09-13
**Decision:** `chain.ts` contains only `testnet` (10143) and `mainnet` (143). Env variables are named `MONAD_TESTNET_*` / `MONAD_MAINNET_*` (not generic `RPC_URL`/`CHAIN_ID`).
**Rationale:** User instruction — no other network's name will appear in any file; Baret-EVM's last commit did the exact opposite ("generalize from Monad to any EVM chain"), and that is being deliberately reversed here.
**Status:** ✅ Final

### D-004 — Main track: Trust, Identity & AI Infrastructure
**Date:** 2026-09-13
**Decision:** The Trust/Identity/AI Infra track was chosen instead of Consumer Products & Payments or Onchain Finance & Trading.
**Rationale:** See `BOUNTIES_AND_TRACKS.md` §1.
**Status:** ✅ Final

### D-005 — Dynamic chosen, Privy skipped
**Date:** 2026-09-13
**Decision:** The Dynamic SDK will be used for agent/server wallet + delegation; the Privy bounty will not be targeted.
**Rationale:** Both fill the same "wallet/onboarding SDK" slot; integrating both in depth is wasted effort and blurs the product narrative. Dynamic's headless/agent-wallet/CLI focus fits `agent-kit`'s needs better.
**Alternative:** Privy → use it for human onboarding in `apps/wallet` — rejected, Mera already fills that slot (the human account layer); 3 wallet SDKs is too many.
**Status:** ✅ Final (can be reopened if capacity grows)

### D-006 — Mera is the account layer of apps/wallet; Dynamic is the account layer of agent-kit
**Date:** 2026-09-13
**Decision:** Two different surfaces (human wallet vs. agent/server wallet), two different sponsor SDKs — no overlap.
**Rationale:** Meet each bounty's "beyond login" / "core to product" requirement in a real, separate use case.
**Status:** ✅ Final

### D-007 — Kuru/Perpl trading bounties, Agora bounties, Aurora Intents, Hunyuan skipped
**Date:** 2026-09-13
**Decision:** See `BOUNTIES_AND_TRACKS.md` §4.
**Rationale:** Product shape does not match (they want a trading interface / mobile payment app / multimodal experience; Baret is a security layer).
**Status:** ✅ Final (a slight stretch possibility was left open for Aurora Intents)

### D-009 — Extension stays classic seed-phrase; Mera only in `apps/wallet`
**Date:** 2026-09-14
**Decision:** The account layer of `apps/extension` is not being moved to Mera; it keeps the classic passphrase+seed self-custody model. The Mera passkey integration is done only inside `apps/wallet` (the independent standalone).
**Rationale:** The permission model and reliability of a WebAuthn/passkey flow inside an MV3 popup are more complicated; since `apps/wallet` is a web page fully under our control, it demonstrates Mera's "no seed phrase" promise much more cleanly. Details: `WALLET.md` §0, §3.
**Status:** ✅ Final

### D-010 — Showcase site names kept as they are
**Date:** 2026-09-14
**Decision:** The names of the 6 showcase sites from Baret-Stellar (SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD) will be used unchanged.
**Rationale:** User instruction — these names are already generic/brand-neutral (they do not carry any network's name), the threat scenarios were adapted to Monad/EVM (see `FRONTEND.md` §2.3), and only the Stellar-specific mechanics (trustline, AccountMerge) were replaced with their EVM equivalents (approval, setApprovalForAll).
**Status:** ✅ Final

### D-008 — Persistence layer: Envio will replace the in-memory audit trail
**Date:** 2026-09-13
**Decision:** The "last 10,000 records in memory, reset on restart" design from the old repos will be abandoned; PaymentGuard/ReputationRegistry events will be indexed with Envio HyperIndex and become the primary source of the audit dashboard.
**Rationale:** It both makes the Envio bounty organic and solves a real product gap (no persistent audit).
**Status:** ✅ Final

### D-011 — Brand system: lockout/tagout, International Orange on concrete, Big Shoulders
**Date:** 2026-09-15
**Decision:** The identity is built on the industrial lockout/tagout procedure: the hard-hat mark (dome, visor slit, chamfered brim), the safety **tag** as the signature device, a concrete/chalk/ink materials palette with International Orange `#FF4F00` as the single signal and Monad violet reserved for network facts, Big Shoulders (Stencil + Display) for wordmark and headlines, Instrument Sans body, JetBrains Mono data, square corners with a single chamfer, no gradients. Generated imagery lives in three scenes (night skyline, day site, tag macro) and never contains text. Full spec: `BRAND.md`; rendered kit: the "Baret Brand Kit" artifact.
**Rationale:** Every wallet-security brand uses shields and padlocks; the tag is an action, not a promise, and gives every screen a recognizable object at thumbnail size. Orange keeps the brand distinct from Monad's own violet while staying "of the network". Meriç reviewed Rev 01 (hard hat only, cream/orange, Archivo) and asked for something more professional and unusual; Rev 02 was approved.
**Alternatives:** Rev 01 hard-hat-only system — rejected as too generic; Monad violet as accent — rejected (screens would read as foundation pages and fight the Blocked state).
**Status:** ✅ Final

### D-012 — RPC library: viem
**Date:** 2026-10-01
**Decision:** `apps/server` talks to Monad through viem (2.56.5, the version the frontend apps already pin). `packages/guard` imports neither viem nor ethers: it is Zod schemas plus a `fetch` client, so wallet UIs stay light.
**Rationale:** One library across the monorepo; viem's typed ABI decoding (`decodeFunctionData`, `decodeEventLog`) replaces the hand-rolled selector table of the old EVM repo; the frontend already depends on it.
**Alternative:** ethers 6 (used in the old EVM repo) — rejected, it would be a second library in the bundle.
**Status:** ✅ Final

### D-013 — PaymentGuard shape: one token, three caps, pause, payment reference
**Date:** 2026-10-01
**Decision:** The vault holds one token fixed at deploy; each merchant has a per-payment cap, an optional rolling 1-hour cap and a rolling 24-hour cap; merchants can be paused; `pay(merchant, amount, ref)` carries a reference; one agent signer; `withdraw` keeps `totalReserved` (sum of active daily caps). Windows are exact (per-merchant spend log, at most 128 live entries in 24 h).
**Rationale:** Answers Meriç's three questions in `tasks/FOR_EZGIN.md`: a real pause instead of zero caps, the hourly cap enforced on-chain too so the vault and the extension speak the same rules, and the reference mirrors `requireMemo`. A single token keeps every cap in one unit.
**Alternative:** multi-token vault per the first draft — rejected, caps would need a unit per token; bucketed (hourly) windows — rejected, inexact at the edges.
**Status:** ✅ Final. Agent key source (Mera sub-key vs Dynamic) stays open until Week 4.

### D-014 — How the policy engine decides a finding
**Date:** 2026-10-01
**Decision:** Every code has one of four kinds (`FINDING_SPECS`, `packages/guard/src/findings.ts`): toggle (its boolean field blocks it, otherwise it is a warning), threshold (emitted only when the rule is set and broken, so it blocks), failClosed (`*_UNAVAILABLE`, emitted only when a rule needed the data, always blocks), warning (blocks only when `allowWarnings` is off). Severity is display only. `X402_DESTINATION_MISMATCH` and `X402_ASSET_MISMATCH` stay warnings, as the copy says; under Strict they block.
**Rationale:** Matches `policy.content.ts` field by field (a test asserts it), so no field is dead and no code is orphaned. The old repos let "critical always blocks" override the user's toggles, which made some toggles meaningless.
**Status:** ✅ Final (revisit the two x402 mismatch codes if the demo shows they should always block)

### D-015 — Hosting: Vercel for the web apps, Render for the API, GitHub Actions as the gate
**Date:** 2026-10-01
**Decision:** `apps/showcase` and `apps/wallet` deploy to Vercel (one project each, Git integration, previews per PR). `apps/server` deploys to Render from `render.yaml` with `autoDeployTrigger: checksPass`, so a `main` commit reaches the API only after CI passes. Vercel rewrites `/api/*` to Render, keeping the browser on one origin like the Vite dev proxy. The extension ships as a CI artifact. Contracts are deployed by hand, never from CI.
**Rationale:** Static Vite builds fit Vercel; a long-running Fastify process with RPC connections fits Render better than serverless functions. The rewrite avoids CORS and a build-time API URL in the web apps. Keeping the deployer key out of GitHub secrets is worth a manual step we run a few times.
**Alternative:** API as Vercel functions — rejected (cold starts per request, 10 s limit on the free tier against a trace call); deploying contracts from CI — rejected (key exposure).
**Status:** ✅ Final

### D-016 — Nansen: Profiler labels, mapped to three trust levels
**Date:** 2026-10-02
**Decision:** The reputation detector reads Nansen's Profiler labels (`POST /api/v1/profiler/address/labels`, `chain: "monad"`, API key in the `apikey` header). Labels map to the profile in `sources/nansen.ts` (`profileFromLabels`): an entity or name label → `identified`; any other label → `established`, unless it is a fresh-wallet label; no labels → `new`. Exploit, hack, scam, phishing, drainer, sanction and similar labels set `flagged` (→ `KNOWN_MALICIOUS_ADDRESS`); fresh-wallet and whale labels drive the two Nansen warnings. Answers are cached for 6 hours per address and fetched four at a time. Every address gets an answer or the whole lookup throws, so a rate limit or an outage fails closed instead of letting an unchecked address through.
**Rationale:** The labels endpoint is the cheapest call that carries the segment information the bounty asks for (entity, fresh wallet, whale, exploiter), and it supports Monad. Nansen indexes Monad mainnet only, so on testnet the labels describe the same address on mainnet: meaningful for wallets, mostly empty for testnet-only contracts.
**Alternative:** premium labels (smart money) — more credits per call for a signal the rules do not use; Nansen over x402 instead of an API key (pay per call in USDC on Monad) — attractive for the story, kept as a follow-up because it needs a funded mainnet wallet on the server.
**Status:** Updated → D-017 (default mode is now first-funder; labels kept as a mode)

### D-017 — Nansen on the free plan: first-funder by default, and only the trust rule depends on it
**Date:** 2026-10-02
**Decision:** (1) `NANSEN_MODE=funder` (default) asks `profiler/address/first-funder` (1 credit) instead of the labels endpoint (100 credits): a wallet never funded or funded in the last 7 days is a fresh wallet (`new`), an older one is `established`, a funder whose Nansen name reads as theft (exploiter, scam, drainer…) flags the wallet. `NANSEN_MODE=labels` switches back to D-016 when credits allow. (2) Nansen is asked about wallets the user deals with, not contracts, at most 3 uncached wallets per request (more throws, so the rules that need Nansen fail closed rather than check some and skip the rest), cached 24 h. (3) `blockKnownMalicious` and `blockRiskyContracts` need the on-chain ReputationRegistry; Nansen adds to the blocklist when it answers. Only `minNansenTrustLevel` above `new` (Strict) cannot be decided without Nansen.
**Rationale:** The free plan gives 100 credits once, then tops up to 10 a day; the labels endpoint costs 100, so one call would spend the whole plan. First-funder fits 10 checks a day, which the cache stretches over a demo. Under D-016 every request failed closed while no key was set, which made Balanced useless without Nansen; the registry is our own source and always answers.
**Status:** ✅ Final. Updates D-016 (labels mode kept). A request to Nansen for hackathon credits is out; on approval set `NANSEN_MODE=labels`.

### D-018 — Showcase scenarios run on real testnet contracts; NovaSwap's attack is an unlimited approval to a look-alike router
**Date:** 2026-10-03
**Decision:** Each showcase dApp gets small contracts on Monad testnet so the demo sends real transactions through `/v1/analyze`. NovaSwap: a test token `dUSDC` (symbol chosen so it is never taken for real USDC), an honest router (fixed 3.2 dUSDC per MON), and a drainer that copies the router's interface at a CREATE2 address ground to start and end like the router's (address poisoning). The attack site asks for an unlimited dUSDC allowance "to enable trading"; with an ordinary wallet the following "swap" takes the whole balance, with Baret the approval itself is blocked twice (unlimited allowance, reported address). The drainer is reported in our ReputationRegistry; its sink is a fresh address nobody holds the key for. Addresses, ABIs and builders ship in `packages/demo` (`@baret/demo`) so the frontend never writes calldata by hand.
**Rationale:** A prepared sample proves nothing to a judge; a real transaction that drains a real (test) balance with one wallet and is stopped by Baret is the magic moment the demo needs. Two independent rules catching the same attack also shows the policy engine is not a single check.
**Alternative:** the earlier "rerouted output" NovaSwap idea in FRONTEND.md §2.3 — kept for later, the approval drain is the more common real-world attack and needs no output-token liquidity.
**Status:** ✅ Final for NovaSwap; the other five sites follow the same pattern.

### D-019 — One web signature layer for the showcase and the wallet: `packages/web-ui`
**Date:** 2026-10-03
**Decision:** The landing's shared layer moves into one workspace package, `@baret/web-ui`, consumed as TypeScript source through subpath exports (`lib/*`, `components/*`, `styles/*`, `vite`): the type scale, the frame and section grammar, the motion tokens and `LandingMotion`, `Reveal` and `TextReveal`, `Parallax`, `SmoothScroll` (Lenis), the eyelet cursor and `Signature`, `Img`, `LinkButton`, the verdict blocks of the Baret panel, and the self-hosted fonts. The showcase and the wallet import from it; the extension does not. The font files live once, in `packages/web-ui/fonts`, and its `webUiFonts()` Vite plugin serves them at `/fonts`. In the wallet the eyelet cursor runs on every screen, and Lenis on every screen except the two request windows, `/sign` and `/connect`.
**Rationale:** Meriç's rule of 2026-10-02: every page shares the landing's features and its quality. The wallet had none of them (Google Fonts, no cursor, no motion), and a copy would drift from the original. Subpath exports instead of a barrel keep Lenis and the cursor in their own lazy chunks, so the landing's bundle stays as it was. On a sign or connect request the reader has to land exactly on a finding or on Decline, and a glide makes that harder, so those windows keep the native scroll.
**Alternatives:** `packages/showcase-ui`, the name `CLAUDE.md` reserved — rejected, the wallet uses it too; folding it into `@baret/ui` — rejected, it would pull motion and Lenis into the extension; copying the files into the wallet — rejected, two implementations drift.
**Status:** ✅ Final (Meriç, 2026-10-03)

### D-019 — The agent's wallet comes from Dynamic; the vault owner authorises it with the Mera passkey
**Date:** 2026-10-05
**Decision:** The agent that calls `PaymentGuard.pay` holds a Dynamic server wallet. The vault's owner, a person on the Mera passkey wallet, authorises that address with `setAgentSigner` and can cut it off with `revokeAgentSigner`. A Mera PRF sub-key is the owner-side alternative for a self-hosted agent and stays a stretch goal.
**Rationale:** The copy said both "agent wallets come from Dynamic" and "Mera derives the agent key". Each sponsor now has one job that is real: Dynamic runs the autonomous wallet, Mera is how a human grants and revokes its authority. Closes the open half of D-013.
**Status:** ✅ Final

### D-020 — Hackathon scope for the last eight days
**Date:** 2026-10-05
**Decision:** Submission closes 2026-10-13. Order: the five remaining demo sites live on testnet, agent-kit with Dynamic, the Mera wallet going live. Cut: the extension's live background (it stays on the sample wallet, labelled as a preview), Cleanverse (no API access), Chainlink CRE, the MetaMask plugin. Envio only if the Mera work finishes early.
**Rationale:** Every screen the judges can click should be real before a second wallet surface is. The extension background is the largest single piece of work left and the standalone wallet covers the same story plus two Mera bounties.
**Status:** ✅ Final

### D-021 — An exchange with a listed contract is not a loss; proxies older than EIP-1967 are standard proxies
**Date:** 2026-10-05
**Decision:** (1) The loss limit (`maxLossPercent`) is skipped when everything that leaves the user's account goes to contracts on Baret's own list and the user receives a token or a collectible in the same transaction (`isExchangeWithListed`). A payment to anything unlisted, or one that returns nothing, is still measured. (2) A delegatecall counts as a standard proxy when the target is stored in the EIP-1967 slot or in the older OpenZeppelin slot (`org.zeppelinos.proxy.implementation`); the implementation behind a standard proxy is not judged as an unknown contract on its own.
**Rationale:** (1) Baret has no prices, so a stake that returns a receipt or a swap looked like a loss of the whole amount and was blocked above half the balance. Limiting the exception to listed contracts keeps a worthless-token scam measured. Answers the question in the 2026-10-03 demo-sites task. (2) Circle's USDC is such a proxy: every USDC transfer came back with a borrowed-code warning and an unknown contract, found while checking ClaimHub against the real token.
**Status:** ✅ Final

### D-022 — agent-kit: a Caution is not signable, the signer is replaceable, a revert carries one finding
**Date:** 2026-10-05
**Decision:** (1) `AgentWallet` signs on Safe only; Caution needs an explicit `allowCaution`. (2) The key holder is an `AgentSigner` interface: Dynamic's server wallet in a deployed agent, a local key in tests. The Dynamic wallet is created two-of-two and its local share is stored in one owner-only file. (3) The CLI takes settings from the environment, never from flags. (4) In the engine, a request that would revert reports `SIMULATION_FAILED` alone: the loss and floor rules are skipped, since nothing moves and the fee of a reverting call cannot be estimated.
**Rationale:** (1) A Caution is a finding for a person to read; an agent cannot read it. This is also where the x402 "paid the wrong address" warning (D-014) is stopped for agents. (2) Tests and the testnet demo must not depend on a third-party account. (3) A key or token passed as a flag ends up in shell history. (4) Found on the first over-cap payment: the verdict listed "could not measure the loss" next to the real reason.
**Status:** ✅ Final

### D-023 — The wallet's live side: a Mera passkey account, agent keys on their own branch, check before every signature
**Date:** 2026-10-05
**Decision:** `packages/wallet-core` is the wallet without its screens. (1) The account comes from a Mera passkey: the PRF output is turned into a BIP-39 seed and the wallet is `m/44'/60'/0'/0/0`, an ordinary Monad account. Nothing is stored but the credential id. (2) Agent keys come from the same passkey on a separate branch, `m/44'/60'/1'/0/n`: the owner can hand one to an agent, authorise it on a vault and derive it again at any time to audit or revoke it. (3) `Wallet.check` asks Baret; `Wallet.sign` signs Safe, signs Caution only with the owner's explicit acknowledgement, never signs Blocked, and refuses an expired verdict. (4) Each account opens its own vault through `PaymentGuardFactory`; the server treats factory vaults as known contracts. (5) The contract cannot list its merchants, so the wallet remembers the addresses it added and reads their state from the chain.
**Rationale:** Mera needs no server and no API key, so the whole account layer is a library. The agent branch is the "one passkey, many keys" use: no key file to back up, and the owner never loses the ability to name or revoke an agent. D-019 stays: a hosted agent uses a Dynamic wallet; the passkey-derived key is for an agent the owner runs themselves, and both are authorised with the same `setAgentSigner`.
**Known limit:** a deposit into the owner's own vault counts toward the loss limit like any transfer out, so depositing more than half of a token balance in one step is Blocked under Balanced. Deposit in smaller steps until the engine reads the vault's owner.
**Status:** ✅ Final

### D-024 — The indexer: factory-registered vaults, one activity feed, audit routes that never invent an empty history
**Date:** 2026-10-05
**Decision:** `indexer/` is an Envio HyperIndex v3 project on Monad testnet. The factory's `VaultCreated` registers each new vault, so no vault address is configured by hand except the demo vault that predates the factory. Besides current state (`Vault`, `Merchant`, `ReputationEntry`) it keeps append-only rows (`Payment`, `VaultActivity`, `ReputationChange`). The server exposes them at `/v1/audit/*` through `ENVIO_ENDPOINT`; when the indexer is missing or silent the routes answer 503. The indexer is hosted on Envio's service, deployed from this repo.
**Rationale:** Completes D-008 (no in-memory audit trail). The wallet's history and delegation screens need what the contract cannot enumerate, and the free RPC plan limits `eth_getLogs` to ten blocks. An audit view that shows "no payments" because its source is down would be a false statement, hence 503.
**Status:** ✅ Final. Open: an API token and the hosted deployment (docs/DEPLOYMENT.md §3.6).

---

## Open Decisions (not yet taken — to be filled in as we progress)

| # | Topic | Where it has impact | Decision date |
|---|---|---|---|
| AK-1 | Will we write our own x402 facilitator or use a standard one? | `X402_FACILITATOR.md` §4.4 | To be settled in Week 4 |
| AK-2 | Name of the x402 demo scenario (replacing the old "scrybe") | `X402_FACILITATOR.md` §6, `apps/showcase` | Week 2 |
| AK-4 | Is an additional "gated asset" demo contract needed on the Baret side for Cleanverse? | `CONTRACTS.md` §4 | Week 3 |
| AK-6 | Whether a separate track submission is required to win the track-tagged bounties (Kuru/Agora/MetaMask plugin) | `BOUNTIES_AND_TRACKS.md` §1 | When the platform clarifies |
| AK-7 | Best Community Team Project eligibility — confirmation of "community supporter" status | `BOUNTIES_AND_TRACKS.md` §2 row 9 | Week 4 |

**Note (AK-3, resolved):** viem — see D-012.

**Note (AK-8, resolved):** brand spec written as `BRAND.md` — see D-011.

**Note (AK-5, resolved):** Showcase site names are not being renamed with a Monad theme; the original names are kept — see D-010.

**Rule:** When an open decision is settled, it is removed from this table, added above as a numbered D-XXX entry, and the other files it affects (`ARCHITECTURE.md`, `CONTRACTS.md`, etc.) are updated at the same time.
