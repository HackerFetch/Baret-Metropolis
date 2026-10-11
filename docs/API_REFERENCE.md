# Baret — API reference, end to end

Last updated: 2026-10-11 · Checked against commit `a48900b` and the live API on 2026-10-10; eight corrections checked against the code at `8a1a04f` on 2026-10-11 (the list in `tasks/FOR_EZGIN.md`).

Every interface between two parts of Baret, in the order a transaction passes through them: a site asks, the wallet checks, the server simulates and decides, the chain executes, the indexer records. What is not built is listed in the last section and, with everything else that is unfinished, in `docs/SYSTEM_GAPS.md`.

Where things run:

| Part | Where |
|---|---|
| Showcase (landing, six demo sites, `/agents`, `/review`) | `https://baret-metropolis.vercel.app` |
| Wallet | `https://baret-wallet.vercel.app` |
| Analysis API | `https://baret-monad-api.onrender.com`; both sites reach it at `/api/...` through a Vercel rewrite |
| Contracts | Monad testnet, chain id `10143` |
| Indexer | Envio HyperIndex, hosted; read only through the API's `/v1/audit/*` |

## The path of one transaction

1. A site sends a `sign` message to the Baret wallet window (section 1).
2. The wallet builds an analyze request and calls `POST /v1/analyze` (sections 2 and 4).
3. The server simulates the call on Monad with `debug_traceCall`, asks the reputation registry, Cleanverse and Nansen, and applies the person's rules (section 5).
4. The verdict comes back: `safe`, `caution` or `blocked`, with findings. Blocked has no sign button, and the site gets `refused`.
5. On Safe (or Caution after the person's acknowledgement) the wallet signs, sends and waits for the block; the site gets `signed` with the hash.
6. For a vault call the contract emits an event (section 6), the indexer stores it (section 7), and the wallet's Activity reads it back through `/v1/audit/vault/:address`.

---

## 1. Site ↔ wallet: the window protocol

A site opens the wallet with `window.open` (window name `baret-wallet`) and the two talk over `postMessage`. Channel `baret-wallet/1`. Types and strict parsers: `@baret/wallet-core/window` (`packages/wallet-core/src/window.ts`). The wallet accepts messages from its opener only, takes the site's identity from `event.origin`, and answers to that origin.

| Direction | `type` | Fields | What it does |
|---|---|---|---|
| wallet → site | `ready` | | The window has loaded and will take one request |
| site → wallet | `connect` | `id` | Asks for the account's address |
| wallet → site | `connected` | `id`, `address` | The person agreed |
| site → wallet | `sign` | `id`, `chainId` (10143), `call: { to, value, data }` | Asks the wallet to check and sign one call. `value` is wei as a decimal string; `data` at most 100,000 characters |
| wallet → site | `signed` | `id`, `address`, `hash` | Checked, signed and sent |
| wallet → site | `refused` | `id`, `reason`, `address`, `findings` | Not signed. `reason`: `declined` (the person), `blocked` (Baret), `unreachable` (no verdict); the parser also knows `invalid`, which no sender uses. `findings`: `{ code, values }` for every finding on screen, one per code, at most 50, with `address: null`; a decline on Caution carries them too |

Only contract calls and transfers: there is no message-signing request (no `personal_sign`, no typed data) in this protocol.

A site can also use an ordinary injected wallet: the demo sites list every wallet announced over EIP-6963 and send `eth_sendTransaction` through it. With another wallet, Baret acts as a panel on the page, not as the signer. The Baret extension is such a wallet, and it checks before it signs (below).

### The extension's provider (D-040)

The extension injects an EIP-1193 provider and announces it over EIP-6963 (`name` "Baret", `rdns` `dev.baret.wallet`); it takes `window.ethereum` only where no other wallet did. The page holds no key and no state: every request goes through the content script to the background, which reads the site's origin from the browser.

| Method | What the wallet does |
|---|---|
| `eth_chainId`, `net_version` | `0x279f` / `10143` |
| `eth_accounts` | The connected account, or `[]` when the site is not connected or the wallet is locked |
| `eth_requestAccounts`, `wallet_requestPermissions` | Opens the connect window, unless the site is connected and the wallet open |
| `wallet_switchEthereumChain`, `wallet_addEthereumChain` | `null` for chain 10143, error 4902 for any other |
| `eth_sendTransaction` | Opens the request window: `/v1/analyze` with the reader's rules, then Safe can be signed, Caution only on the reader's press, Blocked never. Returns the hash once the transaction is sent; error 4001 when declined or blocked |
| `eth_signTypedData_v4` | The same check on the structured data, then the signature. A message the server cannot read is never Safe (D-043): blocked when it names another account or an amount, a warning when it points at no funds |
| `personal_sign` | Shows the message as text and signs on the reader's press; there is nothing to simulate |
| `eth_call`, `eth_getBalance`, `eth_estimateGas`, `eth_getTransactionReceipt` and the other read methods | Passed to the Monad RPC as they are |
| `eth_sign`, `eth_signTransaction`, anything else | Error 4200: refused |

A site that is not connected gets error 4100 for a signing method. Events: `accountsChanged` when the answer to `eth_requestAccounts` or `eth_accounts` changes.

## 2. `@baret/wallet-core`: the wallet without its screens

| Area | Export | What it does |
|---|---|---|
| Account | `createWallet(options)` | One passkey prompt: a new passkey and the account derived from its PRF output |
| | `unlockWallet(options)` | One passkey prompt: the same account again, with or without a stored credential id |
| | `WalletSession` | The unlocked account in memory: `address`, `account` (viem), `lock()` |
| Check and sign | `new Wallet({ session, chain, baretUrl, policy })` | Binds an account to Baret's server and the person's rules |
| | `wallet.check(call)` | Calls `/v1/analyze` and returns the verdict |
| | `wallet.sign(call, verdict, { acknowledged })` | Signs and sends. Refuses Blocked, and Caution without the acknowledgement, with `NotClearedError`; refuses an expired verdict with a plain `Error` ("the check has expired") |
| | `wallet.checkAndSign(call)` | Both, for scripts |
| Chain | `createWalletChain({ rpcUrl })` | `balances`, `findVault`, `vault`, `prepare`, `send`, `wait` |
| Call builders | `transfers.mon`, `transfers.token` | A MON or ERC-20 transfer as a `WalletCall` |
| | `vault.create`, `deposit`, `withdraw`, `setMerchantCap`, `setMerchantPaused`, `revokeMerchant`, `setAgent`, `revokeAgent` | PaymentGuard calls as `WalletCall`s |
| Agent keys | `agentKeyFromPasskey(options, index)`, `agentSalt(index)` | An agent's key from its own PRF namespace (`baret.agent.v1:<index>`), one passkey prompt, never stored |
| Sealed settings | `sealedKeysFromPasskey(options)` | The keys of the third PRF namespace (`baret.sealed.v1`) |
| | `SealedKeys`: `id`, `seal`, `open`, `put`, `forget` | Encrypts and opens the settings document, and signs the write the store accepts |
| | `readSealed({ store, id, rpcUrl })`, `sealedTarget()` | Reads an entry from the SealedStore; the store's address and chain |
| Addresses | `WALLET_CONTRACTS` | Test USDC, the vault factory and the SealedStore on testnet; `mainnet` is null |

## 3. Developer SDKs

### `@baret/guard` (the pre-sign check for any app)

| Export | What it does |
|---|---|
| `new TransactionGuard({ baseUrl, apiKey?, timeoutMs? })`, `.evaluate(request)` | Calls `/v1/analyze`. Throws `GuardUnreachableError` when there is no verdict: the caller must treat that as blocked |
| `isSafe(verdict)`, `isSignable(verdict)` | Whether to sign without asking, and whether signing is allowed at all |
| `createPolicy(template, { allowedAssets })` | The 25 rules from `strict`, `balanced` or `permissive`, with the network's payment assets filled in |
| `analyzeRequestSchema`, `analyzeResponseSchema`, `guardPolicySchema`, `explainRequestSchema`, `policyDraftRequestSchema` | The wire shapes, as Zod schemas |
| `MONAD_NETWORKS` | Chain ids: testnet 10143, mainnet 143 |

### `@baret/agent-kit` (a signer that cannot sign past the verdict)

| Export | What it does |
|---|---|
| `new AgentWallet(options)` (a signer, `baretUrl`, the policy, an optional reviewer) | An agent's wallet bound to Baret |
| `.evaluate(call)`, `.allows(verdict)` | The verdict, and whether this wallet's settings let it sign |
| `.guardedSign(call)`, `.guardedSubmit(call)` | Check, then sign, then (submit) send. `GuardBlockedError` when Baret says no |
| `.pay({ vault, merchant, amount, ref })` | `PaymentGuard.pay` through the same check |
| `payX402(url, options)` | Pays an HTTP 402 (x402, EIP-3009): reads the terms, has Baret check that exact payment, signs it and requests again. `X402Error` when the 402 cannot be paid as asked (D-046) |
| `localSigner(privateKey)` | A key in memory, for tests and local runs; signs transactions and x402 payments |
| `createDynamicWallet`, `dynamicSigner`, `dynamicSignerFromFile` | A Dynamic server wallet as the agent's signer |
| `agentReviewer`, `qwenAgentReviewer`, `requireApproval` (`./review-agent`, `./reviewer`) | The Qwen reviewer: a plan, four read-only tools, approve or veto |
| `PAYMENT_GUARD_ABI` (`./abi`) | The vault's ABI |

### The `baret` CLI (`packages/agent-kit/src/cli.ts`)

| Command | What it does |
|---|---|
| `baret address` | The signer's address |
| `baret analyze --to 0x.. [--data] [--value]` | The verdict for a call, nothing signed |
| `baret submit --to 0x.. [--data] [--value] [--intent]` | Check, sign and send |
| `baret pay --vault --merchant --amount --ref [--intent]` | A vault payment through the check |
| `baret x402 <url> [--max <base units>]` | Pays a 402 after Baret's check and prints the answer and the settlement's transaction |
| `baret review --intent <text> ...` | The Qwen reviewer on a call (needs `QWEN_API_KEY`) |
| `baret wallet create` | A new Dynamic server wallet for the agent |
| `baret policy list` | The three templates |

### MetaMask Agent Wallet plugin (`packages/metamask-plugin`)

`baret check` (the verdict for a call) and `baret send` (send only if Baret clears it), as commands of the `mm` CLI. Built, not entered for the bounty.

Neither SDK is on npm: both work from a clone of the repository.

## 4. The analysis server: HTTP API

Base URL `https://baret-monad-api.onrender.com`. JSON in, JSON out. No API key is required today (`BARET_API_KEYS` is empty); when keys are set, every `/v1` route needs `x-api-key`, and a missing or unknown key gets 401 `{ error: "unauthorized" }` (`/health*` stays open). Every route but `/health*` answers 503 when what it needs is not configured or did not answer: it never invents an empty or safe answer.

| Method | Path | What it does |
|---|---|---|
| POST | `/v1/analyze` | Simulates a transaction or a typed-data signature and returns the verdict |
| POST | `/v1/explain` | A verdict this server returned, in plain words (KIMI) |
| POST | `/v1/policy/draft` | Proposed rule changes from one sentence (KIMI). Applies nothing |
| POST | `/v1/review` | The Qwen agent reviewer on one of three fixed scenarios |
| POST | `/v1/sealed` | Relays one signed, encrypted settings entry to the SealedStore |
| GET | `/v1/audit/recent` | Latest agent payments and registry changes |
| GET | `/v1/audit/vault/:address` | One vault: state, merchants, activity, payments |
| GET | `/v1/audit/owner/:address` | The vaults an account opened |
| GET | `/v1/audit/reputation/:address` | An address's registry entry and its history |
| GET | `/health` | Liveness and the running commit |
| GET | `/health/ready` | The chain answers, and which optional parts are configured |

### `POST /v1/analyze`

Request (`analyzeRequestSchema`):

| Field | |
|---|---|
| `network` | `"testnet"` (or `"mainnet"`, not configured) |
| `transaction` | `{ from, to?, value?, data?, gas?, ... }` or a raw signed transaction. Exactly one of `transaction` and `typedData` |
| `typedData` | An EIP-712 message to be signed (permits, x402 payments) |
| `policy` or `policyTemplate` | The full 25 rules, or `strict` / `balanced` / `permissive`. Neither: Balanced |
| `userWallet` | Whose balances the loss rules protect; default the sender |
| `payment` | For an x402 payment: `{ origin, payTo, asset, amount, memo?, spendHistory? }`. Caps need `spendHistory` or they fail closed |
| `integratorRequestId` | Echoed back |

Response: `decision` (`safe` / `caution` / `blocked`), `findings` (`{ code, severity, values, blocking }`), `firedRules`, `suggestions`, `confidence`, `estimatedChanges` (balance before and after per asset), `approvals`, `sources` (each data source and whether it answered), `expiresAt`, `meta` (`requestId`, `chainId`, `blockNumber`, ...).

Errors: 400 `invalid_request`; 503 `rpc_unavailable`. A source that does not answer does not produce an error: the rules that need it fail closed inside the verdict.

### `POST /v1/explain`

`{ requestId, language? }` with the `meta.requestId` of an analyze answer from the last ten minutes; `language` is `en`, `tr` or `zh`. The older `{ verdict, language }` is still accepted, and only its `meta.requestId` is read. Returns `{ requestId, decision, explanation: { headline, summary, points, advice }, language, model: { provider, name } }`. The decision is copied from the server's own verdict, never from the model. 404 `verdict_unknown` (the verdict is gone, for example after a restart); 503 `explain_unavailable` when no model is configured, the model did not answer, or today's KIMI budget is used up (500 fresh calls a day, shared with `/v1/policy/draft`). 20 requests a minute.

### `POST /v1/policy/draft`

`{ sentence, current?, language? }`. Returns `{ policy, changes, refused, note, model }`: the proposed rules, each change, and what the model was asked for but may not loosen. Validated against the policy schema; nothing is saved. 422 `policy_draft_invalid`; 429 `policy_draft_daily_limit` over the KIMI budget it shares with `/v1/explain`; 503 `policy_draft_unavailable`, both when no model is configured and when the model did not answer. 10 requests a minute.

### `POST /v1/review`

`{ scenario }`: `honest`, `overpay` or `injected`. Each is a fixed `PaymentGuard.pay` on Baret's demo vault `0x46F159DA1aD40A78526d35ea1Adb8531aDa52158`. Returns the intent, the call, Baret's verdict, the reviewer's decision with its plan and steps, and `sent` (`{ hash, status }`) when an approved honest run paid 0.10 dUSDC on testnet. With `accept: text/event-stream` the steps stream. One answer per scenario is kept for 30 minutes. 429 `review_daily_limit`; 503 `review_unavailable` (not configured) or `review_failed`. A streamed run can also end with `event: error` on a 200. 6 requests a minute.

### `POST /v1/sealed`

`{ id, version, blob, signature }`: an entry sealed and signed by `SealedKeys.put`. The server checks the signature and the version and pays the gas. Returns `{ id, version, hash }`. 400 `sealed_bad_signature` / `sealed_too_large`; 409 `sealed_stale_version`; 429 `sealed_daily_limit`; 502 `sealed_failed` (the write may still land); 503 `sealed_unavailable`. 6 requests a minute.

### `GET /v1/audit/*`

Read from the indexer. Amounts are base units as strings; addresses lowercase. `?limit=` on `recent` and `vault`. 400 for a bad address; 404 when the indexer has not seen the vault; 503 `indexer_unavailable`.

### `POST /mcp` (D-045)

Baret as tools for an AI agent, over the Model Context Protocol (Streamable HTTP, one JSON-RPC message per POST, one JSON answer, no session and no stream; `GET` and `DELETE` answer 405). Protocol versions `2025-06-18`, `2025-03-26` and `2024-11-05`.

| Tool | Arguments | What it returns |
|---|---|---|
| `check_transaction` | `from`, `to?`, `value?`, `data?`, `policyTemplate?`, `network?` | The verdict of `/v1/analyze` for an unsigned transaction |
| `check_signature` | `signer`, `typedData { domain, types, primaryType, message }`, `policyTemplate?`, `network?` | The verdict for an EIP-712 message |
| `address_reputation` | `address`, `network?` | The registry entry: flagged, severity, reason code |
| `policy_templates` | none | The three rule sets |

Every result starts with a sentence a model can act on ("Decision: blocked. Do not sign. Findings: ...") and carries the whole verdict as `structuredContent`. No verdict (bad arguments, a node that does not answer, a registry that is not configured) is a result with `isError: true` that says to treat it as blocked: never an empty or safe answer. The tools only read: nothing is signed, sent or stored. 60 requests a minute (`BARET_MCP_RATE_LIMIT_PER_MINUTE`).

To add it to a client that speaks MCP over HTTP: the URL is `https://baret-monad-api.onrender.com/mcp`, with no key today. For Claude Code: `claude mcp add --transport http baret https://baret-monad-api.onrender.com/mcp`.

### `GET /demo/paywall` (x402, D-046)

Scrybe's paid resource, and the facilitator that settles it. `?q=<question>`.

| Request | Answer |
|---|---|
| No `X-PAYMENT` header | **402** `{ x402Version: 1, error, accepts: [{ scheme: "exact", network: "monad-testnet", maxAmountRequired, resource, description, mimeType, payTo, maxTimeoutSeconds, asset, extra: { name, version } }] }` |
| `X-PAYMENT`: base64 of `{ x402Version: 1, scheme: "exact", network: "monad-testnet", payload: { signature, authorization: { from, to, value, validAfter, validBefore, nonce } } }` | **200** `{ answer, payment: { success, transaction, network, payer, amount } }`, and the same receipt base64 in `X-PAYMENT-RESPONSE` |

The authorisation is an EIP-3009 `TransferWithAuthorization` on the token in `asset`, signed over the domain `{ name, version, chainId: 10143, verifyingContract: asset }`. The server takes it only when it pays `payTo` exactly `maxAmountRequired`, is valid now and for at least 10 more seconds, recovers to `from` and has an unused nonce; then it submits `transferWithAuthorization` itself (the payer needs no MON) and answers after the receipt. Anything else is 402 again with the reason in `error` and nothing sent. 429 `paywall_daily_limit`; 502 `settlement_failed` (no answer; the transfer may still land); 503 `paywall_unavailable` when no facilitator key or test USDC is configured. 12 requests a minute, 300 settlements a UTC day.

### `GET /health`, `GET /health/ready`

`/health`: `{ status, analysisVersion, commit }`. `/health/ready`: `{ status: "ready" | "not_ready", networks }`, and it answers 503 `not_ready` when a network's chain id does not match; per network `{ ok, chainId, configured }`, where `configured` holds booleans and counts only: `nansen`, `cleanverse`, `indexer`, `explain`, `policyDraft`, `review`, `reviewSends`, `sealed`, `x402`, `usdc`, `reputationRegistry`, `knownContracts`, `paymentGuardFactory`, `separateTraceRpc`. Since D-042 also `nansenMode` (`funder`, `labels` or null), `nansenAnswering` (what the next new address is answered from: `funder` once the day's label lookups are used up) and `nansenLabelsLeftToday`.

