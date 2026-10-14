# Competitive landscape: pre-sign checks and agent payment controls

Where Baret sits among the tools that look at a transaction before it is signed, and among the controls people put on agents that pay. Written for the Monad Metropolis judges on 2026-10-14.

**Scope and care.** Other products are described only in general, widely known terms, **as of October 2026**. No figures, customers, prices or chain coverage are given for anyone else, because we have not measured them. Where a competitor may already do something we list as a Baret difference, we say so. Every claim about Baret links to where it can be checked.

---

## 1. The categories

| Category | What it is, in general | Where it runs | Who owns the rules |
|---|---|---|---|
| **Wallet-embedded scanning** (for example Blockaid inside several wallets) | A commercial scanning service that a wallet calls before it shows the confirm screen; the wallet shows a warning or blocks | Inside the wallet vendor's confirm flow | The scanning vendor and the wallet |
| **A wallet with its own pre-sign simulation** (for example Rabby) | The wallet simulates the transaction and shows balance changes and risk notes on its confirm screen | Inside that one wallet | The wallet |
| **Browser-extension scanners** | An extension installed beside the user's wallet that intercepts sign requests on web pages and warns | In the user's browser, next to any wallet | The extension vendor |
| **Simulation APIs** (offered by node and developer-tool providers) | An API that runs a transaction against chain state and returns its effects; the caller decides what to do with them | Called by a developer's backend | The developer (there is no verdict, only effects) |
| **Agent payment controls** (spend policies in agent wallet SDKs, smart-account session keys and permission modules) | Limits on what an agent's key may do: amount caps, allowed contracts, expiry | In the wallet provider's backend or in a smart-account module | The agent's owner, within what the provider offers |

These are complements more often than rivals: a wallet with built-in simulation can still call Baret, and a session key can still sit behind a pre-sign check.

## 2. What Baret is

A pre-sign check that **any** wallet, dapp or agent calls over HTTP, through an SDK or over MCP. It simulates the transaction on Monad (`debug_traceCall`), runs nine detectors on the trace, applies the signer's own policy and answers Safe, Caution or Blocked with the reasons. For agents it adds an on-chain vault, PaymentGuard, with per-merchant caps. Details: [`README.md`](../../README.md), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/API_REFERENCE.md`](../API_REFERENCE.md).

## 3. What Baret does differently

Each point is a design choice that is built and live on Monad testnet today; the proof is linked.

