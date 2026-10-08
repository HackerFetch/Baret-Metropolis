# Baret — Track & Bounty Strategy

> This file is the single authority on "what we target and why / what we do not target". When a scope debate comes up, check here first. The Status columns must be updated as work progresses.

Last updated: 2026-10-09 · Source: `Bounties.txt` (the list as of 2026-09-13) and the full bounty pages copied on 2026-10-09 into `docs/QA_AND_DELIVERY.md` §8.1, which is the authority on what each page asks. What closes each row is on the board in `docs/ROADMAP.md`

---

## 1. Track Selection

**Selected main track: Trust, Identity & AI Infrastructure — $30,000**

**Rationale:** Baret fits the definition "Protocol-level primitives for trust, provenance, and user-owned data that make AI genuinely useful without any single platform capturing the value" one-to-one. Agent guard, policy-bound/time-limited/revocable delegation, x402 firewall, on-chain reputation registry — all of these are the core theme of this track. Since the competitor pool in the other tracks will probably be more "product"-heavy, Baret differentiates more clearly here as infrastructure.

**Alternatives evaluated and rejected:**
- *Consumer Products & Payments* — Baret is not a consumer financial product but a security layer; forcing it in blurs the positioning.
- *Onchain Finance & Trading* — Baret is not a trading interface; even though the MetaMask plugin bounty lives in this track, moving the project's identity there would be wrong.

> **Answered 2026-10-09:** twelve prizes are selected on the project (the track and rows 2 to 9, 10, 11, 13 below). The MetaMask plugin bounty (row 12), the only one of ours tagged for another track, is not selected and is not entered (D-031). The earlier question, kept for the record:
>
> **Open question that needs verification:** To win track-tagged sponsor bounties (e.g. Kuru, Agora, MetaMask plugin → Onchain Finance & Trading), does the project also have to be submitted in *that* track, or are bounties evaluated independently of the main track? A note will be added to this file once the platform clarifies. This uncertainty has been reflected in the plan: no effort was allocated to track-incompatible bounties; only those tagged "All tracks" or with a natural track fit were planned.

---

## 2. Tier S — Firm Targets (natural part of the architecture)

