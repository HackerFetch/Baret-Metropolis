# Baret — System Architecture

> This document is the **target architecture** for the Baret implementation to be written from scratch for Monad Metropolis (no code yet). As code starts being written, this file must be kept in sync with the code — if a contradiction is found, the source code is treated as the authority and this file is updated.

Last updated: 2026-10-07 · Status: **`packages/guard`, the `apps/server` analysis core, the contracts, agent-kit, wallet-core and the Envio indexer are implemented and live on testnet; the CRE reputation-oracle workflow is built and simulated with a real write (not deployed to a DON); Nansen and Cleanverse wait on the sponsors**

---

## 1. Design Principles

1. **Monad only.** No file contains an "any EVM chain" / "point at any chain" generalization. `chain.ts` (or its equivalent) has exactly two entries: `testnet` (10143) and `mainnet` (143). No other chain's name appears anywhere.
2. **Fail-closed.** When there is insufficient data (simulation failed, account state missing), the decision falls on the **block** side, not "allow".
3. **SDKs can be consumed independently of the chain library.** Packages such as `@baret/guard` must be consumable without importing `ethers`/`viem` — wallet UIs should stay lightweight.
4. **Sponsor integrations are inside the product, not a separate "demo mode".** The Nansen, Cleanverse, Mera, Dynamic and Envio integrations are part of the main analysis flow; when switched off, the product genuinely loses capability.
5. **The policy belongs to the user, the engine to Baret.** `GuardPolicy` is carried entirely as data (JSON); the engine code interprets the policy but is not embedded in it.

---

## 2. High-Level Component Diagram

```mermaid
flowchart TB
    subgraph Clients
        EXT[apps/extension<br/>Chrome MV3 wallet + x402 interceptor]
        WAL[apps/wallet<br/>Mera-powered standalone smart wallet]
        SHOW[apps/showcase<br/>threat scenarios + /agents control panel]
        MM[MetaMask Agent Wallet<br/>via packages/metamask-plugin]
    end

    subgraph Core
        SDK[packages/guard<br/>TransactionGuard SDK]
        AGENT[packages/agent-kit<br/>guarded signer + CLI]
        API[apps/server<br/>Fastify analysis API]
    end

    subgraph OnChain["Monad testnet / mainnet"]
        PG[PaymentGuard.sol]
        RR[ReputationRegistry.sol]
    end

    subgraph OffChainInfra
        IDX[indexer/ Envio HyperIndex]
        CRE[workflows/ Chainlink CRE<br/>reputation-oracle]
        NANSEN[Nansen API]
        CLEAN[Cleanverse API]
        DYNAMIC[Dynamic SDK]
        MERA[Mera passkey / PRF]
    end

    EXT --> SDK
    WAL --> SDK
    SHOW --> SDK
    MM --> SDK
    AGENT --> SDK
    SDK --> API
    API --> NANSEN
    API --> CLEAN
    API -->|reads| RR
    API -->|reads/writes| IDX
    CRE -->|writes threat intel| RR
    WAL --> MERA
    AGENT --> DYNAMIC
    AGENT -->|guardedSign/guardedSubmit| PG
    MERA -->|PRF sub-key| PG
    IDX -->|indexes| PG
    IDX -->|indexes| RR
```

---

## 3. Monorepo Layout

```
baret/
├── apps/
│   ├── server/        Fastify + TypeScript analysis API (the heart of the engine)
│   ├── wallet/        Standalone smart wallet demo running on Mera passkeys
│   ├── extension/     Chrome MV3 (+ Firefox if possible) browser extension
│   └── showcase/      Threat scenario gallery + /agents control page
├── packages/
│   ├── guard/             @baret/guard — TransactionGuard + GuardPolicy SDK
│   ├── agent-kit/         @baret/agent-kit — guarded signer (Dynamic-backed) + CLI
│   ├── metamask-plugin/   MetaMask Agent Wallet plugin package for the Baret firewall
│   ├── wallet-adapter/    dApp ↔ wallet postMessage bridge
│   ├── ext-protocol/      Extension message-bus types
│   ├── ui/                Design tokens + shared React components (all three surfaces)
│   └── web-ui/            Web signature layer for the showcase and the wallet (type, frame, motion, cursor, fonts)
├── contracts/         Foundry — PaymentGuard.sol, ReputationRegistry.sol
├── workflows/         Chainlink CRE — reputation-oracle workflow
├── indexer/           Envio HyperIndex config + handlers
├── docs/              This documentation set
├── pnpm-workspace.yaml
└── docker-compose.yml / render.yaml / vercel.json (deploy config)
```

