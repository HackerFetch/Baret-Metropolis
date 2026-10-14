# Who integrates Baret, and how

Baret is a layer other products call before they sign. This page lists who would call it, through which surface, and which file to start from. Every fact here is in the repository or on the live system as of 2026-10-14; the plan after the hackathon is the one in [`docs/submission/TEXTS.md`](../submission/TEXTS.md) ("Go-to-market").

Everything runs on **Monad testnet (chain id 10143)**. Nothing is on mainnet: [`docs/next-steps/mainnet-readiness.md`](../next-steps/mainnet-readiness.md).

---

## 1. The integration surfaces

| Surface | What it is | Start from |
|---|---|---|
| **HTTP API** | `POST https://baret-monad-api.onrender.com/v1/analyze`, no key. Takes a transaction or typed data, a network and a policy template or rules; answers `safe`, `caution` or `blocked` with findings | [`docs/API_REFERENCE.md`](../API_REFERENCE.md), the curl sample in [`README.md`](../../README.md) |
| **`@baret/guard`** (npm, 0.1.3) | TypeScript SDK: `TransactionGuard.evaluate`; no answer is treated as blocked; 0.1.3 adds a helper that says when a verdict is expired or for the wrong chain | [`packages/guard/README.md`](../../packages/guard/README.md) |
| **`@baret/agent-kit`** (npm, 0.1.3) | The guarded agent signer: `guardedSubmit` signs a Safe transaction and refuses a Blocked one; `payX402` for HTTP 402 payments; PaymentGuard vault payments; the Qwen reviewer; the `baret` CLI | [`packages/agent-kit/README.md`](../../packages/agent-kit/README.md) |
| **`@baret/llm`** (npm, 0.1.3) | The KIMI and Qwen clients the explain and review routes use | `packages/llm` |
| **MCP** | `POST https://baret-monad-api.onrender.com/mcp`: Baret's checks as read-only MCP tools; an error result says to treat it as blocked ([D-045](../DECISIONS.md)) | [`docs/API_REFERENCE.md`](../API_REFERENCE.md) `POST /mcp`; samples on <https://usebaret.com/agents> |
| **PaymentGuard vault** | On-chain vault with per-merchant caps per payment, hour and day, pause and revoke; a factory opens new vaults | [`docs/CONTRACTS.md`](../CONTRACTS.md) |
| **Reputation registry** | A public contract on Monad any caller can read (`0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`) | [`docs/CONTRACTS.md`](../CONTRACTS.md), [`workflows/README.md`](../../workflows/README.md) |
| **MetaMask Agent Wallet plugin** | `mm baret check` and `mm baret send` in front of the Agent Wallet CLI | [`packages/metamask-plugin/README.md`](../../packages/metamask-plugin/README.md) |

## 2. Who integrates, and through what

### Dapps on Monad that move user funds

Order books, launchpads, yield and claim pages: they call the check before handing a request to the user's wallet, so a request their own front end should never produce is refused, and the user sees what it will do.

- Surface: `@baret/guard` in the signing path, or the HTTP API from a backend.
- Shown working: the six demo sites on <https://usebaret.com/showcase>, each with an honest version and an attack, checked live.
- Evidence: **Venue** (below).

### Builders of agents that pay (x402)

An agent with a key needs a budget, a policy and a kill switch. Baret gives the PaymentGuard vault (caps enforced on chain), the pre-sign check on every payment, and the owner's revoke.