1. **An open layer, not a feature of one wallet.** The same check is called by a passkey wallet, a browser extension wallet, six demo dapps, an agent's signer, a MetaMask Agent Wallet plugin and an outside project (Venue). One HTTP call with no key: `POST https://baret-monad-api.onrender.com/v1/analyze`. SDKs on npm: `@baret/guard`, `@baret/agent-kit` (0.1.3). MCP endpoint: `POST /mcp` ([D-045](../DECISIONS.md)). Licence MIT ([`LICENSE`](../../LICENSE)). Wallet-embedded scanners and wallets with built-in simulation serve the users of the wallet that ships them; Baret's check can be put in front of any signer.
2. **The policy belongs to the signer.** 25 rules, starting from a Strict, Balanced or Permissive template, sent with each request. In the Baret wallet the person's rules are stored encrypted with a key from their own passkey, in a contract on Monad (`SealedStore`), where Baret's server can neither read nor change them ([`docs/submission/TEXTS.md`](../submission/TEXTS.md), "Why it is different"). In a vendor scanner the vendor decides what is malicious; in Baret the vendor supplies the detectors and the signer decides what blocks.
3. **Fail-closed when data is missing.** A simulation that cannot run, a detector that cannot answer, or a data source the signer's rules depend on that is down: each ends in Blocked. The SDK, the agent kit, the MetaMask plugin (`BARET_NO_VERDICT`) and the MCP tools treat no answer as Blocked ([`packages/metamask-plugin/README.md`](../../packages/metamask-plugin/README.md), [`docs/API_REFERENCE.md`](../API_REFERENCE.md) `POST /mcp`). Many consumer tools fail open (show no warning) when their scanner is unreachable, so that the user is not stuck; we have not checked each product and do not claim which ones.
4. **Models explain and review; they never decide.** The verdict comes from the simulation and written rules, so the same transaction gets the same answer. KIMI writes the plain-words reading of a verdict it cannot change; Qwen reviews an agent's payment and can only veto ([D-028, D-035](../DECISIONS.md)). A fooled model can at worst refuse a good payment.
5. **On-chain caps under the off-chain check.** An agent pays from a PaymentGuard vault with per-merchant caps per payment, per hour and per day, and a revoke the owner can pull. If every off-chain check were bypassed, the contract still refuses an over-cap payment. Live example: the Dynamic agent's payment [`0x06a81dda...24ab3`](https://testnet.monadscan.com/tx/0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3). Smart-account session keys offer similar on-chain limits; Baret's difference is that the same verdict that guards a person's wallet also guards the agent's payment, before signing and in the contract.
6. **Threat data that anyone can read.** The reputation registry is a contract on Monad (`0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`), filled by a Chainlink CRE workflow from ScamSniffer's public blacklist (simulated with the CRE CLI with real testnet writes, e.g. [`0x5d72012b...1175`](https://testnet.monadscan.com/tx/0x5d72012bb7bed6dbbe6ade3dd40d3a4243137b2482dc1205b4cbbd5f39fb1175)). Other inputs: Nansen labels, Cleanverse A-Pass credentials read on chain, Envio-indexed vault history ([`docs/BOUNTIES_AND_TRACKS.md`](../BOUNTIES_AND_TRACKS.md)).
7. **Compliance as a detector.** Before a Cleanverse Verified Asset moves, both parties' A-Pass credentials are read on chain; a party without one is Blocked, and `CompliantPaymentGuard` enforces the same in the contract. Settled through the live API: [`0x2052c1b9...3a942`](https://testnet.monadscan.com/tx/0x2052c1b9c6de8352fb7d69f9fd558e2a45552e8993371eadc00adb6b32a23942).
8. **Monad-native.** One chain, by design: chain ids 10143 and 143 only, Monad's trace RPC, Monad's Sourcify for source verification. No multi-chain abstraction to keep in step.
9. **x402 payments checked before signing.** `payX402` in `@baret/agent-kit` signs an EIP-3009 authorisation only for exactly the terms of the 402 response and only when Baret clears it ([`docs/X402_FACILITATOR.md`](../X402_FACILITATOR.md)).

## 4. What Baret does not do yet

Said plainly, so the comparison is fair. Details and owners: [`docs/SYSTEM_GAPS.md`](../SYSTEM_GAPS.md).

- **Testnet only.** Nothing is deployed on Monad mainnet; the team decided against it for the event. See [`docs/next-steps/mainnet-readiness.md`](../next-steps/mainnet-readiness.md).
- **Threat coverage is small.** Nine detectors and one public blacklist feed, against vendors that run large curated threat databases and dedicated research teams. Baret's strength is the open, signer-owned decision, not the size of its data.
- **A `personal_sign` message is not checked** (there is nothing to simulate); it is shown as the text it signs.
- **One server process, state in memory, no SLA** (G-10). The API is open with no keys; per-visitor rate limits and daily caps bound abuse (G-17).
- **Contracts are not audited** (G-18); they are tested (85 Foundry tests including fuzz and invariants) and source verified on Monad's Sourcify.
- **The CRE workflow is not deployed to a DON** (Chainlink grants deploy access after an NDA and commercial terms).
- **The extension is not in the Chrome Web Store yet** (submitted 2026-10-12, pending review: [`docs/STORE_LISTING.md`](../STORE_LISTING.md)).
- **One outside integrator so far** (Venue, an independent developer's project). No production wallet ships Baret.

## 5. Summary

Baret's position is the open, signer-owned verdict layer for Monad: callable from any wallet, dapp or agent, deterministic, fail-closed, with model help that cannot change the answer, and with an on-chain vault that holds an agent's limits even when everything off-chain fails. Established scanners have more data and reach; Baret is the piece a Monad team can call without adopting a wallet or a vendor's rules. Who would call it and how: [`market-and-integrators.md`](market-and-integrators.md).
