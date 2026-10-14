# Baret — x402 & Facilitator Design

> The implementation of the HTTP 402-based micropayment flow inside Baret. Goal: prevent an AI agent from **blind-signing** a 402 response — every payment is decoded and passed through the policy before it is sent.

Last updated: 2026-10-11 · Status: **checked and settled.** Baret checks an x402 payment (its shape, asset, destination and the caps) and returns a verdict, live and tested (§5). Since D-046 (2026-10-11), `GET /demo/paywall` is a real paywall endpoint: the server verifies the signed EIP-3009 authorisation and settles it on Monad testnet, acting as its own facilitator (`docs/SYSTEM_GAPS.md` G-05, closed). Proven with real transfers: `pnpm --filter @baret/server verify:x402` passes 8 of 8 against the live API (checked 2026-10-11, tx `0x207612b6021852a76b63569dc4b9504c1a9036debf2fb8e9581e46d0d7dc2d61`, block 70138038). There is still no separate facilitator service. The rest of this file is the design.

---

## 1. What is x402 (short)

When an API is accessed without payment, it returns `402 Payment Required` + `PaymentRequirements` (to whom, how much, which asset, which network). The client (usually an AI agent) uses this information to pay and re-sends the request. In the default behavior the agent pays automatically **without showing this information to anyone** — this blind-signing problem is exactly what Baret solves (see `PROJECT_OVERVIEW.md` §2, `docs/research/workshop-notes-kickoff-envio-alchemy-zerion.txt`: "No one's going out there and pasting private keys around anymore").

## 2. Roles

| Role | Responsibility |
|---|---|
| **Resource server** | Serves the protected API, returns 402 on an unpaid request |
| **Client / Agent** | Pays and re-sends the request — the Baret extension intercepts this step |
| **Facilitator** | Intermediary service that verifies the payment proof (payment signature/header) and writes it on-chain / performs settlement |
| **Baret x402 interceptor** | Intercepts `fetch` at the moment of the 402, decodes `PaymentRequirements`, runs it through the policy check |
| **Baret policy engine** | Merchant allowlist, asset allowlist, per-tx/hourly/daily cap checks |

## 3. Flow (sequence)

```mermaid
sequenceDiagram
    participant Agent
    participant Ext as Baret Extension (x402 interceptor)
    participant Server as Resource Server
    participant Guard as Baret Guard/Policy
    participant Facilitator

    Agent->>Server: GET /resource (unpaid)
    Server-->>Agent: 402 + PaymentRequirements
    Note over Ext: fetch response is intercepted
    Ext->>Ext: decode PaymentRequirements (to whom, how much, asset, network)
    Ext->>Guard: policy check (merchant/asset allowlist, cap)
    alt Policy: allow
        Ext->>Agent: payment header is prepared (Baret signs/approves)
        Agent->>Server: GET /resource + PAYMENT-SIGNATURE header
        Server->>Facilitator: payment verification request
        Facilitator-->>Server: verified
        Server-->>Agent: 200 + resource
        Server->>Facilitator: settleAfterSuccess (settlement)
    else Policy: block
        Ext-->>Agent: error — payment not sent, nothing was signed
    end
```

## 4. Implementation on the Baret Side

### 4.1 Extension interceptor
`apps/extension/src/inpage/x402-interceptor.ts` (target file) — wraps the page's `fetch` calls, catches the `402` status code, parses the `PaymentRequirements` in the body.

### 4.2 Server-side risk detector
`apps/server/src/risk/detectors/x402.ts` — cross-checks the actual payment transaction against the `PaymentRequirements` the server **actually requested**:

| Finding code | Meaning |
|---|---|
| `X402_MEMO_MISSING` | The policy requires a memo but there is none |
| `X402_NON_CANONICAL_ASSET` | The payment is being attempted with an asset outside the allowlist |
| `X402_DESTINATION_MISMATCH` | The address the payment goes to differs from what the server requested |
| `X402_ASSET_MISMATCH` | Asset mismatch (e.g. a different token instead of USDC) |