**Technology choices:**
- **Fastify** — API server (TypeScript).
- **viem** — Monad RPC interaction (D-012). `packages/guard` does not import it.
- **Zod** — env and request schema validation.
- **Foundry** — contract development/test/deploy.
- **React + Vite** — wallet/extension/showcase UIs.
- **Envio HyperIndex** — on-chain event indexing (GraphQL query surface).

---

## 4. Chain Configuration (Monad ONLY)

```ts
// apps/server/src/config/chains.ts — target shape
export const CHAINS = {
  testnet: {
    chainId: 10143,
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL, // Alchemy primary
    explorerUrl: "https://testnet.monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
    usdcAddress: process.env.MONAD_TESTNET_USDC_ADDRESS, // to be verified during build, NO placeholder
    faucetUrl: "https://faucet.monad.xyz",
  },
  mainnet: {
    chainId: 143,
    rpcUrl: process.env.MONAD_MAINNET_RPC_URL,
    explorerUrl: "https://monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
    usdcAddress: process.env.MONAD_MAINNET_USDC_ADDRESS,
    faucetUrl: "",
  },
} as const;
```

> Note: Previous (non-Monad) implementations used generic env variables such as `RPC_URL`/`CHAIN_ID` to extend to "any EVM chain". In this project that is **deliberately reversed**: env variables are named `MONAD_TESTNET_*` / `MONAD_MAINNET_*`, and the code makes no "generic EVM chain" assumption anywhere.

---

## 5. Lifecycle of an Analysis Request

`POST /v1/analyze` — input (`analyzeRequestSchema` in `packages/guard/src/analyze.ts`):
`{ network, transaction | typedData, userWallet?, policy?, payment?, integratorRequestId? }`

- `transaction` is an unsigned call (`{ from, to, value, data, gas, ... }`) or a signed one (`{ raw }`).
- `typedData` is an EIP-712 message (`eth_signTypedData_v4`): permits, Permit2, and EIP-3009 transfer authorisations (x402).
- `policy` is the full rules; `policyTemplate` (`strict`, `balanced`, `permissive`) names a template instead and the server fills in the network's USDC. Neither: Balanced.
- `transaction.raw` may be signed (sender recovered) or unsigned (sender is `userWallet`).
- `payment` is the x402 context: what the merchant's 402 asked for (`origin`, `payTo`, `asset`, `amount`, `memo`) and the `spendHistory` the hourly and daily caps need.

```
[1] Rate limit (per IP) · [2] x-api-key when BARET_API_KEYS is set · [3] Zod body validation
     ↓  apps/server/src/application/analyze.ts
[4]  pin one block number; every read below is at that block
[5]  decodeTransaction()       call request or signed raw tx → normalized tx (chain id checked)
[6]  simulate                  eth_call + eth_estimateGas + debug_traceCall (callTracer, withLog)
[7]  effects                   approvals, transfers, ownership changes from the trace logs;
                               from the calldata when there is no trace or the call reverts;
                               from the message for typed data
[8]  addresses                 counterparties, recipients, touched contracts (eth_getCode),
                               EIP-1967 slot of every delegatecall source, balances, token metadata
[9]  sources                   Nansen + ReputationRegistry (reputation), Cleanverse (compliance)
[10] detectors                 risk/detectors/*.ts, pure functions of the context (§6)
[11] policy engine             policy/evaluate.ts: rule thresholds, then the decision (§7)
[12] response                  validated against analyzeResponseSchema before it is sent
     ↓
RESPONSE { decision, findings, firedRules, suggestions, confidence, estimatedChanges,
           approvals, sources, expiresAt, meta }
```

