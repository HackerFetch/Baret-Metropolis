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
**Decision (scope updated → D-025):** Submission closes 2026-10-13. Order: the five remaining demo sites live on testnet, agent-kit with Dynamic, the Mera wallet going live. Cut: the extension's live background (it stays on the sample wallet, labelled as a preview), Cleanverse (no API access), Chainlink CRE, the MetaMask plugin. Envio only if the Mera work finishes early.
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

### D-025 — The stretch bounties are back in; the last week has one slot per item
**Date:** 2026-10-07
**Decision:** Updates D-020. With the planned backend finished three days early, the remaining week takes on the items D-020 cut: the Chainlink CRE reputation-oracle workflow, the MetaMask Agent Wallet plugin, a Qwen reviewer for agent transactions, a KIMI plain-language explanation of a verdict, and Cleanverse compliance if the sponsor's contract details arrive. Each has a fixed slot in `docs/ROADMAP.md` ("Final week"); an item that is not working at the end of its slot is dropped and recorded. 2026-10-11 and 10-12 are for the submission only. The extension's live background stays cut.
**Rationale:** Owner decision. The fixed slots are what keeps five additions from eating the days the videos, the per-bounty notes and end-to-end testing need; the main track prize depends on those more than on any one sponsor bounty.
**Status:** ✅ Final

### D-026 — The CRE workflow writes through a receiver contract, and the simulator's forwarder is trusted only while a run lasts
**Date:** 2026-10-07
**Decision:** (1) `workflows/reputation-oracle` is a Chainlink CRE workflow in TypeScript: cron trigger, ScamSniffer's public address blacklist fetched on every node with identical consensus, one EVM read (`pending`) and one signed report to Monad testnet. It keeps no state: time selects which window of the sorted feed a run handles, and entries the registry already has are never rewritten. (2) `ReputationOracleReceiver` sits between the CRE forwarder and `ReputationRegistry` and is the registry's forwarder. It answers ERC-165, accepts reports only from workflows owned by one address, and refuses a report that names a protected contract. (3) The receiver listens to the production `KeystoneForwarder`. `simulate.sh --broadcast` points it at the `MockKeystoneForwarder` for the length of one run and restores it afterwards.
**Rationale:** (2) The forwarder does not deliver to a contract without ERC-165 and delivers every workflow's reports, so the registry as deployed could not be a safe receiver. A receiver in front keeps the registry's address, the Render setting, the indexer and every entry as they are. The protected list is the answer to a poisoned feed: the feed is somebody else's data, and without it one bad line could make Baret block its own demo. (3) The mock forwarder verifies no signatures; a registry that trusts it permanently can be written by anyone, and the live API reads that registry before every verdict.
**Alternatives:** redeploying the registry with ERC-165 — rejected for the last week, four places to update and every entry to rewrite; leaving the deploy key as the writer and showing a dry run only — rejected, the workflow would never have written to the contract the API reads.
**Known limits:** not deployed to a DON (needs CRE Early Access; `cre whoami` shows deploy access not enabled). The simulator runs one node, so the consensus step is exercised but not across nodes. A full pass over the feed is 2,530 entries; the testnet run wrote one window of ten.
**Status:** ✅ Final

### D-027 — The MetaMask Agent Wallet plugin is a gate in front of the wallet, shown on testnet
**Date:** 2026-10-07
**Decision:** `packages/metamask-plugin` adds `mm baret check` and `mm baret send` to the Agent Wallet CLI. `send` calls the wallet's executor only after Baret's verdict: Safe goes on, Caution goes on only with `--accept-caution`, Blocked and "no verdict" never do. The plugin ships with no runtime dependencies and is installed from a packed tarball. The demonstration stays on Monad testnet: the three refusals and the hand-over of a Safe transaction are shown with a real Agent Wallet; a confirmed send is not.
**Rationale:** The bounty asks for a new capability through the plugin architecture and forbids going around the wallet's policy; a pre-trade check that can only remove proposals fits both. The Agent Wallet (7.0.0, server wallet) lists chain 10143 but its own `mm wallet send-transaction` fails there with `Invalid chainId`, and it sends on chain 143 only; the live Baret server analyses testnet only. Opening mainnet on the server means a dashboard change, real MON and half a day, for one extra line in the demo (owner decision: no).
**Found on the way:** installing the plugin from its workspace folder links it, the commands then load the workspace's copy of `@metamask/agent-wallet`, and with two copies every `mm` command fails with `window.addEventListener is not a function`. Hence the tarball. The executor takes `value` as a 0x quantity, not decimal wei.
**Status:** ✅ Final