| # | Bounty | Sponsor | Amount | Track | How to win | Responsible component | Status |
|---|---|---|---|---|---|---|---|
| 1 | Main track prize | Monad Foundation | $30,000 | Trust/Identity/AI | Product completeness + demo quality | Whole project | 🔶 In progress — three winners at $10,000. The product works live (`verify:demo` 20 of 20 on 2026-10-08); the demo story cannot be shown on the sites yet (M1, M2, M3). The page scores developer docs and traction (40%) and market readiness (25%): H9, H11. It is for a primitive others build on, not a consumer product |
| 2 | Best use of Nansen | Nansen AI | $5,000 (pool) | All tracks | The `reputation.ts` detector performs address segmentation via the Nansen API/CLI/MCP (whale/fresh/market-maker/public figure) — the segment is shown, not a raw score | `apps/server/src/risk/detectors/reputation.ts` | 🔶 In progress — client + detector done (D-016, D-017: free-plan first-funder mode). Checked 2026-10-08: off on the live API (`nansen: false`, every answer reports `skipped`), so there is nothing to show until the key is on Render (E2). The pool is $2,000 / $1,500 / $1,000 / $500; the page wants the endpoints used named (H10) |
| 3 | Best Use of Dynamic | Dynamic | $5,000 | All tracks | Autonomous/server wallet + delegated permission model inside `agent-kit` — NOT login-only | `packages/agent-kit` | 🔶 Built, not yet usable by a judge (the page: "App must be deployed and usable/demoable by judges"; bonus for "agent wallets + delegated access"; today it is CLI only: H6, E4) — the agent's wallet is a Dynamic server wallet (MPC, two of two). It is the PaymentGuard vault's authorised agent on testnet and has paid a merchant through `baret pay`, with every transaction cleared by Baret before Dynamic signs (D-019, D-022). Left for the submission: show it on `/agents` and in the demo video |
| 4 | Best Mera-Powered UX on Monad | Monad Foundation | $2,500 | All tracks | `apps/wallet` is entirely a Mera passkey account layer — no seed phrase | `apps/wallet` | 🔶 In progress — `packages/wallet-core`: the account is a Mera passkey account and every signature goes through Baret; checked on testnet (D-023). Left: wire it into the wallet screens. **Live since 2026-10-09 (E3, E4):** one passkey prompt makes the account, the session signs without further prompts until it locks, and with storage cleared the same passkey restores the same address, vault and merchants; checked on the live URL with a virtual passkey. Left: a real passkey provider and a second device (H10), the screens' polish (M6). The page also requires one-prompt onboarding, prompt-free signing in a scoped session and the stateless test (H10). Entered with `apps/wallet` only, not the extension |
| 5 | Mera: One Passkey, Many Keys | Monad Foundation | $2,500 | All tracks | PaymentGuard's agent signer comes from a Mera PRF-derived sub-key (non-wallet, creative use) | `apps/wallet` + `contracts/PaymentGuard.sol` | 🔶 In progress — agent keys are derived from the passkey's PRF output on their own BIP-44 branch and authorised on the owner's vault; a derived key paid a merchant and was revoked on testnet (D-023). **Rebuilt 2026-10-09 (D-032):** each agent's key now comes from its own PRF salt namespace (one passkey prompt, nothing stored), the delegation screen is live, and the same passkey reproduced the same agent key after storage was cleared; that key paid 0.25 USDC from the vault and was refused over the cap and after a pause. Still true: the key signs payments, so "non-account work" holds only in that the agent is not the wallet account. Left: the cross-device test on real devices (H10) |
| 6 | Best Integration of Cleanverse | Cleanverse | $2,000 | Trust/Identity/AI | Compliance detector: a transfer that fails CVI verification never goes through (the "remove it and the product breaks" test) | `risk/detectors/compliance.ts` | 🔶 Server side built 2026-10-08 (D-030): the compliance source reads A-Pass and the aToken policy on Monad testnet, and a transfer of aUSDC is checked on both sides, with the reason named before signing. Seen on-chain with read-only calls: aUSDC moves between two verified wallets and reverts toward an unverified one. Missing for the bounty's main ask: a Baret contract that moves a compliant asset; it needs an A-Pass for the contract and the sponsor's integration guides. Live check 2026-10-08: both `verify:demo` scenarios agree (verified wallet Safe, no credential Blocked). Not on any screen yet (H7). The page gives priority to identity "structurally coupled to asset movement" and requires a demo video (up to 5 min). **Contract built 2026-10-09 (D-034):** `CompliantPaymentGuard` at `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c`, source verified: an agent pays in aUSDC only when payer and payee both hold an active A-Pass, checked on-chain before the transfer; a fork test against Cleanverse's real contracts passes. Left for a real settlement: an A-Pass for the owner wallet, aUSDC in it, the guard on the server's known-contracts list |
| 7 | Best Use of Envio | Envio | $1,000 | All tracks | PaymentGuard + ReputationRegistry events are indexed with HyperIndex and feed the audit dashboard | `indexer/` | 🔶 Backend done, no screen reads it yet (the page: "A frontend, dashboard, agent, bot or API that consumes that data"; H5, H6) — a hosted HyperIndex v3 indexer follows every PaymentGuard vault (the factory registers new ones), each agent payment and the reputation registry on Monad testnet; the server serves it at `/v1/audit/*` for the wallet's history and delegation screens (D-024). Verified against the full on-chain history. Left for the submission: the history screens reading it |
| 8 | Best Projects using Alchemy | Alchemy | $1,000 credits | All tracks | RPC + `debug_traceCall` + Smart Wallets SDK (gas sponsorship) + webhook monitoring + Alchemy CLI in the dev workflow | `apps/server/src/infra/`, agent gas sponsorship | 🔶 In progress — every read goes through the Alchemy Monad RPC (batched); traces through the public RPC because Alchemy's free tier has no `debug_traceCall`. Checked 2026-10-08: live answers report `alchemy: ok`; this meets the page's text ("at least one Alchemy service/tool"); webhooks and gas sponsorship are not planned |
| 9 | Best Community Team Project | Monad Foundation | $5,000 | All tracks | No extra work — verify "community supporter" status on the platform | — | ⬜ Not done — the page: every member names the campus group in the platform profile, and the group must be on the onboarded list (H2) |

**Tier S total potential (excluding the main track): ~$24,000**

---

## 3. Tier A — If Capacity Remains (medium effort, low overlap, good narrative)