- `decision`: `safe` (no findings), `caution` (findings, none blocking), `blocked`.
- `findings[]`: `{ code, severity, values, blocking, details? }`. Compliance findings carry `details.side` (`self` or `recipient`).
- `firedRules[]`: `{ rule, code, limit, actual }` for every blocking finding.
- `suggestions[]`: `{ code, values }`; today only `ERC20_APPROVAL_UNLIMITED` with the amount this same request spends.
- `estimatedChanges[]`: the user's balance changes in base units (`before`, `after`, `delta`), MON includes the fee for the whole gas limit.
- `sources[]`: `alchemy`, `nansen`, `reputation-registry`, `cleanverse`, each `ok`, `unavailable` or `skipped`.
- RPC outage, or an RPC on the wrong chain (read or trace node; checked once per process, `verifyChain`): HTTP 503 `rpc_unavailable`, never a verdict. The client shows "Can't reach Baret" (Blocked).

---

## 6. Risk Detectors

| Detector | File (target) | What it catches | Example finding codes |
|---|---|---|---|
| simulation | `risk/detectors/simulation.ts` | Simulation failed, calldata-only (no trace) | `SIMULATION_FAILED`, `LOW_CONFIDENCE_INCOMPLETE_DATA` |
| approvals | `risk/detectors/approvals.ts` | Unlimited `approve`, `setApprovalForAll`, EIP-2612 `permit` | `ERC20_APPROVAL_GRANTED`, `ERC20_APPROVAL_UNLIMITED`, `NFT_OPERATOR_GRANTED`, `PERMIT_SIGNATURE_DETECTED` |
| programs | `risk/detectors/programs.ts` | Contract on the risky list / unknown contract | `RISKY_CONTRACT_INTERACTION`, `UNKNOWN_CONTRACT_EXPOSURE` |
| evm-danger | `risk/detectors/evm-danger.ts` | `SELFDESTRUCT`, `DELEGATECALL`, ownership transfer | `SELFDESTRUCT_CALL`, `DELEGATECALL_DETECTED`, `OWNERSHIP_TRANSFER` |
| reputation | `risk/detectors/reputation.ts` | Nansen labels + on-chain ReputationRegistry | `KNOWN_MALICIOUS_ADDRESS`, `NANSEN_FLAGGED_FRESH_WALLET`, `NANSEN_FLAGGED_WHALE_COUNTERPARTY`, `NANSEN_TRUST_BELOW_MINIMUM`, `REPUTATION_DATA_UNAVAILABLE` |
| compliance | `risk/detectors/compliance.ts` **(new)** | A side of a transfer without an active Cleanverse credential (A-Pass, read on-chain): asked for by the user's identity rules, or by the asset itself when it is a compliant one (CVA), D-030 | `COMPLIANCE_NO_CREDENTIAL`, `COMPLIANCE_EXPIRED`, `COMPLIANCE_TIER_INSUFFICIENT`, `COMPLIANCE_COUNTRY_DISALLOWED`, `COMPLIANCE_DATA_UNAVAILABLE` |
| cpi | `risk/detectors/cpi.ts` | Deep internal-call nesting, high operation count | `DEEP_CALL_NESTING`, `HIGH_OPERATION_COUNT` |
| compute | `risk/detectors/compute.ts` | Excessive gas ceiling | `EXCESSIVE_GAS` |
| x402 | `risk/detectors/x402.ts` | Missing memo, asset outside the allowlist, destination/asset mismatch | `X402_DESTINATION_MISMATCH`, `X402_ASSET_MISMATCH`, `X402_NON_CANONICAL_ASSET`, `X402_MEMO_MISSING`, `X402_ASSET_NOT_ALLOWED` |
| policy engine | `policy/evaluate.ts` | Rule thresholds that need the user's limits or spend history: loss limits, balance floors, x402 caps and merchant allowlist | `ESTIMATED_LOSS_EXCEEDS_MAX`, `LOSS_PERCENT_UNAVAILABLE`, `POST_BALANCE_TOO_LOW`, `POST_BALANCE_UNAVAILABLE`, `X402_PER_TX_CAP_EXCEEDED`, `X402_HOURLY_CAP_EXCEEDED`, `X402_DAILY_CAP_EXCEEDED`, `X402_MERCHANT_NOT_ALLOWED`, `X402_SPEND_HISTORY_UNAVAILABLE` |

Every finding: `{ code, severity: low|medium|high|critical, values, details? }`. The server sends the code and the values to interpolate, never a sentence: the words, the placeholders each code takes and the emitter of each code live in `packages/content/src/shared/findings.content.ts`, which is the contract (38 codes). Each `GuardPolicy` field lists the codes it can produce in `packages/content/src/shared/policy.content.ts`. The `*_UNAVAILABLE` codes are the fail-closed branches: when a data source does not answer, the check fails instead of passing.