### D-028 — Two models, two narrow jobs, neither of them the decision
**Date:** 2026-10-08
**Decision:** One OpenAI-compatible client (`packages/llm`) with two uses. (1) Qwen (`qwen3.8-max`) is an optional reviewer in `agent-kit`: after Baret clears a call, it compares the call's simulated effects with the intent the agent stated and can veto. (2) KIMI (`kimi-k3`) writes `POST /v1/explain`: a verdict's findings in plain language, in English or Turkish, built on the sentences `@baret/content` holds for each code. Neither model can make a verdict more permissive: the reviewer only vetoes and is never asked about a call Baret blocked; the explain route copies `decision` from the verdict. A model that does not answer, or answers off its schema, is a veto in one place and a 503 in the other.
**Rationale:** Baret's verdict is deterministic and has to stay that way: the same transaction, the same rules, the same answer, with a finding code for every reason. What it cannot know is what the agent meant, and what it does not do is talk like a person; those are the two places a language model adds something. Putting the model after the engine, with veto-only or words-only authority, keeps prompt injection (a token named "ignore previous instructions") from ever becoming a signature. One client for both because both providers speak the same format, and a second provider is then a configuration change.
**Alternatives:** letting a model score risk inside the engine — rejected, a verdict nobody can reproduce; a single provider for both jobs — rejected, each sponsor's model gets the job it suits and the client makes the split free; an MCP tool `baret_explain` (the original plan) — replaced by the HTTP route, which the screens can call directly.
**Status:** ✅ Final for the design. The bounties were dropped (D-029) and are back in (D-031); the reviewer became an agent (D-035) and the route explains by request id (D-036).

### D-029 — The Qwen and KIMI bounties are dropped; the code stays in, off by default and untested against the real models
**Date:** 2026-10-08
**Decision:** Baret does not submit for "Best Builds with Qwen 3.8 Max" or "Best Builds Powered by KIMI". The reviewer in `agent-kit`, `POST /v1/explain` and `packages/llm` are merged as optional features: without `QWEN_API_KEY` the reviewer is not created, without `KIMI_API_KEY` the route answers 503. They are covered by unit tests with stubbed model answers only; no request has been sent to either provider, and the model names (`qwen3.8-max`, `kimi-k3`) and endpoints are from the providers' documentation, not from a call that succeeded.
**Rationale:** Owner decision at the end of the slot's first day (the rule of D-025). The Qwen bounty page asks for agentic use (planning, tool use, multi-step execution) and a published article, which a one-call reviewer does not meet and a tool-using one would take another day; both providers ask for payment details before issuing a key and no hackathon credit code was offered; both prizes are platform credits, the Qwen one split three ways. Nothing in the verdict depends on a model (D-028), so the product loses two additions, not a safeguard: the intent check, whose gap stays bounded by the vault's caps, and the free-form explanation, which the screens already cover with the fixed sentences in `@baret/content`.
**Status:** Reversed in part by D-031 (both bounties targeted again); the code it describes was made live by D-035 and D-036.

