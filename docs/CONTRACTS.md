# Baret — Smart Contract Specification

> Design of the contracts to be deployed to Monad testnet/mainnet with Foundry. Before code is written, this file is used as the spec; after deployment the address table is filled in and this file is kept up to date.

Last updated: 2026-10-01 · Status: **Both contracts deployed to Monad testnet on 2026-10-02 and source-verified (Sourcify exact match). 26 forge tests passing**

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

### 2.6 Deployment Table

State of the testnet vault since 2026-10-05: 5 USDC deposited; agent signer `0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353`, a Dynamic server wallet (D-019); merchant `0x1365566191bAA9872A64AcDce963751d5343ff49` (the Scrybe demo merchant) with caps 0.50 per payment, 1 per hour, 2 per day. Payments through `baret pay`: `0x0b01928b2ec0edc8fa325a89c702cea78268582621c4db4f16a02df8de4e845b` (0.25 USDC, local test key, before the handover) and `0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3` (0.25 USDC, signed by the Dynamic wallet). The same command above the cap, a send to the flagged wallet, and a payment from the replaced test key are each stopped by Baret before anything is signed.

The testnet vault is Baret's own demo and test vault: its owner is the deploy key, which lives only on Ezgin's machine (`~/.baret/deployer.key`, never committed). Users get their own vaults from the wallet app later; `owner` is immutable, so this instance never changes hands. The deploy record is `contracts/broadcast/Deploy.s.sol/10143/run-latest.json` (start blocks for the Envio indexer).