---

## 7. Policy Engine

`GuardPolicy` — pure data, ~20 independent on/off + threshold fields:

| Category | Fields |
|---|---|
| Simulation | `requireSuccessfulSimulation` |
| Contract | `blockRiskyContracts`, `blockUnknownContractExposure` |
| Approval | `blockUnlimitedApprovals`, `blockSetApprovalForAll`, `blockPermit` |
| Dangerous opcodes | `blockSelfdestruct`, `blockDelegatecall`, `blockOwnershipTransfer` |
| Loss limits | `maxLossPercent`, `minPostUsdcBalance`, `minPostNativeBalance` |
| Reputation | `blockKnownMalicious`, `minNansenTrustLevel` |
| Compliance | `requireComplianceCheck`, `allowedCountries`, `minComplianceTier` |
| Resources | `maxGas` |
| x402 | `requireMemo`, `maxPerTxCap`, `maxHourlyCap`, `maxDailyCap`, `allowedAssets`, `allowedMerchantOrigins` |
| General | `allowWarnings` |

**Ready-made templates:** `STRICT_POLICY`, `BALANCED_POLICY` (production default), `PERMISSIVE_POLICY` — `packages/guard/src/policy-templates.ts`.

**The decision logic is fail-closed:** if the loss cannot be computed, if compliance data cannot be fetched, if the reputation API is unreachable → block.

**How each code is decided** (`FINDING_SPECS` in `packages/guard/src/findings.ts`, tested against `policy.content.ts`):

| Kind | Codes | Blocks when |
|---|---|---|
| toggle | `SIMULATION_FAILED`, approvals, contracts, dangerous calls, `KNOWN_MALICIOUS_ADDRESS` | its boolean field is on; otherwise it is a warning |
| threshold | Nansen trust, compliance, gas, loss, floors, x402 assets/memo/merchant/caps | always (the emitter only fires when the rule is set and broken) |
| failClosed | every `*_UNAVAILABLE` | always, and only emitted when a rule needed the missing data |
| warning | `LOW_CONFIDENCE_INCOMPLETE_DATA`, `ERC20_APPROVAL_GRANTED`, fresh wallet, whale, nesting, operation count, `X402_DESTINATION_MISMATCH`, `X402_ASSET_MISMATCH` | `allowWarnings` is off |

Severity is display only; it never decides. A delegatecall from a standard EIP-1967 proxy to its own implementation is not reported (USDC is such a proxy).

---

## 8. Component Details

### 8.1 `apps/server`
The entire analysis engine lives here. Endpoints:

| Method | Path | Description |
|---|---|---|
| GET | `/health`, `/health/ready` | Liveness / is the RPC ready |
| POST | `/v1/analyze` | Single transaction analysis |
| POST | `/v1/analyze/batch` | ≤25 transactions |
| POST | `/v1/analyze/stream` | SSE result stream |
| POST | `/v1/replay` | Re-simulation |
| GET | `/v1/audit/recent`, `/aggregate`, `/contract/:address` | Audit (Envio-backed) |
| POST | `/v1/explain` | A verdict in plain language (KIMI) |
| GET/POST | `/mcp/tools`, `/mcp/call` | AI agent tools |
| GET | `/demo/paywall` | x402 demo (see `X402_FACILITATOR.md`) |

Implemented: `/health`, `/health/ready`, `/v1/analyze`, `/v1/audit/*` (see §8.8), `/v1/explain` (below). Batch, stream, replay, MCP and the demo paywall are not built.

**`POST /v1/explain`** (D-028). Body `{ verdict, language? }`, where `verdict` is a `/v1/analyze` answer and `language` is `en` (default) or `tr`; answer `{ decision, explanation: { headline, summary, points[], advice }, language, model, requestId }` (`explainRequestSchema` / `explainResponseSchema` in `@baret/guard`). KIMI (Moonshot, `kimi-k3`) writes the four fields from the verdict's facts and from the sentences `@baret/content` already holds for each finding code, so the model rephrases Baret's wording instead of inventing its own. Three things keep it honest: `decision` is copied from the verdict, never taken from the model; the model's answer must match the schema exactly (an extra field such as a decision of its own is refused); and no key, an error, a timeout or an answer off the schema is `503 explain_unavailable`, so the client keeps the findings it shows today. `/health/ready` reports `configured.explain`. Status: off in production (no key), and tested only against stubbed model answers (D-029).