### Limits

120 requests a minute over all routes, then the tighter per-route limits above, counted per visitor since #63 (G-01, closed: the server trusts the proxy's `X-Forwarded-For`). Over a per-minute limit the answer is 429 from the rate limiter, `{ statusCode, error: "Too Many Requests", message }`. Daily caps: KIMI 500 fresh calls (explain and draft together), review 200 fresh runs, sealed 200 writes; they are counted for the whole server, not per visitor, and reset at 00:00 UTC and on every restart.

## 5. What the server calls

| Service | For | Calls |
|---|---|---|
| Monad RPC (Alchemy on Render) | Simulation and reads | `debug_traceCall`, `eth_getBalance`, `eth_getCode`, `eth_getStorageAt`, `eth_gasPrice`, `eth_blockNumber`, `eth_chainId` |
| `ReputationRegistry` | The blocklist | `isFlagged`, `entry` |
| Cleanverse (contracts on Monad) | Identity rules and compliant assets | Reads of the A-Pass and the asset's policy |
| Nansen | Trust level and labels. **Off: no key** | `/api/v1/profiler/address/first-funder`, `/api/v1/profiler/address/labels` |
| KIMI (Moonshot) | `/v1/explain`, `/v1/policy/draft` | `https://api.moonshot.ai/v1/chat/completions`, model `kimi-k3` |
| Qwen | `/v1/review` | `https://maas.qwencloudapi.com/compatible-mode/v1/chat/completions`, model `qwen3.8-max` |
| Envio | `/v1/audit/*` | GraphQL on the hosted indexer |

