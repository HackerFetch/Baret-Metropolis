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

---

## Open Decisions (not yet taken — to be filled in as we progress)

| # | Topic | Where it has impact | Decision date |
|---|---|---|---|
| AK-1 | Will we write our own x402 facilitator or use a standard one? | `X402_FACILITATOR.md` §4.4 | To be settled in Week 4 |
| AK-2 | Name of the x402 demo scenario (replacing the old "scrybe") | `X402_FACILITATOR.md` §6, `apps/showcase` | Week 2 |
| AK-3 | RPC client: ethers.js or viem? | `ARCHITECTURE.md` §3 | Week 1 |
| AK-4 | Is an additional "gated asset" demo contract needed on the Baret side for Cleanverse? | `CONTRACTS.md` §4 | Week 3 |
| AK-6 | Whether a separate track submission is required to win the track-tagged bounties (Kuru/Agora/MetaMask plugin) | `BOUNTIES_AND_TRACKS.md` §1 | When the platform clarifies |
| AK-7 | Best Community Team Project eligibility — confirmation of "community supporter" status | `BOUNTIES_AND_TRACKS.md` §2 row 9 | Week 4 |
| AK-8 | `BRAND.md` content — name/wordmark, tone, color-neutral visual language principles (Security + Build theme) | `BRAND.md` (does not exist yet) | To be written once the user gives direction |

**Note (AK-5, resolved):** Showcase site names are not being renamed with a Monad theme; the original names are kept — see D-010.

**Rule:** When an open decision is settled, it is removed from this table, added above as a numbered D-XXX entry, and the other files it affects (`ARCHITECTURE.md`, `CONTRACTS.md`, etc.) are updated at the same time.