### D-030 — Cleanverse is read from the chain, and a compliant asset is checked whether or not the user asked
**Date:** 2026-10-08
**Decision:** (1) The compliance source reads Cleanverse's A-Pass and aToken policy contracts on Monad directly (`sources/cleanverse.ts`); there is no HTTP client and no API key. (2) When the user sends a token the policy has registered (a CVA such as aUSDC), both sides are looked up even if no identity rule is set, and a missing or expired credential is a blocking `COMPLIANCE_*` finding with `details.asset`. (3) A credential that exists but is not active counts as none; a record of an unexpected size makes the source fail, which blocks. (4) A credential carries a set of countries; `allowedCountries` passes only when every one of them is allowed, and a credential with no country does not pass. (5) Call depth is counted in contracts: a delegatecall into an implementation adds no level, and a proxy is recognised in a failed simulation too.
**Rationale:** (1) The bounty is identity verified on-chain, and the chain is what the asset itself obeys; an API answer could differ from it. (2) Without it a refused aUSDC transfer is a bare `SIMULATION_FAILED`: correct, and useless to the person. "A rejected compliant transfer should be a legible product state." (4) Fail-closed: a rule that cannot be shown to hold is not treated as held. (5) An honest aUSDC transfer runs through three proxies and was reported as five levels deep with three unknown contracts.
**Inferred, not documented:** the contracts' sources are unpublished. The record's layout (status, tier, country bitmap) was worked out from the chain and checked against Cleanverse's own API for four wallets. The expiry word's position is a guess: every credential seen has no expiry. If it is wrong, an expired credential would read as valid in Baret, while the asset would still refuse the transfer and the verdict would be `SIMULATION_FAILED` without the reason.
**Not done:** a Baret contract that moves a compliant asset (`docs/CONTRACTS.md` 4.3). Our own wallet has no A-Pass, so the demo scenarios are simulated from a third party's verified wallet.
**Status:** ✅ Final for the server side; the contract side waits on the sponsor's guides.

---

### D-031 — One board for the last week; the split crosses the roles; KIMI and Qwen are back in, with Meriç
**Date:** 2026-10-08, redistributed 2026-10-09
**Decision:** (1) `docs/ROADMAP.md` "Final week — the board" is the single plan: every open task has an ID, an owner and a day, and the three task files hold the detail. `docs/QA_AND_DELIVERY.md` §8.1 holds what each prize's page asks, word for word, and work for a prize is checked against it. (2) The aim is stated once: the demo (the same site and button, an ordinary wallet signs the attack and the money leaves, Baret reads and stops the same request), inside the frame the track sets (Baret is the layer other applications call, not a consumer product). (3) The work is split by who can finish it, not by folder. Ezgin keeps the wallet's back side, the engine, the contracts and the account-owner steps. Meriç builds what the viewer sees, the site-to-wallet window, and takes the two model prizes (KIMI, Qwen) including their backend code. Hale builds the playground, the `/agents` page, the history screens and the Cleanverse scenario, writes the developer quickstart and the final documents, and keeps the demo-path tests, the videos, the articles and the submission. (4) D-029 is reversed in part: both model prizes are targeted again. Qwen has a hard stop on Sat 10 Oct at 20:00. (5) The MetaMask plugin bounty is not selected on the project and is not entered; the plugin stays in the repository.
**Rationale:** A check of the repository and the live system on 2026-10-08 found the backend finished and verified (`verify:demo` 20 of 20) while the story cannot be shown: the demo sites sign nothing, no app imports `@baret/wallet-core`, no screen reads the indexer. The first split put all of that on Ezgin and left Hale with tests only; on 2026-10-09 the owner moved the specified, self-contained pieces to Hale and the window to Meriç. The bounty pages, read in full the same day, add requirements nobody had planned for: the track scores developer docs and traction (40%) and market readiness (25%); the Mera prizes are judged by a stateless test and a cross-device test, and "Many Keys" excludes signing from a wallet account; Cleanverse and Chainlink require their own demo videos; KIMI and Qwen each require a published article.
**Not changed:** D-028 (a model never decides a verdict), fail-closed, and the rule that nothing is claimed about another wallet that was not seen in Hale's rehearsal (H3).
**Status:** ✅ Final