### 8.2 `apps/wallet` and `packages/wallet-core`
`apps/wallet` is the screens (wallet-ui store, today on sample data). `packages/wallet-core` is everything behind them, with no UI (D-023):

- `createWallet` / `unlockWallet` → `WalletSession`: the Mera passkey account (`address`, `account` for viem signing, `lock()`), plus `agentKey(n)` / `agentAddress(n)` for keys an agent can be handed.
- `createWalletChain({ rpcUrl })`: balances, `findVault(owner)`, `vault(address, merchants)`, `prepare`, `send`, `wait`.
- `transfers.*` and `vault.*`: every call the wallet signs (MON and token transfers; open a vault, deposit as exact allowance + deposit, withdraw, merchant cap / pause / revoke, agent set / revoke).
- `Wallet`: `check(call)` → the server's `AnalyzeResponse` with the owner's rules as the policy; `sign(call, verdict, { acknowledged })`; `checkAndSign`.
- Passkeys need HTTPS (or localhost) and a provider with the PRF extension (iCloud Keychain, Google Password Manager, 1Password); a passkey belongs to the domain it was made on.

### 8.3 `apps/extension` — Chrome MV3
- EIP-1193 / EIP-6963 provider.
- `background`: account state machine, IndexedDB (keystore, history, allowances, site permissions), chain monitor (WebSocket — not polling, per the Alchemy recommendation in notes.txt).
- `inpage`: `window.ethereum` provider + x402 fetch interceptor.
- Every signature request goes through the guard; a risky transaction is blocked in the wallet, not in the dApp.

### 8.4 `apps/showcase`
- Six threat scenarios (fake dApps with safe/danger variants): SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD. The names are kept from the earlier version by decision D-010.
- `/agents` page: live playground for agent-kit + PaymentGuard + (if available) the Qwen adversarial reviewer.

### 8.5 `packages/guard`
`TransactionGuard.evaluate({ transaction, userWallet, policy })` → `{ decision, blockingReasons, analysis }`. **Never signs/submits** — only returns a decision.

### 8.6 `packages/agent-kit`
An agent's wallet that cannot sign what Baret has not cleared (built 2026-10-05, checked on testnet).

- `AgentWallet({ signer, baretUrl, rpcUrl, policyTemplate | policy, allowCaution? })`: `evaluate(call)`, `guardedSign(call)`, `guardedSubmit(call)`, `pay({ vault, merchant, amount, reference })` (a `PaymentGuard.pay`). Safe is signed; Blocked, an unreachable server or an answer off the contract throws (`GuardBlockedError`, `GuardUnreachableError`) and the signer never sees the transaction. Caution is not signed unless `allowCaution` is set: a Caution is for a person to read.
- Signers (`AgentSigner`): `dynamicSigner` / `createDynamicWallet` — a Dynamic server wallet (MPC, two of two; the local share lives in one owner-only file), per D-019; `localSigner(privateKey)` for tests and local runs.
- Reviewer (D-028, optional): `AgentWallet({ reviewer })` adds a second check between Baret's verdict and the signature. `guardedSign(call, { intent })` hands the reviewer the intent the agent stated and what the call would do according to Baret's simulation (its own balance changes, the approvals, the findings); the reviewer answers `approve` or `veto` with the mismatches. `qwenReviewer({ apiKey })` is Qwen (`qwen3.8-max`, Alibaba Cloud Model Studio) with an adversarial prompt. It can only take away: it is asked only about calls Baret cleared, and a missing intent, a failed or slow model, or an answer off the schema is a veto (`ReviewerVetoError`, nothing signed). Status: tested only against stubbed model answers, never against Qwen itself (D-029).
- CLI `baret`: `address`, `analyze`, `submit`, `pay`, `wallet create`, `policy list`. `submit` and `pay` take `--intent`; `QWEN_API_KEY` in the environment turns the reviewer on. Settings come from the environment only (`BARET_API_URL`, `MONAD_TESTNET_RPC_URL`, `BARET_POLICY_TEMPLATE`, `BARET_ALLOW_CAUTION`, and `DYNAMIC_ENVIRONMENT_ID` + `DYNAMIC_AUTH_TOKEN` + `BARET_AGENT_WALLET_PASSWORD`, or `BARET_AGENT_PRIVATE_KEY`). Exit codes: `0` cleared (and sent), `1` not cleared and nothing signed, `2` error.

