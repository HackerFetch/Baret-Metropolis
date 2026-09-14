# Baret — Reference Repos (5 Older Versions) Comparative Review

> Code-level review of the five older Baret versions that sit locally under `baret-repos/` (gitignored, never committed). Goal: know what we will reuse in the Monad rewrite and what we will definitely not repeat. Every repo was read in full (source files, tests, contracts, git history). All were written by Ezgin (GitHub `Aeztrest`).

Last updated: 2026-09-15 · Reviewed by: Meriç + Claude

---

## 0. At a Glance

| | Baret-EVM | Baret-Stellar | CasperBaret | Baret-Midnight | Baret-OKX |
|---|---|---|---|---|---|
| **Chain** | EVM, all defaults **Monad testnet 10143** | Stellar testnet (Soroban) | Casper testnet | Midnight preprod (ZK) | Multi-chain calldata analysis; x402 service for the OKX.AI agent marketplace |
| **Dates** | 16–20 Jul 2026 | 3 Jun – 17 Aug 2026 | 13 Jun – 27 Jul 2026 | 28 Aug 2026 (single day) | 16–28 Jul 2026 |
| **Commits / files** | 34 / 284 | 48 / 530 | 98 / 310 | 13 / 89 | 23 / 33 |
| **Maturity** | Medium — real simulation exists, extension was live-tested | **Most mature** — the most tests, CI, real x402 settlement, on-chain sub-key policy | Medium — x402 is real, no simulation | Prototype — nothing went on-chain | Small but clean microservice, real x402 payment |
| **Real simulation** | ✅ `eth_call` + `debug_traceCall` | ✅ Horizon + Soroban preflight | ❌ 4 heuristics | ❌ inputs are supplied externally | ❌ only `getCode` + `getBalance` |
| **Detectors (code that actually shipped)** | 22 | ~16 | 10 | 8 | 10 |
| **Policy templates** | Strict/Balanced/Permissive | Strict/Balanced/Permissive (+dead DSL) | Strict/Balanced/Permissive | None (cap only) | Strict/Balanced/Permissive (threshold+ignore) |
| **Contract** | `PaymentGuard.sol` — **deployed on Monad testnet** | `MerchantSpendPolicy` (Soroban, co-signer policy) + old `PaymentGuard` | `PaymentGuard` + `Cep18x402` (Odra/Rust), deployed | `merchant-spend-policy.compact` — not deployed | None |
| **Extension** | ✅ MV3, EIP-1193/6963, x402 interceptor | ✅ MV3, most advanced (sub-key, mandate, drift) | ✅ MV3, Casper | ✅ MV3, Lace proxy (two bugs) | None |
| **Showcase 6 sites** | ✅ ported from Stellar | ✅ original | ✅ | 5 different names | Landing page |
| **agent-kit / CLI** | `GuardedWallet` + `premon` CLI (exit 2 = block) | `AgentWallet` + `baret` CLI (exit 1 = block) + attestation | None (MCP agent exists) | None | None (MCP tool exists) |
| **Tests** | server 20+, guard 3, agent-kit 4, forge 11 | **~215 vitest + 40 Rust**, CI 3 jobs | Few, no CI | 22 vitest, CI does not run tests | 39 vitest, CI exists |
| **Biggest known gap** | Extension bypasses the block via "Sign anyway"; deltas come from calldata, not from the trace | 11 finding codes are never emitted; analyzer URL hardcoded to localhost | No simulation, 18 policy fields are no-ops | Extension cannot decode the real Lace payload | Unknown network silently falls back |

---

## 1. Lineage (which one derived from which)

```
"DeltaGuard" / "Blackthorn"  (Solana, Swig sub-key)   ← no code, only traces (DELTAG_* env, cpi.ts, blackthron_docs)
        │
        ├──► Baret-Stellar   (3 Jun → 17 Aug)  longest-lived, most mature; WALLET.md/FRONTEND.md were adapted from here
        │        │
        │        ├──► CasperBaret    (13 Jun → 27 Jul)  ported from the Stellar-shaped ext-protocol
        │        │
        │        └──► Baret-EVM      (16 → 20 Jul)  "Premon" brand, Monad testnet by default
        │                 │
        │                 └──► Baret-OKX  (16 → 28 Jul)  single-service version of the EVM analysis ("Vetra" → Baret)
        │
        └──► Baret-Midnight  (28 Aug)  showcase shape from Stellar, code from scratch, ZK/Compact
```