### D-032 — The wallet's agent key comes from its own PRF namespace, and every vault change is a sign request
**Date:** 2026-10-09
**Decision:** (1) In the wallet app an agent's key no longer comes from a BIP-44 branch of the wallet's PRF output (D-023, point 2). The passkey is asked again with a salt that names the agent, `sha256("baret.agent.v1:<index>")`, and the 32 bytes that come back, hashed under a label, are the agent's key (`agentKeyFromPasskey` in `@baret/wallet-core`). Creating the key and showing it each cost one passkey prompt; nothing is stored. `WalletSession.agentKey` (the branch) stays for scripts that hold a PRF output and cannot run a prompt (`verify:wallet`). (2) Each change to the vault from the wallet (open, deposit, withdraw, caps, pause, remove, authorise or revoke the agent) is one or two calls, and each is shown to the owner as a sign request with Baret's verdict before it is signed. A deposit is two: the exact allowance (a Caution, `ERC20_APPROVAL_DETECTED`), then the deposit. (3) Pressing Sign on a Caution, with its findings on screen, is the acknowledgement `Wallet.sign` asks for. Blocked is never signed by the live wallet, the override included. (4) The merchants of a vault are read from the indexer (`/v1/audit/vault`) joined with the ones this browser added; their caps, the spend and the balance always from the chain.
**Rationale:** (1) The "One Passkey, Many Keys" page judges "salts genuinely namespaced" and a cross-device test, and is for uses other than signing from the wallet account. A branch of one output is one namespace with many indexes; a salt per agent is what the page describes ("per-agent isolated identities minted from salt namespaces"). The wallet's own secret is no longer an input of an agent's key, so handing a key to an agent reveals nothing about the account. (2) "Before every signature" has to hold for the wallet's own contract calls too; a page that signed vault calls behind a button would be the one place Baret is skipped. (4) The contract cannot list merchants; storage alone fails the stateless test.
**Checked 2026-10-09** in a headless browser with a virtual passkey, against the live API and Monad testnet: vault opened, a merchant given caps (0.50 per payment, 1.00 per day), 0.8 USDC deposited, the agent key created and registered; the agent paid 0.25 USDC with that key through `baret pay` (tx `0x2c982811f33d7b29e8f6edcb85093e799a88f384fec7c366f3ad18c1ed5614ef`), a 0.75 payment was refused, the merchant was paused from the wallet and the next payment refused; after `localStorage.clear()` the same passkey gave the same vault, merchant and agent key.
**Known limits:** the agent's key still signs payments, so the prize's "not signing blockchain transactions from a wallet account" is met only in the sense that the agent is not the wallet account. A Dynamic agent address can be authorised through `live.vault.agent(address)`, but the page has no field for it yet (M6). An agent needs more than 0.1 MON left after its transaction or Balanced blocks it (`minPostNativeBalance`).
**Status:** ✅ Final

### D-033 — Balanced blocks all six showcase attacks: a payment an unknown contract keeps, and borrowed code
**Date:** 2026-10-09
**Decision:** (1) A new finding, `VALUE_KEPT_BY_UNKNOWN_CONTRACT` (the 39th code, from the programs detector, severity high): the user calls a function, value leaves their account for a contract on no list, and nothing arrives in the same transaction. It is a toggle of the existing rule `blockRiskyContracts`, which Strict and Balanced have on and Permissive has off; no rule is added, the count stays at 25. A plain transfer (no calldata) to a contract address is not reported: the user chose that recipient. (2) Balanced now has `blockDelegatecall` on. The finding was already limited to borrowed code that is not a standard proxy calling its own implementation. (3) OrbitYield's and LaunchPad's attack versions are therefore Blocked under Balanced, like the other four; their copy, samples and `verify:demo` say so.
**Rationale:** Owner decision on 2026-10-09: the demo's claim is that Baret stops the attack, and two of six sites answered Caution. Turning on `blockUnknownContractExposure` in Balanced would have done it and would also have blocked every app not yet on Baret's list, which makes the default unusable. The narrow finding is what the simulation actually sees in OrbitYield's attack and nothing else: money in, nothing out, nobody vouching. Borrowed code outside a standard proxy is rare in honest apps and is how a sale's logic is swapped after the buyers have paid.
**Cost, accepted:** an honest call that pays an unlisted contract and returns nothing in the same transaction (a deposit with no receipt token, a payment to an unlisted merchant contract) is Blocked under Balanced until that contract is listed or the rule is turned off. This replaces "nothing here is provably an attack" in OrbitYield's copy.
**Checked 2026-10-09** with the changed engine against Monad testnet: OrbitYield's silent pool and LaunchPad's proxy sale answer Blocked, every honest scenario still answers Safe, and the other attacks are unchanged (18 of 20 through a local server on the public RPC; the two Cleanverse scenarios need more reads than that RPC allows). After the deploy, `verify:demo` agreed on 20 of 20 against the live API at commit `279bb3d`.
**Status:** ✅ Final

