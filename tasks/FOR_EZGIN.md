# Tasks for Ezgin

> Work left by Meriç (frontend + QA) for Ezgin (backend + contracts + system). Format and rules: `CLAUDE.md` → "Task handoff". New tasks are added at the top. Bugs start with 🐛.

## Open

- [ ] **Read the reference repo review** — `docs/REFERENCE_REPOS.md` (comparison of the 5 old repos). Especially §3 "repeated mistakes" and the §4.1 backend/contract part. `PaymentGuard.sol` from Baret-EVM is the closest starting point, but the agent allowlist, a truly rolling window, SafeERC20 and the withdraw reserve must be added. Left by: Meriç · Date: 2026-09-15
- [ ] **Dead code ban** — Every finding code defined in the new server must be emitted by a detector, and every `GuardPolicy` field must be read by the engine (the old repos had 11–18 dead codes/fields). Meriç will test this; while defining them, keep the list in sync with `docs/ARCHITECTURE.md` §6–§7. Left by: Meriç · Date: 2026-09-15

- [ ] **Week 1 skeleton** — pnpm workspace (`apps/`, `packages/`, `contracts/`, `workflows/`, `indexer/`) + empty Fastify app in `apps/server` + `/health` endpoint. This is needed first so that Meriç can wire up the showcase/extension. See `docs/ROADMAP.md` Week 1. Left by: Meriç · Date: 2026-09-15
- [ ] **PaymentGuard.sol** — Write it according to the spec in `docs/CONTRACTS.md` §2, Foundry tests (cap overflow, pay reverts after revoke, withdraw reserve) + Monad testnet deploy, write the address into `docs/CONTRACTS.md` §2.6. Meriç will test via `cast call` and the UI after deploy. Left by: Meriç · Date: 2026-09-15
- [ ] **`/v1/analyze` contract** — Publish the request/response schema (Zod) and the `GuardPolicy` type early inside `packages/guard` so that the extension/showcase can connect without mocks. The schema must match `docs/ARCHITECTURE.md` §5 and §7. Left by: Meriç · Date: 2026-09-15
- [ ] **AK-3 decision** — ethers or viem? Write it into `docs/DECISIONS.md` as D-011; the frontend packages will use the same library. Left by: Meriç · Date: 2026-09-15

## Done

_(none yet)_
