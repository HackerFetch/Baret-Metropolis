# Baret — Smart Contract Specification

> Design of the contracts to be deployed to Monad testnet/mainnet with Foundry. Before code is written, this file is used as the spec; after deployment the address table is filled in and this file is kept up to date.

Last updated: 2026-10-01 · Status: **Both contracts written and tested (`forge test`: 26 passing, incl. fuzz + invariants). Not deployed yet**

---

## 1. General Principles

- Solidity + Foundry (`forge build`, `forge test`, `forge fmt`).
- At least one **fuzz invariant test** per contract (e.g. "the vault balance can never drop below the total active merchant reserve").
- Monad gas pricing active in local tests (`ARCHITECTURE.md` §9, `RESOURCES.md` §2).
- Storage layout: per-user fields are grouped in a single struct (MIP-8 locality advantage — see `notes (4).txt`), no unnecessary bit-packing.
- No other chain's name appears in contract names/comments; references to Monad only.

---

## 2. `PaymentGuard.sol` — Spending-Limited Vault

**Purpose:** An on-chain vault that lets agents make autonomous payments within defined limits, without the owner having to sign every payment individually. The caps themselves are the firewall — contract-level enforcement instead of human approval.

### 2.1 Roles
| Role | Permission |
|---|---|
| **Owner** | Deposit, define/update/revoke merchant caps, withdraw, revoke agent authorization |
| **Agent (delegated signer)** | Can only call `pay()`; cannot deposit/withdraw/change caps |
| **Merchant** | Recipient of the payment; must have been added to the allowlist by the owner |

### 2.2 Functions (as built — `contracts/src/PaymentGuard.sol`)

One vault, one token (USDC, set at deploy), one owner (immutable), one agent signer.

```solidity
function deposit(uint256 amount) external;                                     // owner only
function setMerchantCap(address merchant, uint256 perTxCap, uint256 hourlyCap, uint256 dailyCap) external; // owner; hourlyCap 0 = no hourly limit
function setMerchantPaused(address merchant, bool paused) external;            // owner; keeps caps and history
function revokeMerchant(address merchant) external;                            // owner; frees its reserve
function setAgentSigner(address agent) external;                               // owner; replaces the previous agent
function revokeAgentSigner() external;                                         // owner; immediate
function pay(address merchant, uint256 amount, bytes32 ref) external;          // agent only; ref = invoice id / x402 memo hash
function withdraw(uint256 amount) external;                                    // owner; never below totalReserved
// views: merchant(addr), spent(addr) → (lastHour, lastDay), available(addr), unreserved(), totalReserved, agent
```

Differences from the draft, and why (D-013): a single token instead of `deposit(token, amount)` because caps are in one unit; an on-chain hourly cap so the vault speaks the same rules as `maxHourlyCap`; a real pause; a `ref` on every payment so `requireMemo` has an on-chain counterpart. Token calls are SafeERC20-style (tokens that return nothing work, `false` reverts) without an OpenZeppelin dependency.

**Rolling windows:** every payment is logged per merchant (timestamp + amount in one slot); each `pay` drops entries older than 1 h / 24 h from two running totals. A merchant can hold at most `MAX_LIVE_PAYMENTS` (128) payments inside 24 h, which bounds the gas of one `pay`.

**Reserve:** `totalReserved` = sum of the daily caps of merchants that are not revoked. `withdraw` cannot go below it.

### 2.3 Invariants (tested in `contracts/test/PaymentGuard.t.sol`)
- [x] A `pay()` call reverts if it exceeds the merchant's per-tx, rolling-1h or rolling-24h cap (unit tests with `vm.warp`, fuzz `testFuzz_neverExceedsDailyCap`).
- [x] `withdraw()` cannot take the vault below the reserve of active merchants; two merchants' reserves add up and are freed on revoke (`invariant_reserveMatchesActiveCaps`).
- [x] After `revokeAgentSigner()` or `setAgentSigner(other)`, the old agent's `pay()` reverts.
- [x] `deposit` is owner-only.

### 2.4 Events (the Envio indexer will listen to these)
```solidity
event Deposited(address indexed token, uint256 amount);
event MerchantCapSet(address indexed merchant, uint256 perTxCap, uint256 hourlyCap, uint256 dailyCap);
event MerchantPausedSet(address indexed merchant, bool paused);
event MerchantRevoked(address indexed merchant);
event AgentSignerSet(address indexed agent);
event AgentSignerRevoked(address indexed agent);
event Paid(address indexed merchant, address indexed agent, uint256 amount, bytes32 indexed ref, uint256 timestamp);
event Withdrawn(address indexed token, uint256 amount);
```