`packages/llm` is the one model client both uses share: `LlmClient.json({ system, user, schema })` posts an OpenAI-format chat completion to the configured provider (`QWEN`, `KIMI`, or any compatible endpoint) and returns the answer only after it passes a zod schema; everything else is `LlmUnavailableError`.

### 8.7 `packages/metamask-plugin`
A plugin for the MetaMask Agent Wallet CLI (`mm`, `@metamask/agent-wallet` 7.x), built on its `PluginCommand` base class and installed with `mm plugins install` (D-027).

- `mm baret check <to>` (`wallet-read`): builds the transaction from the active wallet, asks `/v1/analyze`, returns the decision, the finding codes and whether `send` would go on.
- `mm baret send <to>` (`wallet-read`, `wallet-submit`): the same check, then `ctx.walletExecutor` only behind an open gate. Blocked never reaches the wallet; Caution needs `--accept-caution`; no answer, a non-2xx status, a malformed answer or an expired verdict is `BARET_NO_VERDICT` and nothing is sent.
- The manifest (`package.json#mm`) declares capabilities per command and `targetChains: [10143, 143]`. The plugin has no access to the session, the recovery phrase or the wallet's policy, and what it passes is still judged by MetaMask's own policy and approval: it can only remove proposals.
- No runtime dependencies: `fetch` and a hand-written check of the answer (`src/guard.ts`, unit tested, its request checked against `analyzeRequestSchema`). Installed from a tarball (`pack:plugin`), never from the workspace folder.
- Limit: the Agent Wallet lists Monad testnet but sends only on Monad (143), and the live server analyses testnet only, so a sent transaction is not demonstrated; the gates are (`packages/metamask-plugin/README.md`).

---

### 8.8 `indexer/` and the audit routes
An Envio HyperIndex project (v3) over Monad testnet, from the block the contracts were deployed in (D-024):

