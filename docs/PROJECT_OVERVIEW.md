# Baret — Project Overview (PRD)

> **This file is the single authority on the question "what are we building and why".** For architecture details see `ARCHITECTURE.md`; for scope/bounty priority see `BOUNTIES_AND_TRACKS.md`.

Last updated: 2026-09-13 · Status: **Planning complete, implementation has not started**

---

## 1. Problem

When a user on Monad (human or AI agent) opens a dApp and clicks "Approve":

- They cannot see what will actually happen behind the scenes (which contract is being called, which function, with which parameters).
- They cannot tell whether an ERC-20 `approve` call is unlimited or limited.
- They do not recognize drain primitives such as `setApprovalForAll`, `permit` (EIP-2612), `delegatecall`, `selfdestruct` or ownership transfer.
- An AI agent paying automatically via x402 **signs blind**, without checking the amount/address the server asks for in its 402 response.
- When an agent is given a private key, there is no mechanism that limits what that key can do — if the key is compromised or the agent makes a mistake, the loss is unbounded.

The result: wallet drainers, rug pulls, phishing and "giving the agent too much authority" mistakes are hurting users. This is a trust problem that Monad's speed (400ms blocks, 800ms finality) cannot solve — on the contrary, the faster the chain gets, the less possible it becomes to reverse a mistaken/malicious transaction.

## 2. Solution

Baret is a security/policy layer that steps in **before** the moment of signing:

```
User/Agent is about to sign  →  Baret steps in
                                 ↓
           Simulates the transaction via Monad RPC (without actually sending it)
                                 ↓
                   Runs the independent risk detectors
                     (approval, reputation/Nansen, compliance/Cleanverse,
                      deep call tree, x402 payment shape...)
                                 ↓
                     Applies the user's own policy
                                 ↓
          "safe: true/false" + reasoning + estimated balance change
```

For agents, additionally: instead of a raw private key, an on-chain spend-limited vault called **PaymentGuard** + a narrowly scoped signing authorization (sub-key) derived from the Mera passkey. The agent can only pay from this vault within the defined limits and to the defined merchants — the owner does not need to approve every payment one by one, but the owner can revoke the authorization at any time.

## 3. Who Uses It

| User type | Need | Baret's answer |
|---|---|---|
| End user (wallet owner) | "What happens if I sign this transaction, how much do I lose?" | Standalone wallet demo (`apps/wallet`, with Mera) or browser extension (`apps/extension`) — a visual report before signing |
| dApp developer | Protect their users from risky transactions, build trust | The `@baret/guard` SDK — pre-sign check in a few lines |
| AI agent / autonomous bot developer | Have the agent execute transactions automatically without giving it unlimited authority | `@baret/agent-kit` — guarded signer + CLI + PaymentGuard vault |
| Wallet/infrastructure provider (like MetaMask Agent Wallet) | Offer their users a ready-made security layer | Baret's plugin package (`packages/metamask-plugin`) |

## 4. Core User Journeys

### 4.1 End user — clicking a risky approval
1. The user clicks "Claim" on a fake dApp in the showcase (e.g. the "claimhub" airdrop site).
2. The Baret extension/wallet intercepts the transaction before requesting a signature and sends it to `/v1/analyze`.
3. Server: decode → simulation → risk detectors → policy → decision.
4. The user sees a reasoned card in the UI such as "This transaction requests unlimited token approval and the recipient is a known phishing address — blocked".
5. The user can still say "sign anyway" if they want (depending on the default policy), but they do so knowingly.

### 4.2 Agent developer — automatic x402 payment
1. The agent sends a request to an API and receives 402 + `PaymentRequirements`.
2. The extension's x402 interceptor catches this response and decodes the actual payment parameters (to whom, how much, which asset).
3. Policy check: is the merchant on the allowlist, is the asset on the allowlist, is the hourly/daily spending cap exceeded?
4. If it passes, the payment header is sent; if not, an error is returned to the agent and nothing is signed.

### 4.3 Agent developer — delegated authority with PaymentGuard
1. The owner creates a smart wallet with their Mera passkey and deposits USDC into the PaymentGuard vault.
2. They define a per-merchant per-tx cap + a 24-hour rolling cap on the vault.
3. A separate, narrowly scoped sub-key for the agent is derived from Mera's PRF-derived key material.
4. The agent calls `pay()` with this sub-key — the owner's main key is never involved, and the owner can pause the vault / reset the limit at any time.

## 5. MVP Scope (must be working in Weeks 1-2)

- [ ] The `/v1/analyze` endpoint: decode + simulate + risk detectors + policy → decision for a single Monad testnet transaction.
- [ ] At least these detectors: unlimited approval, setApprovalForAll, unknown/risky contract, reverting tx.
- [ ] Simple policy engine (on/off rules, at least 8-10 of them).
- [ ] At least 2 threat scenarios in the showcase (with safe/danger variants).
- [ ] PaymentGuard.sol deployed to Monad testnet, basic `deposit/pay/withdraw` working.

Everything beyond the MVP (Nansen, Mera, Dynamic, Cleanverse, Envio, CRE, Qwen, MetaMask plugin) is added according to the tier order in `BOUNTIES_AND_TRACKS.md`.

## 6. Out of Scope (Non-goals)

- Baret is **not** itself a DEX/trading interface — we are not targeting trading bounties like Kuru/Perpl (see `BOUNTIES_AND_TRACKS.md` → "Skip" list).
- It is **not** a mobile payment/cross-border transfer application — the Agora bounties are out of scope.
- We are not building a persistent, multi-tenant SaaS infrastructure; for the duration of the hackathon it is enough that it runs as a single instance at demo scale.
- There is **absolutely no** general-purpose "run on every chain" design — Monad only.

## 7. Success Criterion ("magic moment")

A user tries a risky scenario in the showcase for the first time and, **with zero technical knowledge**, gets the feeling "I almost lost my money, Baret stopped it" within 30 seconds. This moment must be at the center of the demo video. Every step of onboarding must speed up reaching this moment; every step that delays it (an unnecessary form, an unexplained security prompt) must be eliminated.

## 8. Glossary

| Term | Meaning |
|---|---|
| **Guard / TransactionGuard** | The client SDK that sends the transaction to the analysis API before signing and obtains a decision |
| **Policy** | The user-defined rule set of on/off + threshold values (`GuardPolicy`) |
| **Risk finding** | A single finding produced by a detector (`code`, `severity`, `message`) |
| **PaymentGuard** | The on-chain vault contract from which agents can make limited payments without human approval |
| **Sub-key** | A narrowly scoped signing authorization derived from Mera PRF material, separate from the main key |
| **x402** | The protocol built on HTTP 402 "Payment Required" that lets agents pay automatically |
| **Compliance detector** | The risk detector that blocks a transfer that has not passed Cleanverse CVI identity verification |