### 4.3 Policy fields (`GuardPolicy.x402`)
```ts
{
  requireMemo: boolean;
  allowedAssets: string[];          // list of 0x addresses
  allowedMerchantOrigins: string[]; // allowed recipient/merchant origins
  maxPerTxCap: string;              // single payment ceiling
  maxHourlyCap: string;
  maxDailyCap: string;
}
```
These fields are **conceptually the same model** as `setMerchantCap` in `PaymentGuard.sol` — the two layers, off-chain (extension level, for the human user) and on-chain (for agent/autonomous use), speak the same policy language.

### 4.4 Facilitator
- Within the hackathon scope, instead of writing our own facilitator (time constraint), the **standard x402 facilitator** will be used first; if writing our own facilitator becomes necessary (e.g. for Monad-specific verification logic), that decision will be added to `DECISIONS.md`.
- Facilitator URL, network identifier: **`eip155:10143`** (Monad testnet) / **`eip155:143`** (mainnet) — CAIP-2 format, no reference to any other chain.
- Env: `X402_ENABLED`, `X402_PAY_TO` (Monad address), `X402_FACILITATOR_URL`, `X402_NETWORK`, `X402_ANALYZE_PRICE`.

### 4.5 Demo Endpoint
`GET /demo/paywall?q=...` — feeds a demo scenario in the showcase (the Monad-themed, renamed version of the "scrybe" concept from the old repos — the name will be settled in `DECISIONS.md`): unpaid request → 402 → Baret decodes the payment and approves/rejects it → on success, the response + on-chain proof.

## 5. Test / Demo Plan

- [x] Happy path: a payment within the cap to a merchant on the allowlist — passes automatically.
- [x] Rejection path: asset outside the allowlist — `X402_NON_CANONICAL_ASSET`, payment is not sent.
- [x] Caution path: destination address mismatch (a fake 402 response is simulated): `X402_DESTINATION_MISMATCH`, a warning by design (D-014): the engine answers Caution under Balanced and Permissive and Blocked under Strict; the agent-kit refuses a Caution unless `allowCaution` is set (D-022), so the payment is not sent.
- [x] Cap overflow: consecutive requests exceeding the hourly limit — blocked.
- [x] A real settlement on Monad testnet (D-046, 2026-10-11): `pnpm --filter @baret/server verify:x402` against the live API — the 402 terms, Baret's verdict before signing, the 200 answer, the on-chain transaction, both balances moving, and the same authorisation replayed answering 402 again. 8 of 8 (Hale, 2026-10-11, API commit `5b92f54`, tx `0x207612b6021852a76b63569dc4b9504c1a9036debf2fb8e9581e46d0d7dc2d61`, block 70138038).

The first four boxes are ticked from `verify:demo` against the live API (Hale, 2026-10-10, API commit `a34e520`, `--from 0x5AE98770795957F9a376083afcb775672FbD2C93`, 20 of 20): Scrybe "first answer, cap 0.25" safe and "sixth answer in the hour" blocked; Agents "pay a merchant" safe, "pay with a look-alike token" blocked, "pay the wrong address" caution (`X402_DESTINATION_MISMATCH`). Those five check Baret's **verdict** only, on purpose (`verify:demo`'s scenarios are not meant to spend real funds each run); the fifth box above is where an x402 payment is shown actually settling.
- [ ] These four scenarios are shown in the demo video (docs/research/workshop-notes-nansen-dynamic-aurora.txt: visualizes the "adversarial layer... personal CFO agent" narrative).
- [ ] Scrybe's own "Pay with your wallet" button (E15, E13) checked live in a browser, from a connected wallet and from the Baret wallet. Left for H10.

## 6. Open Decisions

- Will we write our own facilitator or use an existing one? → Decision pending in `DECISIONS.md`.
- The name of the demo scenario (replacing the old "scrybe") → Decision pending in `DECISIONS.md`.