- **Sources:** `PaymentGuardFactory` (`VaultCreated` registers each new vault for indexing), every `PaymentGuard` (the demo vault by address, factory vaults dynamically) and `ReputationRegistry`.
- **Entities** (`indexer/schema.graphql`): `Vault`, `Merchant`, `Payment`, `VaultActivity` (a vault's feed: created, deposited, withdrawn, merchant cap/pause/resume/revoke, agent set/revoke, paid), `ReputationEntry` (current flag), `ReputationChange` (history).
- **Server:** `ENVIO_ENDPOINT` is the indexer's GraphQL URL. `GET /v1/audit/recent`, `/v1/audit/vault/:address`, `/v1/audit/owner/:address`, `/v1/audit/reputation/:address` read from it. No indexer, or no answer: 503, never an empty history.
- **Why an indexer:** a vault cannot list its merchants or payments, and a free RPC plan answers `eth_getLogs` for ten blocks at a time.
- `pnpm --filter @baret/indexer typecheck` runs in CI; `test:chain` replays real blocks through the handlers and needs `ENVIO_API_TOKEN`.

### 8.9 `workflows/` — Chainlink CRE reputation oracle

How threat intelligence reaches the chain without a deploy of the server (D-026). One CRE project, one workflow, `workflows/reputation-oracle`:

1. **Trigger:** cron (every ten minutes in the config).
2. **Fetch:** every node reads an external threat feed over HTTP (ScamSniffer's public address blacklist) and reduces it to the same sorted list; the DON accepts the result only when the nodes agree.
3. **Select:** time picks one window of the feed per rotation, so the workflow needs no stored cursor and reaches every entry once per pass.
4. **Read:** `ReputationOracleReceiver.pending` returns the candidates the registry does not hold and that are not protected.
5. **Write:** a signed report through the CRE forwarder to the receiver, which hands it to `ReputationRegistry.onReport`.

The server's `sources/registry.ts` reads the registry on every analysis, so a new entry is a `KNOWN_MALICIOUS_ADDRESS` finding on the next request. A feed that cannot be read or does not look like the feed writes nothing. Pure logic is in `src/feed.ts` (unit tested); `main.ts` holds the capability calls. Receiver contract and addresses: `docs/CONTRACTS.md` section 3.5. Running the simulator: `workflows/README.md`.

---

## 9. Environment Variables

The authoritative list is `apps/server/.env.example`, validated by `apps/server/src/config/env.ts` at start-up.

| Variable | Required | Description |
|---|---|---|
| `MONAD_TESTNET_RPC_URL` | Yes | Monad testnet RPC for every read, sent as JSON-RPC batches (Alchemy) |
| `MONAD_TESTNET_TRACE_RPC_URL` | No | Node for `debug_traceCall` when the main RPC lacks it (Alchemy's free tier does): the public `https://testnet-rpc.monad.xyz`. Unset: the main RPC traces |
| `MONAD_TESTNET_USDC_ADDRESS` | For USDC rules and x402 | Canonical USDC, verified on the explorer. Unset: USDC floor fails closed, default policy allows no payment asset |
| `MONAD_TESTNET_REPUTATION_REGISTRY_ADDRESS` | For reputation rules | Deployed `ReputationRegistry`. Unset: rules that need it fail closed |
| `MONAD_TESTNET_PAYMENT_GUARD_FACTORY_ADDRESS` | No | `PaymentGuardFactory`. The factory and every vault it deployed count as known contracts |
| `MONAD_TESTNET_KNOWN_CONTRACTS` | No | Comma-separated contracts Baret vouches for (PaymentGuard, showcase contracts) |
| `MONAD_MAINNET_*` | No | Same four for mainnet; mainnet is served only when its RPC URL is set |
| `BARET_API_KEYS` | No | Comma-separated keys for `/v1` (`x-api-key`). Empty: open, development only |
| `BARET_CORS_ORIGINS` | No | Comma-separated origins. Empty: any |
| `BARET_RATE_LIMIT_PER_MINUTE` / `BARET_REQUEST_TIMEOUT_MS` / `BARET_VERDICT_TTL_SECONDS` | No | 120 / 8000 / 30 |
| `NANSEN_API_KEY` / `NANSEN_MODE` | For the trust-level rule; adds to the blocklist | `sources/nansen.ts` (D-016, D-017). `funder` (default): `profiler/address/first-funder`, 1 credit per wallet. `labels`: `profiler/address/labels`, 100 credits. Unset: only `minNansenTrustLevel` above `new` fails closed |
| `CLEANVERSE_API_KEY` / `CLEANVERSE_API_URL` | For compliance rules | Client not wired yet (Week 3) |
| `ENVIO_ENDPOINT` | For `/v1/audit/*` | GraphQL endpoint of the deployed indexer |
| `MONAD_TESTNET_CLEANVERSE_APASS_ADDRESS`, `MONAD_TESTNET_CLEANVERSE_POLICY_ADDRESS` | For identity rules and compliant assets | Cleanverse's A-Pass and aToken policy contracts (`docs/CONTRACTS.md` 4.1). Both or neither; unset, identity rules fail closed. Same pair with `MONAD_MAINNET_` |
| `KIMI_API_KEY` | For `/v1/explain` | Moonshot platform key; without it the route answers 503. Optional `KIMI_BASE_URL`, `KIMI_MODEL` (defaults: `https://api.moonshot.ai/v1`, `kimi-k3`) |
| `QWEN_API_KEY` | agent-kit only, not the server | Alibaba Cloud Model Studio key; turns the reviewer on in the `baret` CLI. Optional `QWEN_BASE_URL`, `QWEN_MODEL` (defaults: the international `compatible-mode/v1` endpoint, `qwen3.8-max`) |
| `X402_*`, `MERA_*` | Later | Added when their module is built |

Contracts deploy (`contracts/script/Deploy.s.sol`): `BARET_OWNER`, `BARET_CRE_FORWARDER`, `MONAD_TESTNET_USDC_ADDRESS`, deployer key passed on the command line, never stored.

---

## 10. Explicit Non-Goals

- No generic "works on every EVM chain" configuration.
- No going back to a non-persistent (in-memory only) audit trail — the Envio indexer is the primary source.
- The smart wallet address will not be left as a placeholder (a known gap in the previous repos) — a real account via the Mera integration.