| Network | Address | Token (USDC) | Owner | Deploy date | Deployer |
|---|---|---|---|---|---|
| Monad testnet (10143) | [`0x0A82671420114E47c672D5e8e23017DdCE850A35`](https://testnet.monadexplorer.com/address/0x0A82671420114E47c672D5e8e23017DdCE850A35) | USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals, checked on-chain) | `0x5aE13F1028144842f0384d09091067D6184F8197` (deployer) | 2026-10-02, block 67604750 | `0x5aE13F1028144842f0384d09091067D6184F8197` |
| Monad mainnet (143) | _(empty)_ | _(empty)_ | _(empty)_ | — | — |

### 2.7 `PaymentGuardFactory.sol` — a vault for every owner

A vault's owner is fixed at deployment, so each account needs its own. `createVault(token)` deploys a `PaymentGuard` with the caller as owner; `latestVault(owner)` / `vaultsOf(owner)` let a wallet find its vaults from the owner's address alone; `isVault(address)` lets anyone, the Baret server included, check that an address is a vault this factory deployed. The factory holds no funds and has no owner. 3 forge tests.

| Network | Address | Deploy date |
|---|---|---|
| Monad testnet (10143) | [`0xDe897d4dF6E1c34aB868948dE035AE29D32eA822`](https://testnet.monadexplorer.com/address/0xDe897d4dF6E1c34aB868948dE035AE29D32eA822) (source verified) | 2026-10-05, block 68468744 |

The server treats the factory and every vault it deployed as known contracts (`MONAD_TESTNET_PAYMENT_GUARD_FACTORY_ADDRESS`), so a wallet's calls to its own vault are not reported as an unknown contract. An earlier factory without `isVault` at `0xb77b35a7Ac932952d4E9545193e5435049d1b1b3` is unused.

Checked end to end on 2026-10-05 with `pnpm --filter @baret/server verify:wallet` (real transactions, `@baret/wallet-core`): open a vault, fund it, authorise an agent key derived from the passkey, cap a merchant, the agent pays, an over-cap payment is stopped, revoke, the revoked agent is stopped. Test vault `0xE0B411E9F1f48194A9Aa426B2F955e16B4b8a8Bd`.

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
| Monad testnet (10143) | [`0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`](https://testnet.monadexplorer.com/address/0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411) | `0x5aE13F1028144842f0384d09091067D6184F8197` (deployer, until the CRE forwarder exists) | 2026-10-02, block 67604757 |

---

## 4. Cleanverse Integration — Contract or API?

Cleanverse has its own CVI (identity) / CVA (asset) contracts (provided by the sponsor). Baret does **not rewrite** them; it calls `complianceVerify` from its own `compliance.ts` detector and/or (if any) from the transfer hook of our own contracts. Whether a new contract is needed on the Baret side (e.g. a sample "gated asset" demo contract wrapping the Cleanverse rules) will be decided in `DECISIONS.md` — a minimal sample contract will probably be needed for the showcase.

---

## 5. Test Plan

- [x] `forge test -vv` — all unit + fuzz tests green (26 tests, 2026-10-01).
- [x] `PaymentGuard`: cap overflow, old agent after revoke, and two merchants' reserves not getting mixed up scenarios.
- [x] `ReputationRegistry`: only the forwarder can write, a non-owner cannot write.
- [ ] With Tenderly: the trace of a real "unlimited approve" and "payment to a flagged address" scenario is recorded (for the demo video).
- [x] After deploying to testnet: live verification with `cast call`, the address tables (§2.6, §3.4) are filled in. Source verified on Monad's Sourcify (`forge verify-contract --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org`).

---

## 6. Security Checklist (pre-deployment)

- [x] Reentrancy protection (`pay`/`withdraw`/`deposit` — own lock + checks-effects-interactions).
- [ ] Integer overflow/underflow — Solidity ≥0.8 native protection, but the cap math is still fuzz-tested.
- [x] `onlyOwner` / agent check / `onlyForwarder` on every sensitive function.
- [x] The owner private key is never written to the repo/logs; the deploy script takes it on the command line.
- [x] Apply our own risk model to our own contract: `deposit` pulls exactly the approved amount, so the owner never needs an unlimited approval to the vault.

---

## 7. Showcase demo contracts (Monad testnet only)

Contracts the showcase dApps call so every scenario is a real transaction Baret analyses, not a prepared sample. Test value only. Source in `contracts/src/demo/`, tests in `contracts/test/demo/`, addresses and transaction builders for the frontend in `packages/demo` (`@baret/demo`). Design: D-018.

### 7.1 NovaSwap

| Contract | Address | Role |
|---|---|---|
| `DemoUSDC` (`dUSDC`, 6 decimals) | [`0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc`](https://testnet.monadexplorer.com/address/0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc) | Test dollars. `faucet()` gives 100; the router is the only minter |
| `NovaSwapRouter` | [`0xEB9EA352613D8545d70a586C112C30D23D5C1888`](https://testnet.monadexplorer.com/address/0xEB9EA352613D8545d70a586C112C30D23D5C1888) | Honest router, 3.2 dUSDC per MON both ways, holds 0.5 MON of liquidity. In `MONAD_TESTNET_KNOWN_CONTRACTS` |
| `NovaSwapDrainer` | [`0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888`](https://testnet.monadexplorer.com/address/0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888) | Attack router. CREATE2 address ground to look like the router (`0xEB9E…1888` vs `0xeB9E…3888`). Its `swapUsdcForMon` takes the whole allowed balance and pays nothing; `drain(victim)` keeps taking. Reported in the ReputationRegistry at severity 4, reason `NOVASWAP_LOOKALIKE_DRAINER` |
| Sink | `0xac9517a70c88480c9fA7E9a280DA485F7f552C29` | Where the drainer sends what it takes. A fresh address; nobody kept its key |

All three contracts are source-verified (Sourcify exact match). Deployed 2026-10-03 by the testnet deploy key with `script/DeployNovaSwap.s.sol` and `script/DeployNovaSwapDrainer.s.sol` (records in `contracts/broadcast/`).

What Baret answers, checked live against testnet with the Balanced rules (2026-10-03):

| Request | Verdict | Findings |
|---|---|---|
| `swapMonForUsdc` on the router, 1 MON | Safe | none; changes: MON out (amount + fee for the whole gas limit), 3.2 dUSDC in |
| `approve(lookalike, max)` on dUSDC | Blocked | `ERC20_APPROVAL_UNLIMITED`, `KNOWN_MALICIOUS_ADDRESS` |
| `approve(router, 9.6 dUSDC)` | Caution | `ERC20_APPROVAL_GRANTED` |

### 7.2 PixelDrop, OrbitYield, ClaimHub, LaunchPad, the agents playground

Deployed 2026-10-05 with `script/DeployDemoSites.s.sol`, all source-verified (Sourcify exact match). "Listed" means the address is in `MONAD_TESTNET_KNOWN_CONTRACTS`.

| Site | Contract | Address | Role |
|---|---|---|---|
| PixelDrop | `NightShift` (ERC-721 `NIGHT`) | `0xC3fAFF337A197d7BFa49bB3210C0C057dd188688` | Listed. `mint(count)` at 0.01 MON, ten per wallet |
| OrbitYield | `OrbitPool` | `0x9dD3Bc0e343Bdc4AB2BCD4c96D01bc8500725f38` | Listed. `stake()` mints oMON one to one, `unstake` returns the MON |
| OrbitYield | `DemoToken` oMON | `0xB789996F13551eC6f3DF93d54D4F04A1316C3A92` | Listed receipt token |
| OrbitYield | `OrbitPoolSilent` | `0xb4cCbB7A8a0Ff5564115856C008eD9a46d306fa8` | Attack: keeps the MON, returns nothing. On no list, not reported |
| ClaimHub | `ClaimHubDistributor` | `0x7cb4a1B209dF1beDEc7843d1bf20E5723BA6Cc2b` | Listed. `claim()` sends 2,410 HUB |
| ClaimHub | `DemoToken` HUB | `0x26bC901B5489057F76D188631D6252779349684A` | Listed |
| LaunchPad | `LaunchSale` | `0x7Dc38ed77388b1dacB4653b1681dC7FBF6Dc2aac` | Listed. `contribute()` 0.01 to 1 MON, 1,000 LNTL per MON |
| LaunchPad | `DemoToken` LNTL | `0x45AF9aA34BC4CB4E91B56413f18A6D739254D959` | Listed |
| LaunchPad | `LaunchSaleProxy` / `LaunchSaleLogic` | `0x9A217845d5C5b684EBD6BF7973Da8f69dE453439` / `0xc8b0f0aA28Bb9E25Cf9d27aff3E9BB059Cb1BCC1` | Proxy sale: delegatecall into logic its owner can replace (ordinary slot, not EIP-1967). On no list |
| ClaimHub, PixelDrop | `DemoDrainer` | `0x8D42f14012426F6a844BF0f5E6ab7889F8Cd79Eb` | Attack spender/operator: `drainToken`, `drainCollection`. Reported at severity 4 (`DEMO_DRAINER`) |
| all | Sink | `0xac9517a70c88480c9fA7E9a280DA485F7f552C29` | Reported at severity 4 (`DRAINER_SINK`): the "flagged wallet" of the playground |
| Agents | `DemoToken` named `USDC` | `0x1486794fc4958686115c9797d21aAcE497326826` | A look-alike of USDC, on no list |
| Scrybe, Agents | Merchant wallet | `0x1365566191bAA9872A64AcDce963751d5343ff49` | The `payTo` of the demo 402s. Its key is on Ezgin's machine |

ClaimHub's attack is `approve(DemoDrainer, max)` on the real test USDC (`0x534b…43A3`).

### 7.3 Checking every scenario

`pnpm --filter @baret/server verify:demo -- --api <server> --from <wallet>` builds all eighteen requests with `@baret/demo`, sends them to `/v1/analyze` and compares the verdict and the finding codes with what each site expects; it exits 1 on any disagreement. `--from` is only simulated from (no key) and needs a few MON plus at least 1 real test USDC and 1 look-alike USDC. Result on 2026-10-05 against testnet: 14 of 18 agree; the four that need a real USDC balance (Scrybe twice, two playground payments) wait for the demo wallet to be funded from Circle's faucet.