## 6. Contracts on Monad testnet

Addresses and deploy blocks: `docs/CONTRACTS.md`.

| Contract | Writes | Reads | What it is |
|---|---|---|---|
| `PaymentGuardFactory` `0xDe89…A822` | `createVault(token)` | `vaultsOf(owner)`, `latestVault(owner)` | One vault per call, owned by the caller |
| `PaymentGuard` | Owner: `deposit`, `withdraw`, `setMerchantCap`, `setMerchantPaused`, `revokeMerchant`, `setAgentSigner`, `revokeAgentSigner`. Agent: `pay(merchant, amount, ref)` | `merchant`, `spent`, `available`, `unreserved` | The spending-limited vault: per-payment, hourly and daily caps per merchant |
| `ReputationRegistry` `0x7491…a411` | Forwarder: `onReport`, `reportFlagged`. Owner: `clearFlag`, `setForwarder`, `transferOwnership` | `isFlagged(target)`, `entry(target)` | On-chain threat data the server reads |
| `ReputationOracleReceiver` `0x7105…1d9d` | Forwarder: `onReport`. Owner: `ownerReport`, `setForwarder`, `setWorkflowOwner`, `setProtected` | `pending(candidates)` | The door the CRE workflow writes through |
| `CompliantPaymentGuard` `0x6E86…907c` | Owner: `setMerchantCap`, `setMerchantPaused`, `revokeMerchant`, `setAgentSigner`, `revokeAgentSigner`, `setMinTier`. Agent: `pay` | `verified(party)`, `canPay(merchant, amount)`, `merchant` | Agent payments in a Cleanverse asset; pays only a merchant with a credential |
| `SealedStore` `0xC094…21BB` | Anyone: `put(id, version, blob, signature)` | `get(id)`, `digest(id, version, blobHash)` | Ciphertext of sealed settings, filed under a passkey-derived id |
| Demo contracts | | | NovaSwap router and drainer, `DemoUSDC` (`faucet()`), `DemoToken`, OrbitPool, LaunchSale, ClaimHubDistributor, NightShift: the six demo sites' honest and attack targets (`docs/CONTRACTS.md` 7) |

