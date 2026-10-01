# Baret — Smart Contract Specification

> Design of the contracts to be deployed to Monad testnet/mainnet with Foundry. Before code is written, this file is used as the spec; after deployment the address table is filled in and this file is kept up to date.

Last updated: 2026-09-13 · Status: **Spec phase, no deployment**

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

### 2.2 Functions (draft)

```solidity
function deposit(address token, uint256 amount) external;                     // owner, transferFrom
function setMerchantCap(address merchant, uint256 perTxCap, uint256 dailyCap) external; // owner
function revokeMerchant(address merchant) external;                            // owner
function setAgentSigner(address agent) external;                               // owner — Mera PRF sub-key address
function revokeAgentSigner() external;                                         // owner — immediate revocation
function pay(address merchant, uint256 amount) external;                       // agent only, cap check
function withdraw(address token, uint256 amount) external;                     // owner
```

### 2.3 Invariants (to be tested)
- A `pay()` call reverts if it exceeds the merchant's per-tx or rolling-24h cap.
- `withdraw()` cannot drain the vault without first deducting the total reserve of active (non-revoked) merchants.
- After `revokeAgentSigner()`, a `pay()` call from the old agent address reverts under all conditions.
- Owner only: `deposit` cannot be made on someone else's behalf (msg.sender = owner required, or an explicitly authorized depositor).

### 2.4 Events (the Envio indexer will listen to these)
```solidity
event Deposited(address indexed token, uint256 amount);
event MerchantCapSet(address indexed merchant, uint256 perTxCap, uint256 dailyCap);
event MerchantRevoked(address indexed merchant);
event AgentSignerSet(address indexed agent);
event AgentSignerRevoked(address indexed agent);
event Paid(address indexed merchant, address indexed agent, uint256 amount, uint256 timestamp);
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

### 3.1 Functions (draft)

```solidity
function reportFlagged(address target, uint8 severity, string calldata reasonCode) external; // authorized CRE forwarder only
function clearFlag(address target) external;                                                  // owner/forwarder only
function isFlagged(address target) external view returns (bool, uint8 severity, string memory reasonCode);
```

### 3.2 Access Control
Only the verified callback address forwarded by the CRE workflow (`onlyForwarder` modifier) can write — see `notes (4).txt`: "forward-contract pattern separates a safe local simulation from production authority." In development a local forward address is used; at deployment the real address is set and the state-setting callback is restricted to that address.

### 3.3 Events
```solidity
event ReputationFlagged(address indexed target, uint8 severity, string reasonCode, uint256 timestamp);
event ReputationCleared(address indexed target);
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

- [ ] `forge test -vv` — all unit + fuzz tests green.
- [ ] `PaymentGuard`: cap overflow, old agent after revoke, and two merchants' reserves not getting mixed up scenarios.
- [ ] `ReputationRegistry`: only the forwarder can write, a non-owner cannot write.
- [ ] With Tenderly: the trace of a real "unlimited approve" and "payment to a flagged address" scenario is recorded (for the demo video).
- [ ] After deploying to testnet: live verification with `cast call`, the address tables (§2.6, §3.4) are filled in.

---

## 6. Security Checklist (pre-deployment)

- [ ] Reentrancy protection (`pay`/`withdraw` — checks-effects-interactions or `ReentrancyGuard`).
- [ ] Integer overflow/underflow — Solidity ≥0.8 native protection, but the cap math is still fuzz-tested.
- [ ] `onlyOwner` / `onlyAgent` / `onlyForwarder` modifiers on every sensitive function.
- [ ] The owner private key is never written to the repo/logs; the deploy script reads it from env.
- [ ] Apply our own risk model to our own contract: check that PaymentGuard itself does not carry the "unlimited approval" pattern.