### D-034 — A CompliantPaymentGuard moves a Cleanverse asset by allowance, so it needs no credential of its own
**Date:** 2026-10-09
**Decision:** (1) The Cleanverse contract side is a new, small contract, `CompliantPaymentGuard`, not a `PaymentGuard` holding aUSDC. The owner keeps the asset and approves the guard; the agent's `pay` checks the A-Pass of payer and payee on-chain (credential, active, the owner's minimum tier) and Cleanverse's `canTransfer`, then calls `transferFrom(owner, merchant, amount)`. (2) Refusals are typed errors that name the party and the reason; a settlement emits both credentials. (3) The server decodes `NotVerified` from the simulation and reports `COMPLIANCE_NO_CREDENTIAL` with the party before the agent signs. (4) The use case entered for the prize is Travel Rule-compliant agent payments.
**Rationale:** A vault that holds aUSDC is itself a party to the transfer and would need an A-Pass, which only Cleanverse can issue and whose registration is in guides we did not have (D-030's open point). A read-only simulation on the chain showed the way around: the policy checks the two ends of a transfer, and a spender with no credential can relay aUSDC between verified wallets. Custody stays with a verified person, which is also the better answer to "who is the originator". The prize gives priority to identity "structurally coupled to asset movement": the guard has one path to the asset and the checks sit on it.
**Inferred, not documented:** Cleanverse's sources are unpublished. The function names come from the implementations' selectors (`canTransfer`, `isTokenRegistered`, `STATUS_ACTIVE`), the credential record's first two words (status, tier) from the chain, checked against two wallets. If Cleanverse changes the record's layout, `verified` reads wrong values; the asset's own check still stands behind it.
**Checked:** 15 forge tests, and a fork test against the real contracts on Monad testnet (settles to a verified wallet, `NotVerified` for an unverified one). Deployed at `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c`, source verified.
**Not done:** a settlement on the deployed guard. Its owner has no A-Pass yet (docs/CONTRACTS.md 4.3).
**Status:** ✅ Final for the contract; the live settlement waits on the owner's A-Pass.

### D-035 — The Qwen reviewer is an agent: a plan, four read-only tools, and an approval that has to show its reading
**Date:** 2026-10-09
**Decision:** (1) The reviewer in `agent-kit` works in two phases on `qwen3.8-max`: a plan (JSON, at most six checks), then a tool loop (`LlmClient.agent` in `packages/llm`) with four read-only tools: `decode_transaction` (the call against the PaymentGuard, ERC-20 and ERC-721 ABIs), `get_baret_verdict` (Baret's verdict with the balance changes of every account, not only the agent's), `read_vault` (`/v1/audit/vault/<vault>` from the indexer, plus the time and what the vault paid each merchant in the last hour and day) and `check_reputation` (`/v1/audit/reputation/<address>`). (2) It can only veto, and code enforces it, not only the prompt: it is never asked about a call Baret did not clear; an approval counts only if `decode_transaction` and `get_baret_verdict` ran successfully and Baret did not block; an answer that comes before those two is sent back with a reminder (at most twice), then judged; a missing intent, an error, a timeout or an answer off the schema is a veto. (3) Every review carries a transcript (plan, each tool call with its arguments, result and time, the decision). `baret review` runs it without signing; `--trace` prints it as it happens and `--transcript <file>` keeps it. (4) Default endpoint QwenCloud (`https://maas.qwencloudapi.com/compatible-mode/v1`, the console's Pay-As-You-Go URL; the Alibaba host `dashscope-intl.aliyuncs.com` takes the same key), with `enable_thinking: false` so JSON mode is accepted.
**Rationale:** The prize asks for planning, tool use and multi-step execution, and a one-call reviewer saw only a fixed summary: for a vault payment it saw no effect at all, because the tokens leave the vault and not the agent. The tools give it the facts an intent check needs (who is paid, how much, under which caps, whether the merchant is flagged) from the same live sources Baret uses. The code rules keep D-028 true whatever the model writes: a model that skips its reading cannot approve.
**Checked:** with a real key on 2026-10-09, Monad testnet data. On the demo vault, a matching payment approved after five tool calls (about 10 s), a payment five times the stated amount vetoed with the mismatch named, an intent carrying an instruction to the reviewer vetoed. On Baret's own vault `0x46F159DA1aD40A78526d35ea1Adb8531aDa52158` (owner and agent keys made for it, dUSDC, the demo merchant capped at 1 / 2 / 5 dUSDC): a payment nine times the intent vetoed and nothing signed; the matching payment approved and sent, `0x206bbd5cc3ee0ee092b52076d9da054b53e50b134c173427f87a7dc08821095d` (status 1, block 69536894, indexed). One run showed why the code rule exists: the model approved without calling a tool, the rule turned it into a veto, and the reminder in (2) was added.
**Status:** ✅ Final

### D-036 — `/v1/explain` explains only verdicts this server returned, and KIMI's words sit under the findings
**Date:** 2026-10-09
**Decision:** (1) The request is `{ requestId, language? }`: the `meta.requestId` of a `/v1/analyze` answer. `/v1/analyze` keeps every verdict it returns for ten minutes; the route explains its own copy and copies `decision` from it. The old form `{ verdict, language? }` is still accepted, but only its `requestId` is read. Unknown id: `404 verdict_unknown`. (2) One model call per request and language: explanations are cached for ten minutes and two requests for the same one share the call. (3) The route has its own rate limit (`BARET_EXPLAIN_RATE_LIMIT_PER_MINUTE`, default 20), since every call can spend paid credit. (4) Languages: English, Turkish and Chinese. (5) `kimi-k3` with `reasoning_effort: "low"` and `max_completion_tokens`; a k2 model set through `KIMI_MODEL` gets `thinking: disabled` instead. 28 s for the model, 32 s on the client. (6) The screens: a block "In plain words" under the findings in the demo sites' panel and in the wallet's sign screens (live requests only), with a byline saying KIMI wrote it and cannot change the verdict, and a language switch. With no key, no answer or an answer about another verdict it renders nothing, and a fast refusal never shows it for a moment.
**Rationale:** The first version explained any verdict a caller posted, so anyone could post a made-up "safe" verdict for a drainer and get KIMI's words under Baret's name, and spend our credit. Explaining by id closes both. The prize asks that KIMI drive a core feature, not a chatbot widget, and names "a multilingual dApp interface": reading a verdict is the core of the product, and the explanation is part of that reading.
**Checked:** with the real key on 2026-10-09: the NovaSwap attack approval Blocked, explanations in English (11.5 s), Turkish (15 s) and Chinese (24.6 s), the second time from the cache (16 ms); a posted verdict changed to "safe" answered "blocked"; an unknown id 404. In a browser against a local server, 19 of 19 checks: the block in the panel and in the wallet window, three languages, and with the key removed the block never appears.
**Status:** ✅ Final; production waits on the key on Render (E7).

## Open Decisions (not yet taken — to be filled in as we progress)

| # | Topic | Where it has impact | Decision date |
|---|---|---|---|
| AK-1 | Will we write our own x402 facilitator or use a standard one? | `X402_FACILITATOR.md` §4.4 | To be settled in Week 4 |
| AK-2 | Name of the x402 demo scenario (replacing the old "scrybe") | `X402_FACILITATOR.md` §6, `apps/showcase` | Week 2 |
| AK-6 | Whether a separate track submission is required to win the track-tagged bounties (Kuru/Agora/MetaMask plugin) | `BOUNTIES_AND_TRACKS.md` §1 | When the platform clarifies |
| AK-7 | Best Community Team Project eligibility — confirmation of "community supporter" status | `BOUNTIES_AND_TRACKS.md` §2 row 9 | Week 4 |

**Note (AK-3, resolved):** viem — see D-012.

**Note (AK-8, resolved):** brand spec written as `BRAND.md` — see D-011.

**Note (AK-5, resolved):** Showcase site names are not being renamed with a Monad theme; the original names are kept — see D-010.

**Rule:** When an open decision is settled, it is removed from this table, added above as a numbered D-XXX entry, and the other files it affects (`ARCHITECTURE.md`, `CONTRACTS.md`, etc.) are updated at the same time.