**Important:** Baret-EVM already targets Monad. `PaymentGuard.sol` is deployed on Monad testnet at `0x1e09E971c53bD59e481Ef02147C6CeeBf0B09717` (USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3`). This is the closest starting point for the new project — but the git history will not be carried over; the code will be written from scratch (D-001).

---

## 2. Repo Cards

### 2.1 Baret-EVM ("Premon") — closest relative

- **Structure:** pnpm monorepo. `apps/server` (Fastify 5 + ethers 6 + zod), `apps/extension` (MV3, ~8.8k lines), `apps/wallet` (plaintext localStorage key — demo), `apps/showcase`, `packages/guard`, `packages/agent-kit`, `packages/wallet-adapter`, `packages/ext-protocol`, `packages/ui`, `packages/showcase-ui`, `contracts/` (Foundry).
- **Pipeline:** decode (`ethers.Transaction.from` or `{from,to,value,data}`) → address collection (ABI decode: transfer/transferFrom/approve/permit/setApprovalForAll/safeTransferFrom/transferOwnership) → parallel `eth_getBalance`/`eth_getCode`/`balanceOf`/`eth_call`/`eth_estimateGas`/`debug_traceCall` → delta projection from calldata → 9 detectors → fail-closed policy → recommendations → in-memory audit.
- **Detectors:** simulation, programs, cpi (trace depth), reputation (2 seed addresses), compute (gas), approvals, evm-danger (SELFDESTRUCT critical, DELEGATECALL, OWNERSHIP_TRANSFER, PERMIT, NATIVE_TRANSFER_TO_CONTRACT), x402. In the policy engine: `LOSS_PERCENT_UNAVAILABLE`, `ESTIMATED_LOSS_EXCEEDS_MAX`, `POST_BALANCE_TOO_LOW`.
- **API:** `/health`, `/health/ready`, `/v1/analyze`, `/v1/analyze/batch` (≤25), `/v1/analyze/stream` (SSE), `/v1/replay`, `/v1/audit/*`, `/mcp/tools|call` (not a real MCP transport, plain JSON), `/demo/scrybe` (returns 402 but does **not verify** the header), `/demo/novaswap/*` (real MON↔USDC swap vault).
- **Contract:** `PaymentGuard.sol` — single owner, single token, per-merchant `capPerTx/capPerDay`, Active/Paused/Revoked, its own reentrancy lock, 10 tests + 1 fuzz. **Gaps:** anyone can call `pay()` (no agent allowlist), the window is not truly rolling (fixed start + 24h), non-standard ERC-20s revert, no app calls the contract.
- **Extension:** EIP-1193 + EIP-6963 (`rdns dev.premon.wallet`), PBKDF2 100k + AES-GCM, IndexedDB + storage.local fallback, BIP-44, 15 min idle lock, popup window anchoring, x402 fetch interceptor (live-tested), 9-step x402 review pipeline, native balance drift monitor (12 s polling). **The block decision is not binding** ("Sign anyway" button). x402 auto-approve signs without going through analysis. Analyzer URL + `dev-key-change-me` API key hardcoded.
- **Showcase scenarios:** NovaSwap (unlimited approve), PixelDrop (setApprovalForAll), OrbitYield (100 MON deposit → loss %), ClaimHub (9.9 MON → "malicious" address — **but the seed address does not match, bug**), LaunchPad (500 MON → revert), Scrybe (x402).
- **agent-kit:** `GuardedWallet.sendTransaction()` → evaluate → `GuardBlockedError` → ethers Wallet. CLI `premon address|analyze|send|policy`, exit 0/2/1. `evaluate()` drops the gas fields → the gas detectors never run for the agent.
- **Naming debt:** `@premon/*`, `DELTAG_*`, `cpi.ts` (Solana), `assetIssuer`/`signedTxXdr` (Stellar), "any EVM chain" copy.

### 2.2 Baret-Stellar — most mature, source of the UI/spec

- **Structure:** `apps/server`, `apps/extension`, `apps/showcase`, `apps/wallet` (vestigial), `packages/swig-guard`, `packages/agent-guard`, `packages/baret-adapter`, `packages/ext-protocol`, `packages/ui` (oklch tokens + shadcn + Baret primitives), `packages/showcase-ui`, `contracts/` (2 Soroban contracts), `docs/` (3,462 lines of spec), `baret_docs/` (stale Solana-era Next.js docs site).
- **Pipeline:** XDR decode (fee-bump unwrap) → account/contract/asset collection → parallel Horizon `loadAccount` + Soroban `simulateTransaction` (auth stripped) → bigint stroop deltas (including Soroban token events) → auth tree parsing → 7 detectors → fail-closed policy → recommendations → **Ed25519 verdict attestation** → in-memory audit → response Zod validation → x402 settle.
- **x402 (real):** `/v1/analyze` paywall with `@x402/core` + `@x402/stellar`; `/demo/scrybe` calls the facilitator's `/verify` + `/settle` (payai / x402.org). The extension signs only the auth entry of the null-source SAC transfer; the facilitator fee-bumps + submits.
- **Contract `MerchantSpendPolicy`:** passkey-kit `PolicyInterface` co-signer; deny-by-default `policy__`: single context, `transfer`, `from == wallet`, per-merchant `signer` binding (`WrongSigner`), Active, expiry, per-tx, **truly rolling 24h window** (`spend_log`), TTL extension; `install/uninstall` guard. 14 tests, testnet deploy `CCWTPB4F…`. The PR #18 → #19 story matters: on the first deploy the policy had not been installed as a signer, enforcement was inert; #19 fixed it.
- **Extension (most advanced):** state machine (uninitialized/locked/ready/signing/alert), port router, PBKDF2 **600k** + iteration upgrade, attempt limiter (5 attempts → backoff), SEP-0005 HD multi-account, IndexedDB v4 (atomic allowances `tryReserveSpend/release`, nonce-guarded TOFU mandate promotion, account-scoped migration), Horizon drift monitor, Shadow-DOM "Baret is guarding" overlay, **1.5 s press-and-hold override** (block friction), Freighter-compatible inpage API, x402 9-step pipeline + sub-key provisioning (best-effort; silently skipped once the 5 min passphrase cache expires).
- **Showcase:** 6 sites + Hub + `/agents` (live playground + audit feed) + `/install` + `/docs`; honest "Send with unprotected wallet" comparison; RiskPreview / ResultOverlay / WalletModal components.
- **agent-guard:** `AgentWallet.fromSecret/random`, `evaluate/guardedSign/guardedSubmit`, `allowOffline` escape hatch, attestation verification with a pinned server key, config `~/.baret/config.json` (0600). CLI `baret analyze|sign|submit|address|init|policy list`, **exit 0 allow / 1 blocked / 2 error** — our `ARCHITECTURE.md` §8.6 follows this.
- **Gaps:** 11 finding codes (ACCOUNT_MERGE, MASTER_KEY_REMOVED, SIGNER_CHANGE…) are never emitted → 3 policy flags are dead; a single invalid seed in the reputation DB; the extension's analyzer is hardcoded to `localhost:8080`; policy DSL/profiles are never used; `LIMITATIONS.md`/`x402-defense.md` are stale; template value/field name mismatches between docs and code; wrong package name in the Dockerfile; sdk version drift.

### 2.3 CasperBaret ("Blackthorn") — x402 real, no simulation

- **Structure:** same skeleton as Stellar; `packages/casper-core`, `packages/casper-guard`, `apps/agent-mcp` (stdio MCP server + Claude demo agent), `contracts/` (Odra 2.7 Rust), `blackthron_docs/` (Solana-era Tailwind template — irrelevant), two dead packages (`blackthorn-adapter`, empty `showcase-ui`).
- **Analysis:** `parseIntent()` shallowly decodes Casper Deploy/TransactionV1 JSON → 4 pure detectors (contract exposure, allowance, transfer loss-%, x402 shape) → policy. `LIMITATIONS.md` honestly says "no simulation" but the showcase claims "25+ detectors, WebSocket monitor". `makeSpeculativeClient` exists but is never called; `monitor.ts` is a no-op.
- **x402 (real):** EIP-712 `TransferWithAuthorization` (`@casper-ecosystem/casper-eip-712`), `raw` and `casperMessage` signature schemes (for the official Casper Wallet), built-in facilitator (`/facilitate/verify|settle|supported`) submits `transfer_with_authorization` with the treasury key; the gas fee is added on top of the signed USDC amount. `X402_DEMO_MODE` fake settlement. Overclaim correction commit (`3c14e67`): the claim "x402 did not exist on Casper" was wrong; `make-software/casper-x402` already existed.
- **Contracts:** `Cep18x402` (CEP-18 + `transfer_with_authorization`, nonce replay, time window, 6 tests), `PaymentGuard` (owner+single agent slot, merchant cap, rolling 24h, 13 tests). Both deployed on Casper testnet; PaymentGuard is not wired to any app (`provision.ts` is a no-op).
- **Policy:** 30+ fields defined, the server enforces only 6 of them, the extension 8; **18 fields are silently ignored** but remain as toggles in the UI. `refuseUnlimitedAllowances` is implemented incorrectly (counts every approve as unlimited).
- **Extension:** port of Stellar's; `window.baret` + `window.CasperWalletProvider`; sign flow, keystore, session follow the same pattern; analyzer offline → `advisory` + "Sign anyway" (fail-open). API key hardcoded, committed in `vercel.json`.
- **agent-mcp:** 3 tools (`check_balance`, `list_policy`, `ask_scrybe`), cap via an in-process spend log, Anthropic tool loop demo — a compact example of a "policy-capped agent".
- **No CI**, tests are thin, `docker-compose.yml` is broken, `DELTAG_*` + `blackthorn` names in ~25 places.

### 2.4 Baret-Midnight — ZK prototype, written in a single day

- **Structure:** `packages/policy-engine` (pure detectors), `contracts/merchant-spend-policy` (Compact 0.26 + proof-free simulator + 12 tests + headless preprod deploy CLI), `apps/server` (analyze + demo facilitator), `apps/extension` (Lace proxy), `apps/showcase` (5 scenarios), `spike/` (hello-world Compact — the experiment that surfaced the ADX CPU issue).
- **Detectors:** `blind-sign` (unknown circuit → critical), `unlimited-approval`, `agentic-x402`, `policy-inactive/over-per-tx-cap/over-per-day-cap`, `balance-delta`, `contract-interactions`, `disclosure` (witness leakage), `proving-mode`. No simulation; delta/disclosure inputs are supplied externally.
- **Contract:** commitment-based authorization (`hash("baret:owner:" || sk) == commitment`), ACTIVE/PAUSED/REVOKED, per-tx + daily cap; `mandateSeconds` is stored but **not enforced**; `currentTime` is a prover-controlled witness (can be manipulated). Not deployed (faucet unreliable).
- **Extension bugs:** `knownCircuits` is never written → every call is blind-sign; caps are strings, the comparison is bigint → daily cap math is wrong. The real Lace payload cannot be decoded.
- **Lessons:** make the "what does this transaction disclose" finding first-class; model the prover/relayer as a trust boundary (the bundler/paymaster equivalent on Monad); never take time from the caller (`block.timestamp`).

### 2.5 Baret-OKX ("Vetra") — single service, clean

- **What:** x402-metered REST + MCP service for the OKX.AI Agent Service Provider (A2MCP) marketplace. The OKX API is never used; only the x402 `PaymentRequirements` format that OKX recognizes is produced. Facilitator `x402.org`. Payment **worked with real USDC** on Base Sepolia (the commit history proves it); the "TEMP" testnet setting was never reverted.
- **Chains:** Ethereum, Base, Base Sepolia, Polygon, **Monad testnet 10143** (analysis-only; x402.org does not settle on Monad).
- **Analysis:** `parseTransaction` → `getCode` + `getBalance` → wrapper unwrapping (`multicall` ×2, Safe `execTransaction`, depth 2, ≤20 inner calls) → 9-selector allowlist → 10 codes. Policy = `blockSeverity` threshold + `ignoreCodes`. **Fail-open** (continues with a low finding if the RPC goes down).
- **MCP (real SDK):** `POST /mcp` stateless Streamable HTTP; the `tools/call` body is sniffed and x402-verified before entering the transport; settle happens **after** tool success — the "verify-then-settle-after-success" discipline exists on both paths.
- **Weak:** REST body cast without Zod; unknown `network` silently falls back to the config chain; `rpcUrl` comes from the caller → SSRF; `/v1/demo-check` gives the engine away for free.
- **Quality:** ~1,100 lines of strict TS, comments that record the "why" (3 x402 spec corrections learned from failed payments: network short name + absolute resource, EIP-712 domain, Base Sepolia USDC name "USDC").

---

## 3. Mistakes Repeated Across the Five Versions (what we will not do on Monad)

1. **The "25+ detectors" claim is not true in any version** (actual: 8–22). The number in `docs/FRONTEND.md` will be kept in sync with the code.
2. **Finding codes that are defined but never emitted** and **policy fields that appear in the UI but are not enforced** (Stellar 11 codes / 3 flags, Casper 18 fields, EVM 5 codes + `refuseUnlimitedApprovals`). Rule: a code/field is either implemented or not defined. QA will test this.
3. **The block is not binding in the extension** ("Sign anyway" — EVM, Casper; Stellar has the 1.5 s press-and-hold). Monad: block = block; override only if the policy says `allowOverride`, and with double confirmation.
4. **Fail-open when the analyzer is unreachable** (EVM/Casper `advisory`, OKX low finding). `ARCHITECTURE.md` §1.2 says fail-closed; the extension must label this explicitly as "Sign without protection", but it must not be the default primary action.
5. **Hardcoded analyzer URL + `dev-key-change-me`** in every client (EVM, Stellar `localhost:8080`, Casper). Monad: build-time env, prod host in the extension's `host_permissions`.
6. **In-memory audit / reputation / replay guard** — reset on restart. D-008: Envio.
7. **Reputation DB seed is empty or invalid** (EVM 2 fake addresses, Stellar a single Solana-formatted address, OKX empty). Monad: Nansen + ReputationRegistry (real data).
8. **Contract ↔ app disconnect:** the EVM and Casper PaymentGuard were deployed but no client calls them; on Stellar the policy was not installed as a signer on the first deploy. Monad: the `apps/wallet` Agent Delegation page will actually call the contract, tested end to end (Meriç).
9. **Docs drift from the code** (stale LIMITATIONS, different template values in the docs, Solana-era docs sites). CLAUDE.md rule: code + docs together.
10. **Old names get carried over** (`DELTAG_*`, `swig`, `blackthorn`, `cpi.ts`, `signedTxXdr`). D-002.
11. **Demo scenario and detector do not match** (the EVM ClaimHub "malicious" address does not match the seed; the Stellar Soroban "safe" scenarios also return `SIMULATION_FAILED` because the fake contracts are not on-chain). Monad: showcase contracts will actually be deployed, and each scenario's expected finding code will be tested.
12. **Testnet "TEMP" setting becomes permanent** (OKX Base Sepolia). Deploy envs will be tracked in `docs/RESOURCES.md`.

---

## 4. What Gets Reused (as ideas/patterns, without copying files)

### 4.1 Backend / contract (Ezgin)
- **Server layering** (Baret-EVM): `config → domain → simulation → analysis → risk → policy → api`, `EvmRpc` interface + tests with `MockRpc`. `docs/ARCHITECTURE.md` §5 already targets this.
- **EVM decode/simulation** (Baret-EVM): `tx-decode.ts`, `abi.ts` selector set + `UNLIMITED_APPROVAL_THRESHOLD`, `account-keys.ts`, `parse-call-trace.ts` (delegatecall/selfdestruct flags, cached degrade when `debug_traceCall` is unavailable), parallel pre-state.
- **Wrapper unwrapping** (Baret-OKX): `multicall`, Uniswap V3 `multicall(uint256,bytes[])`, Safe `execTransaction` — bounded depth and inner-call count.
- **Delta extraction: redesign.** The EVM calldata projection returns empty for swap/multicall. Monad: trace/log-based (`Transfer`/`Approval` events) or state-diff; loss % should cover ERC-20 as well.
- **Policy engine** (Stellar + EVM): fail-closed `isBlocked()`, critical always blocks, bigint precision, `LOW_CONFIDENCE_INCOMPLETE_DATA` semantics; `allowWarnings` should actually govern generic medium findings (it did not in EVM).
- **x402:** OKX's stateless MCP + pre-transport verify + settle-after-tool-success pattern; Stellar's `@x402/core` Fastify adapter; Casper's EIP-712 `TransferWithAuthorization` + nonce replay contract logic (EIP-3009 on Monad). `FacilitatorClient` URL-swappable (`docs/X402_FACILITATOR.md` AK-1).
- **PaymentGuard.sol** (Baret-EVM) as the starting point, **adding** the following: `setAgentSigner/revokeAgentSigner` (spec §2.2), a truly rolling window (like Stellar's `spend_log`, or block time as in Casper), SafeERC20, active reserve on withdraw (Stellar PaymentGuard `TotalReserved`), events for Envio (spec §2.4). The `testFuzz_NeverExceedsDailyCap` fuzz invariant test pattern.
- **Verdict attestation** (Stellar): Ed25519/secp256k1-signed decision — agent-kit verifies it with a pinned key. Stretch.
- **agent-kit** (Stellar agent-guard): config layers (explicit → env → `~/.baret/config.json` 0600 → default), secret only from env, `allowOffline` as an explicit escape hatch, **exit 0/1/2**. Do not repeat EVM's "dropping the gas fields" mistake.
- **Audit:** Envio instead of in-memory (D-008); Stellar's `/v1/audit/recent|aggregate|contract/:addr` shape is kept.

### 4.2 Frontend / extension / showcase (Meriç)
- **`packages/ui`** (Stellar): oklch token system, shadcn layer, `Verdict/Meter/StatTile/CompareSplit/SpotlightCard/Reveal`, `ThemeProvider` (including the shadow host), `DangerModeToggle`. Colors will come from `BRAND.md`; the structure stays as is.
- **Extension architecture** (Stellar > EVM): 5-phase state machine, `ext-protocol` typed envelope + port router (`await ready` cold-start), popup window anchoring (EVM), PBKDF2 600k + iteration upgrade + attempt limiter + idle lock (Stellar), IndexedDB + storage.local fallback + migration, atomic allowance reservation + rolling window + TOFU mandate promotion (Stellar), x402 fetch interceptor (`PAYMENT-REQUIRED` header or body `accepts[0]`), 9-step x402 review, Shadow-DOM overlay, 1.5 s press-and-hold override.
- **Showcase** (Stellar): Hub, 6 site UIs, `RiskPreview`, `ResultOverlay`, `WalletModal` + continuous EIP-6963 listener (EVM), "send with unprotected wallet" comparison, `/agents` playground + audit feed, `/install` browser detection + zip. Only `transactions.ts` (scenario builders) and the addresses are written for EVM — `docs/FRONTEND.md` §2.3 is already adapted.
- **Wallet spec** is already in `docs/WALLET.md`; Stellar's `docs/wallet-spec.md`, `extension-architecture.md`, `policy-dsl.md`, `x402-defense.md` can be read as templates (baret-repos/Baret-Stellar/docs/).
- **From Midnight:** the `blind-sign` idea (unknown contract/selector → critical), running the engine in the browser on the `/demo` page.

### 4.3 QA (Meriç) — direct takeaways for the test plan
- At least one positive test for every finding code (dead code ban).
- For every policy field, a "does the decision change when the toggle changes" test.
- Extension: block → no sign button; analyzer down → explicit "unprotected" label; x402 auto-approve also goes through analysis.
- Showcase: each scenario's expected finding code (`docs/FRONTEND.md` §2.3 "Watch for") is asserted.
- Contract: cap overflow, `pay` reverts after revoke, window rollover (`vm.warp`), withdraw reserve, fuzz.
- End to end: `apps/wallet` Agent Delegation → `setAgentSigner` → `pay` with the sub-key → `revokeAgentSigner` → `pay` reverts.
- Live verification with `cast call` after deploy, address table (`docs/CONTRACTS.md`).

---

## 5. Definitely Discarded

`baret_docs/` and `blackthron_docs/` (Solana-era), `apps/wallet` (EVM/Stellar plaintext-key demo — redone with Mera on Monad), the `packages/wallet-adapter` popup protocol (vestigial once the extension exists), server-side policy DSL/profiles (Stellar, never used), `X402_DEMO_MODE` fake settlement (Casper), the `/v1/demo-check` free engine (OKX), the NovaSwap treasury vault (EVM — if the showcase needs it, a small demo contract will be written, not an EOA), all `DELTAG_*`/`premon`/`swig`/`blackthorn` names.