- Surface: `@baret/agent-kit` (`guardedSubmit`, `payX402`, vault payments, the `baret` CLI) or the MCP endpoint for an agent framework that speaks MCP.
- Shown working: <https://usebaret.com/agents> (a playground with eight kinds of payment, a real Dynamic agent's vault payments read from the Envio indexer, a registry lookup and a quickstart); <https://usebaret.com/review> (the Qwen reviewer, veto only). The x402 flow end to end: [`docs/X402_FACILITATOR.md`](../X402_FACILITATOR.md).
- Evidence on chain: the Dynamic agent's vault payment [`0x06a81dda...24ab3`](https://testnet.monadscan.com/tx/0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3); the demo vault's latest payment [`0x36eccc74...25136`](https://testnet.monadscan.com/tx/0x36eccc744b5ceab7916f93e55146819fb137f2d6e229093e0d8b66c46cd25136).

### Wallets on Monad

A wallet adds Baret as the step between "the site asked" and "the sign button appears".

- Surface: the HTTP API or `@baret/guard` in the confirm flow.
- Shown working: two wallets built on the layer in this repository: the Baret web wallet (<https://wallet.usebaret.com>, a Mera passkey account) and the browser extension wallet (<https://usebaret.com/install>), which refuses a Blocked request in its own window. Their surfaces: [`docs/WALLET.md`](../WALLET.md).

### The MetaMask Agent Wallet

- Surface: the plugin in `packages/metamask-plugin`. It can only remove proposals; MetaMask's own policy still judges what it passes.
- State: built and checked on 2026-10-07 with a real Agent Wallet on Monad testnet ([D-027](../DECISIONS.md)): it refused a flagged address and an unreachable Baret without calling the wallet. Not shown: a confirmed send, because the Agent Wallet does not send on chain 10143. Not published to npm. The MetaMask bounty was not entered ([`docs/BOUNTIES_AND_TRACKS.md`](../BOUNTIES_AND_TRACKS.md) row 12).

### Compliance-bound payment flows (Cleanverse)

Where a Cleanverse Verified Asset moves, both parties must hold an A-Pass. Baret reads the credentials before signing; `CompliantPaymentGuard` enforces the same in the contract.

- Surface: the HTTP API or `@baret/guard` (the compliance detector runs inside `/v1/analyze`); the contract for agent payments.
- Evidence: aUSDC settled through the live API [`0x2052c1b9...3a942`](https://testnet.monadscan.com/tx/0x2052c1b9c6de8352fb7d69f9fd558e2a45552e8993371eadc00adb6b32a23942); the payment to a wallet with no credential was Blocked before signing.

## 3. Evidence of use

- **Venue.** On 2026-10-13 an independent developer, the author of [Venue](https://github.com/brutaldevvin/venue), an order book for Cleanverse Verified Assets on Monad testnet, wired `@baret/guard` 0.1.2 into Venue's signing path from the npm package and its README alone: [the commit](https://github.com/brutaldevvin/venue/commit/cf3371607ccccca80e099b9718a6a16f7c730803), [their report with nine points of feedback](https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md). Their real `approve(settlement, 2^255 - 1)` exposed a fault in Baret's unlimited-allowance bar; it was fixed the same day ([D-049](../DECISIONS.md)) and the same request then came back Blocked. No transaction was signed or sent in their checks.
- **npm.** `@baret/guard`, `@baret/agent-kit` and `@baret/llm` at 0.1.3 (published 2026-10-13); 0.1.3 was cut from Venue's feedback.
- **The live API** answers without a key; `verify:demo` sends twenty scenarios and agreed on 20 of 20 against it ([`README.md`](../../README.md)).

What is not evidence yet: no production wallet ships Baret, and Venue is the only outside integrator so far.

## 4. The plan after the hackathon

From [`docs/submission/TEXTS.md`](../submission/TEXTS.md), "Go-to-market":

1. **Wallets:** the MetaMask Agent Wallet plugin as the first wallet integration and the reference shown to other Monad wallet teams.
2. **Everyday users:** the extension in the Chrome Web Store (submitted 2026-10-12, in review: [`docs/STORE_LISTING.md`](../STORE_LISTING.md)).
3. **Agent builders:** the x402 check and the vault taken to teams building paying agents on Monad, with `/agents` as the one-minute trial.
4. **Dapps:** Venue's remaining feedback as the next SDK release: structured error codes with retry hints, a viem example and a multi-party example.

What the team measures: the number of projects that call the check in their signing path, and the findings their real transactions surface. What has to change before any of this runs on mainnet: [`docs/next-steps/mainnet-readiness.md`](../next-steps/mainnet-readiness.md). How Baret compares with other pre-sign tools: [`competitive-landscape.md`](competitive-landscape.md).
