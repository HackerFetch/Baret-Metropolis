# Baret — 6-Week Roadmap

> This file is a **live checklist**. At the end of every week the boxes are ticked, and slips/delays are written into the "Notes" line. The status table in `README.md` is kept in sync with this file.

Last updated: 2026-09-13 · Currently: **Week 0 (planning)**

---

## Week 0 — Planning (completed: 2026-09-13)
- [x] The two old repos (Baret-Stellar, Baret-EVM) reviewed at code level
- [x] Bounties/Resources/Notes analyzed
- [x] Track selected: Trust, Identity & AI Infrastructure
- [x] Document set created (these files)

---

## Week 1 — Foundation + Decisions
- [ ] New git repo created (clean history, commits starting today)
- [ ] pnpm workspace skeleton (`apps/`, `packages/`, `contracts/`, `workflows/`, `indexer/`)
- [ ] Monad testnet RPC (Alchemy) + sponsor perks claimed (Tenderly, QuickNode, Zerion) — see `RESOURCES.md` §1
- [ ] `contracts/PaymentGuard.sol` written, tested, deployed to Monad testnet — `CONTRACTS.md` §2.6 filled in
- [ ] **Milestone demo:** catch and block a single risky transaction end to end (CLI level is enough)

**Notes:** _(to be filled in)_

---

## Week 2 — Core Analysis Engine
- [ ] `apps/server`: decode → simulate (`debug_traceCall`) → basic detectors (approvals, programs, evm-danger, simulation)
- [ ] Policy engine (first 8-10 rules) + `STRICT/BALANCED/PERMISSIVE` templates
- [ ] `packages/guard` SDK (TransactionGuard.evaluate)
- [ ] `apps/showcase`: at least 2 threat scenarios (with safe/danger variants, new Monad-themed names)
- [ ] **Milestone demo:** live analysis through the showcase, demonstrable in the browser

**Notes:** _(to be filled in)_

---

## Week 3 — Tier S Integrations (1/2)
- [ ] Nansen: `reputation.ts` connected to the real API, producing segment-based findings
- [ ] Envio: `indexer/` set up, PaymentGuard events being indexed, `/v1/audit/*` fed from here
- [ ] Alchemy: `debug_traceCall` + webhook monitoring + gas sponsorship POC with the Smart Wallets SDK
- [ ] Cleanverse: `compliance.ts` detector + at least one gated demo scenario

**Notes:** _(to be filled in)_

---

## Week 4 — Tier S Integrations (2/2)
- [ ] Mera: `apps/wallet` moved to the passkey account layer (no seed phrase)
- [ ] Mera PRF sub-key → PaymentGuard agent signer flow working
- [ ] Dynamic: `packages/agent-kit` autonomous/server wallet + delegation
- [ ] `apps/extension`: x402 interceptor finished, the 4 scenarios in `X402_FACILITATOR.md` §5 tested
- [ ] Best Community Team Project eligibility verified

**Notes:** _(to be filled in)_

---

## Week 5 — Tier A Stretch + Hardening
- [ ] Capacity permitting: Chainlink CRE reputation-oracle workflow (at least a simulation record)
- [ ] Capacity permitting: Qwen adversarial reviewer
- [ ] Capacity permitting: MetaMask Agent Wallet plugin package
- [ ] Capacity permitting: KIMI explanation layer (`baret_explain`)
- [ ] Security: apply our own risk model to our own contract, `CONTRACTS.md` §6 checklist passed
- [ ] Real user test: showcase shown to at least 1 person, observed where they got stuck

**Notes:** _(to be filled in)_

---

## Week 6 — Polish + Delivery
- [ ] README/ARCHITECTURE finalized (in sync with code)
- [ ] Demo video recorded (magic moment in the first 30 seconds — `PROJECT_OVERVIEW.md` §7)
- [ ] Pitch video recorded
- [ ] Live link online (server + showcase)
- [ ] Sponsor-specific submission fields filled in for every targeted bounty — `BOUNTIES_AND_TRACKS.md` §5
- [ ] Status column of every row in `BOUNTIES_AND_TRACKS.md` up to date
- [ ] Final mentor update sent

**Notes:** _(to be filled in)_

---

## Cut Rule (if time runs short)

Priority order (see `BOUNTIES_AND_TRACKS.md`): Main track + Nansen + Mera + Envio + Cleanverse + Alchemy are **never dropped**. First all of Tier A is cut, then if necessary Dynamic's scope is reduced (down to the minimum "beyond login" integration in agent-kit only).
