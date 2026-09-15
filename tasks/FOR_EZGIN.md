# Tasks for Ezgin

> Work left by Meriç (frontend + QA) for Ezgin (backend + contracts + system). Format and rules: `CLAUDE.md` → "Task handoff". New tasks are added at the top. Bugs start with 🐛.

## Open

- [ ] **Route registry is the contract for links** — `packages/routes` holds the shared `RouteDef` type and the checks. Each surface declares its paths once in its own `routes.ts`: `apps/showcase/src/routes.ts`, `apps/wallet/src/routes.ts`, `apps/extension/src/entrypoints/options/routes.ts`. If the server ever returns a link for the client to follow, return a route key and the parameters, not a path. A test asserts every href in `@baret/content` resolves to a real route. Left by: Meric . Date: 2026-09-15
- [ ] **Finding codes are a contract now** — `packages/content/src/shared/findings.content.ts` has one entry per risk finding code, with the sentence the user reads. The server returns the `code` plus the values to interpolate ({spender}, {amount}, {asset}, {contract}, {origin}, {cap}, {limit}, {country}, {tier}), never a sentence. If you add a detector, add its entry here in the same PR or the popup renders a blank finding. Current list is in that file and matches `docs/ARCHITECTURE.md` section 6. Left by: Meric . Date: 2026-09-15
- [ ] **Policy field names are a contract too** — `packages/content/src/shared/policy.content.ts` has a label and a plain-language hint for every `GuardPolicy` field. The keys must match the Zod schema in `packages/guard` exactly, or the editor shows an empty row. Left by: Meric . Date: 2026-09-15
- [ ] **Workspace root files** — I added a minimal `pnpm-workspace.yaml` (apps/*, packages/*) so `packages/content` resolves. Extend it with the root `package.json`, `tsconfig.base.json` and the pnpm version pin when you build the Week 1 skeleton. Do not remove the two globs. Left by: Meric . Date: 2026-09-15
- [ ] **Copy lives in @baret/content** — every user-facing string for the showcase, wallet and extension is in `packages/content/src`, one file per page, 44 files. The server must not hardcode a user-facing sentence. For risk findings, return the finding `code` and the values to interpolate; the client renders the sentence from `shared/findings.content.ts`. Keep the code list in sync with `docs/ARCHITECTURE.md` section 6. Left by: Meric . Date: 2026-09-15
- [ ] **Read the reference repo review** — `docs/REFERENCE_REPOS.md` (comparison of the 5 old repos). Especially §3 "repeated mistakes" and the §4.1 backend/contract part. `PaymentGuard.sol` from Baret-EVM is the closest starting point, but the agent allowlist, a truly rolling window, SafeERC20 and the withdraw reserve must be added. Left by: Meriç · Date: 2026-09-15
- [ ] **Dead code ban** — Every finding code defined in the new server must be emitted by a detector, and every `GuardPolicy` field must be read by the engine (the old repos had 11–18 dead codes/fields). Meriç will test this; while defining them, keep the list in sync with `docs/ARCHITECTURE.md` §6–§7. Left by: Meriç · Date: 2026-09-15

- [ ] **Week 1 skeleton** — pnpm workspace (`apps/`, `packages/`, `contracts/`, `workflows/`, `indexer/`) + empty Fastify app in `apps/server` + `/health` endpoint. This is needed first so that Meriç can wire up the showcase/extension. See `docs/ROADMAP.md` Week 1. Left by: Meriç · Date: 2026-09-15
- [ ] **PaymentGuard.sol** — Write it according to the spec in `docs/CONTRACTS.md` §2, Foundry tests (cap overflow, pay reverts after revoke, withdraw reserve) + Monad testnet deploy, write the address into `docs/CONTRACTS.md` §2.6. Meriç will test via `cast call` and the UI after deploy. Left by: Meriç · Date: 2026-09-15
- [ ] **`/v1/analyze` contract** — Publish the request/response schema (Zod) and the `GuardPolicy` type early inside `packages/guard` so that the extension/showcase can connect without mocks. The schema must match `docs/ARCHITECTURE.md` §5 and §7. Left by: Meriç · Date: 2026-09-15
- [ ] **AK-3 decision** — ethers or viem? Write it into `docs/DECISIONS.md` as D-011; the frontend packages will use the same library. Left by: Meriç · Date: 2026-09-15

## Done

_(none yet)_