| # | Bounty | Sponsor | Amount | Track | How to win | Responsible component | Status |
|---|---|---|---|---|---|---|---|
| 10 | Best workflow with CRE | Chainlink | $3,000 | All tracks | "Reputation oracle" workflow: external threat-intelligence API → CRE → verified write to `ReputationRegistry.sol`. Even a simulation recording can be acceptable at a hackathon | `workflows/reputation-oracle`, `contracts/src/ReputationOracleReceiver.sol`, `contracts/src/ReputationRegistry.sol` | ✅ Built and simulated 2026-10-07 (D-026). `cre workflow simulate --broadcast` on Monad testnet fetched the ScamSniffer feed (2,530 addresses), read the chain and wrote ten entries through the mock forwarder and `ReputationOracleReceiver` (`0x7105Fb53bA2a9d96c4587280F2696438Aca51d9d`) into the live registry: tx `0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8`. The live API then answered `blocked` / `KNOWN_MALICIOUS_ADDRESS` (`SCAMSNIFFER_BLACKLIST`) for a transfer to one of them. Not deployed to a DON: needs CRE Early Access. The page accepts a simulation and requires a demo video of it (up to 2 min): H13 |
| 11 | Best Builds with Qwen 3.8 Max | Alibaba Cloud | $5,000 credits | Trust/Identity/AI | An "adversarial CFO agent" layer in `agent-kit` — before the agent signs, Qwen evaluates the pending tx against policy+context and can veto it | `packages/agent-kit` (reviewer hook) | 🔶 Back in 2026-10-08 (D-031), owner Meriç (M5), article by Hale (H12); dropped again if a real multi-step run is not working by Sat 10 Oct, 20:00. The prize is "split across the top 3 Track 4 winners". State before: dropped (D-029): the page asks for agentic use and a published article, the provider wants payment details for a key, the prize is credits split three ways. A one-call reviewer with veto exists in `agent-kit` (D-028), unit tested with stubbed answers, never run against Qwen. Not submitted |
| 12 | Best Agent Wallet Plugin | Metamask | $2,500 | Onchain Finance & Trading | The Baret guard/policy engine is packaged as a MetaMask Agent Wallet plugin manifest | `packages/metamask-plugin` | ✅ Built and checked 2026-10-07 with a real Agent Wallet (CLI 7.0.0, server wallet `0x87b89397236c7956c87e01f7832ed3b586653226`, Guard mode) on Monad testnet (D-027): `mm baret check` answered `safe` for a plain transfer and `blocked` / `KNOWN_MALICIOUS_ADDRESS` for an address the CRE workflow wrote to the registry; `mm baret send` refused the flagged address (`BARET_BLOCKED`) and an unreachable Baret (`BARET_NO_VERDICT`) without calling the wallet, and handed the safe transfer to the wallet. Not shown: a confirmed send, because the Agent Wallet does not send on chain 10143 (its own `send-transaction` fails the same way). Not published to npm. **Not selected on the project (2026-10-09), not entered** |
| 13 | Best Builds Powered by KIMI | Kimi (Moonshot AI) | $3,000 credits | All tracks | LLM layer that explains risk findings in plain language (`baret_explain` MCP tool / popup text) | `apps/server/src/mcp/`, extension popup | 🔶 Back in 2026-10-08 (D-031), owner Meriç (M4), key on Render by Ezgin (E7), **published article required** (H12). Credits split across ten teams. State before: dropped (D-029): no key without payment details, prize is credits. `POST /v1/explain` exists (D-028) and answers 503 without `KIMI_API_KEY`; unit tested with stubbed answers, never run against KIMI. Not submitted |
| 14 | Best Analytics / Risk Tool | Perpl | $3,000 | Onchain Finance & Trading | Perpl position-liquidation risk panel in the audit dashboard (optional data source) | `apps/server` audit module | ⬜ Not started |

---

## 4. Explicitly Skipped (and why)

| Bounty | Sponsor | Why it is skipped |
|---|---|---|
| Best Cross-Border Payments App | Agora | Completely different product shape (mobile payments app); Baret is a security layer |
| Best Mobile Trading App | Agora | Same reason — we are not a mobile trading app |
| Build the Next Consumer Trading App on Kuru | Kuru | Wants a trading interface built; Baret is not a trading product |
| Bring New Assets and Markets to Kuru | Kuru | Same reason |
| Best use of Perpl's API (trading bot) | Perpl | Building a trading bot is a separate product — out of scope |
| Bring Any-Chain Liquidity (Aurora Intents) | Aurora | Interesting but only an indirect contribution to the core thesis; if time remains it can be evaluated as a 1-week stretch as "fund the guarded wallet from any chain", no guarantee |
| Best Builds with Hunyuan | Tencent | Wrong track (Social/Culture), wants a multimodal experience |
| Privy! | Privy | Shares the same slot (wallet/onboarding SDK) as Dynamic; integrating both deeply is wasted effort and blurs the narrative — Dynamic was chosen |

---

## 5. Submission Requirements Per Bounty (general, to be refined per sponsor)

**Confirmed from the pages on 2026-10-09; the full text per prize is `docs/QA_AND_DELIVERY.md` §8.1.** For the track: a logo (max 3 MB), the public repository, a technical demo video (max 3 min, the live product), a pitch video (max 2 min), a live link with access instructions for judges. Per sponsor: a written answer to the page's own question; a required demo video for Cleanverse (max 5 min) and Chainlink CRE (max 2 min); an optional two-minute video for Envio, Dynamic, Alchemy, Nansen and both Mera prizes; a published article for KIMI and for Qwen; the campus group in every profile for the community prize. The earlier general list:
- [ ] Public repository (this repo)
- [ ] Technical demo (feature-based, short)
- [ ] Pitch video
- [ ] Live link (if possible)
- [ ] Sponsor-specific fields (to be filled in on the submission form — each sponsor bounty may have its own "review criteria" list, to be checked one by one in weeks 5-6)

---

## 6. Update Rule

The **Status** column of every row in this file takes one of these values: `⬜ Not started`, `🔶 In progress`, `✅ Done`, `❌ Dropped (reason must be added)`. When a bounty's scope/status changes, this table is updated and, if needed, a short note is added to `DECISIONS.md`.
