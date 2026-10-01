# Baret — Track & Bounty Strategy

> This file is the single authority on "what we target and why / what we do not target". When a scope debate comes up, check here first. The Status columns must be updated as work progresses.

Last updated: 2026-09-13 · Source: `Bounties.txt` (tracks & bounties list pulled from the platform as of 2026-09-13)

---

## 1. Track Selection

**Selected main track: Trust, Identity & AI Infrastructure — $30,000**

**Rationale:** Baret fits the definition "Protocol-level primitives for trust, provenance, and user-owned data that make AI genuinely useful without any single platform capturing the value" one-to-one. Agent guard, policy-bound/time-limited/revocable delegation, x402 firewall, on-chain reputation registry — all of these are the core theme of this track. Since the competitor pool in the other tracks will probably be more "product"-heavy, Baret differentiates more clearly here as infrastructure.

**Alternatives evaluated and rejected:**
- *Consumer Products & Payments* — Baret is not a consumer financial product but a security layer; forcing it in blurs the positioning.
- *Onchain Finance & Trading* — Baret is not a trading interface; even though the MetaMask plugin bounty lives in this track, moving the project's identity there would be wrong.

> **Open question that needs verification:** To win track-tagged sponsor bounties (e.g. Kuru, Agora, MetaMask plugin → Onchain Finance & Trading), does the project also have to be submitted in *that* track, or are bounties evaluated independently of the main track? A note will be added to this file once the platform clarifies. This uncertainty has been reflected in the plan: no effort was allocated to track-incompatible bounties; only those tagged "All tracks" or with a natural track fit were planned.

---

## 2. Tier S — Firm Targets (natural part of the architecture)

| # | Bounty | Sponsor | Amount | Track | How to win | Responsible component | Status |
|---|---|---|---|---|---|---|---|
| 1 | Main track prize | Monad Foundation | $30,000 | Trust/Identity/AI | Product completeness + demo quality | Whole project | ⬜ Not started |
| 2 | Best use of Nansen | Nansen AI | $5,000 (pool) | All tracks | The `reputation.ts` detector performs address segmentation via the Nansen API/CLI/MCP (whale/fresh/market-maker/public figure) — the segment is shown, not a raw score | `apps/server/src/risk/detectors/reputation.ts` | ⬜ Not started |
| 3 | Best Use of Dynamic | Dynamic | $5,000 | All tracks | Autonomous/server wallet + delegated permission model inside `agent-kit` — NOT login-only | `packages/agent-kit` | ⬜ Not started |
| 4 | Best Mera-Powered UX on Monad | Monad Foundation | $2,500 | All tracks | `apps/wallet` is entirely a Mera passkey account layer — no seed phrase | `apps/wallet` | ⬜ Not started |
| 5 | Mera: One Passkey, Many Keys | Monad Foundation | $2,500 | All tracks | PaymentGuard's agent signer comes from a Mera PRF-derived sub-key (non-wallet, creative use) | `apps/wallet` + `contracts/PaymentGuard.sol` | ⬜ Not started |
| 6 | Best Integration of Cleanverse | Cleanverse | $2,000 | Trust/Identity/AI | Compliance detector: a transfer that fails CVI verification never goes through (the "remove it and the product breaks" test) | `risk/detectors/compliance.ts` | ⬜ Not started |
| 7 | Best Use of Envio | Envio | $1,000 | All tracks | PaymentGuard + ReputationRegistry events are indexed with HyperIndex and feed the audit dashboard | `indexer/` | ⬜ Not started |
| 8 | Best Projects using Alchemy | Alchemy | $1,000 credits | All tracks | RPC + `debug_traceCall` + Smart Wallets SDK (gas sponsorship) + webhook monitoring + Alchemy CLI in the dev workflow | `apps/server/src/infra/`, agent gas sponsorship | ⬜ Not started |
| 9 | Best Community Team Project | Monad Foundation | $5,000 | All tracks | No extra work — verify "community supporter" status on the platform | — | ⬜ Not verified |

**Tier S total potential (excluding the main track): ~$24,000**

---

## 3. Tier A — If Capacity Remains (medium effort, low overlap, good narrative)

| # | Bounty | Sponsor | Amount | Track | How to win | Responsible component | Status |
|---|---|---|---|---|---|---|---|
| 10 | Best workflow with CRE | Chainlink | $3,000 | All tracks | "Reputation oracle" workflow: external threat-intelligence API → CRE → verified write to `ReputationRegistry.sol`. Even a simulation recording can be acceptable at a hackathon | `workflows/reputation-oracle`, `contracts/ReputationRegistry.sol` | ⬜ Not started |
| 11 | Best Builds with Qwen 3.8 Max | Alibaba Cloud | $5,000 credits | Trust/Identity/AI | An "adversarial CFO agent" layer in `agent-kit` — before the agent signs, Qwen evaluates the pending tx against policy+context and can veto it | `packages/agent-kit` (reviewer hook) | ⬜ Not started |
| 12 | Best Agent Wallet Plugin | Metamask | $2,500 | Onchain Finance & Trading | The Baret guard/policy engine is packaged as a MetaMask Agent Wallet plugin manifest | `packages/metamask-plugin` | ⬜ Not started |
| 13 | Best Builds Powered by KIMI | Kimi (Moonshot AI) | $3,000 credits | All tracks | LLM layer that explains risk findings in plain language (`baret_explain` MCP tool / popup text) | `apps/server/src/mcp/`, extension popup | ⬜ Not started |
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

General principle (generalized from the Aurora example; each sponsor publishes its own criteria — must be confirmed on the platform):
- [ ] Public repository (this repo)
- [ ] Technical demo (feature-based, short)
- [ ] Pitch video
- [ ] Live link (if possible)
- [ ] Sponsor-specific fields (to be filled in on the submission form — each sponsor bounty may have its own "review criteria" list, to be checked one by one in weeks 5-6)

---

## 6. Update Rule

The **Status** column of every row in this file takes one of these values: `⬜ Not started`, `🔶 In progress`, `✅ Done`, `❌ Dropped (reason must be added)`. When a bounty's scope/status changes, this table is updated and, if needed, a short note is added to `DECISIONS.md`.