### 2.5 Mera Integration Note
The address passed to `setAgentSigner` is the address of a **sub-key** derived from Mera's PRF-derived key material — the owner's main passkey never enters this flow. This is the exact match for Mera's "One Passkey, Many Keys" bounty ("most creative non-wallet use of Mera's PRF-derived key material"). The detailed design will be settled after reading the Mera guide in `docs/RESOURCES.md` — to be added to `DECISIONS.md`.

### 2.6 Deployment Table (to be filled in after deployment)

| Network | Address | Token (USDC) | Owner | Deploy date | Deployer |
|---|---|---|---|---|---|
| Monad testnet (10143) | _(empty)_ | _(empty)_ | _(empty)_ | — | — |
| Monad mainnet (143) | _(empty)_ | _(empty)_ | _(empty)_ | — | — |

---

## 3. `ReputationRegistry.sol` — On-chain Reputation Registry (new)

**Purpose:** Lets the Chainlink CRE workflow write the data it pulls from external threat-intelligence sources (scam-address feeds etc.) on-chain in a verified way, so that the `reputation.ts` detector in `apps/server` can read it.

### 3.1 Functions (as built — `contracts/src/ReputationRegistry.sol`)

```solidity
function reportFlagged(address target, uint8 severity, string calldata reasonCode) external; // authorized CRE forwarder only
function clearFlag(address target) external;                                                  // owner/forwarder only
function isFlagged(address target) external view returns (bool, uint8 severity, string memory reasonCode);
function onReport(bytes calldata metadata, bytes calldata report) external;                     // CRE receiver; report = abi.encode(address[], uint8[], string[]), severity 0 clears
function setForwarder(address forwarder) external;                                           // owner
```

Severity 1 low … 4 critical. The server treats 3+ (or any flagged EOA) as a blocklist entry (`KNOWN_MALICIOUS_ADDRESS`) and a flagged contract below 3 as reported (`RISKY_CONTRACT_INTERACTION`).

### 3.2 Access Control
Only the verified callback address forwarded by the CRE workflow (`onlyForwarder` modifier) can write — see `notes (4).txt`: "forward-contract pattern separates a safe local simulation from production authority." In development a local forward address is used; at deployment the real address is set and the state-setting callback is restricted to that address.

### 3.3 Events
```solidity
event ReputationFlagged(address indexed target, uint8 severity, string reasonCode, uint256 timestamp);
event ReputationCleared(address indexed target);
event ForwarderSet(address indexed forwarder);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### 3.4 Deployment Table

| Network | Address | Forwarder (CRE) | Deploy date |
|---|---|---|---|
| Monad testnet (10143) | _(empty)_ | _(empty)_ | — |

---

## 4. Cleanverse Integration — Contract or API?

Cleanverse has its own CVI (identity) / CVA (asset) contracts (provided by the sponsor). Baret does **not rewrite** them; it calls `complianceVerify` from its own `compliance.ts` detector and/or (if any) from the transfer hook of our own contracts. Whether a new contract is needed on the Baret side (e.g. a sample "gated asset" demo contract wrapping the Cleanverse rules) will be decided in `DECISIONS.md` — a minimal sample contract will probably be needed for the showcase.

---

## 5. Test Plan

- [x] `forge test -vv` — all unit + fuzz tests green (26 tests, 2026-10-01).
- [x] `PaymentGuard`: cap overflow, old agent after revoke, and two merchants' reserves not getting mixed up scenarios.
- [x] `ReputationRegistry`: only the forwarder can write, a non-owner cannot write.
- [ ] With Tenderly: the trace of a real "unlimited approve" and "payment to a flagged address" scenario is recorded (for the demo video).
- [ ] After deploying to testnet: live verification with `cast call`, the address tables (§2.6, §3.4) are filled in.

---

## 6. Security Checklist (pre-deployment)

- [x] Reentrancy protection (`pay`/`withdraw`/`deposit` — own lock + checks-effects-interactions).
- [ ] Integer overflow/underflow — Solidity ≥0.8 native protection, but the cap math is still fuzz-tested.
- [x] `onlyOwner` / agent check / `onlyForwarder` on every sensitive function.
- [x] The owner private key is never written to the repo/logs; the deploy script takes it on the command line.
- [x] Apply our own risk model to our own contract: `deposit` pulls exactly the approved amount, so the owner never needs an unlimited approval to the vault.