## 7. Chain → data

### Envio indexer (`indexer/`)

Entities: `Vault`, `Merchant`, `Payment`, `VaultActivity`, `ReputationEntry`, `ReputationChange`.

Events: `VaultCreated` (factory); `Deposited`, `Withdrawn`, `MerchantCapSet`, `MerchantPausedSet`, `MerchantRevoked`, `AgentSignerSet`, `AgentSignerRevoked`, `Paid` (every vault the factory made, and the first demo vault); `ReputationFlagged`, `ReputationCleared` (registry). `CompliantPaymentGuard` and `SealedStore` are not indexed.

### Chainlink CRE workflow (`workflows/reputation-oracle`)

A cron-triggered workflow: fetches ScamSniffer's address blacklist, asks the receiver's `pending` which addresses the registry does not hold, and writes them through `onReport`. Run with `./workflows/simulate.sh` (`--broadcast` writes for real). Not deployed to a DON.

## 8. Not built

Named in older documents and absent from the code:

- A separate x402 facilitator service: `GET /demo/paywall` settles its own payments (D-046); `docs/X402_FACILITATOR.md` is the older, larger design.
- Batch, stream and replay variants of analyze.
- In the extension: more than one account, the allowances list, alerts, the x402 payments page and its interceptor, Swap (`docs/DECISIONS.md` D-040).
- Anything on Monad mainnet.
