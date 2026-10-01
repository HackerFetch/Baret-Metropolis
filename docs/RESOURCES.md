# Baret — Resource Map

> Which sponsor tool/document lives where, how it is used, and what its claim status is. Source: `Resources.txt` (hackathon.monad.xyz/resources, snapshot of 2026-09-13). Before starting an integration, check the relevant row in this file and the env variables in `ARCHITECTURE.md` §9.

Last updated: 2026-09-13

---

## 1. Sponsor Perks — Claim Tracking

| Perk | Value | Claim link (in Resources.txt) | Purpose in Baret | Claim status |
|---|---|---|---|---|
| Tenderly Pro | ~$7,200 | Notion: Tenderly Access for Metropolis | PaymentGuard.sol debug/simulate, revert trace inspection, multi-step scenario rehearsal on a virtual testnet (recording before the demo) | ⬜ Not claimed |
| Quicknode Build Plan | ~$147 | Notion: Quicknode Credits for Metropolis Hackers | Backup RPC to Alchemy + webhooks (chain event monitoring) | ⬜ Not claimed |
| Zerion API Builder | ~$149 | Notion: Free Zerion API Builder Plan | Optional — backup data source for the wallet activity/parsed tx view (not primary) | ⬜ Not claimed |

**Action (Week 1):** Claim all three perks, add the keys to `.env`, update this table.

---

## 2. Official Monad Documentation — Required Reading

| Resource | When it is needed |
|---|---|
| [Differences from Ethereum](https://docs.monad.xyz/developer-essentials/differences) | Before starting to write code — differences such as parallel execution and reserve balance affect the risk model |
| [Gas pricing](https://docs.monad.xyz/developer-essentials/gas-pricing) + [Opcode pricing](https://docs.monad.xyz/developer-essentials/opcode-pricing) | When calibrating the thresholds of the `compute.ts` detector |
| [Reserve balance](https://docs.monad.xyz/developer-essentials/reserve-balance) | When computing the `minPostNativeBalance` policy field correctly |
| [EIP-7702](https://docs.monad.xyz/developer-essentials/eip-7702) | For the design of PaymentGuard's delegated signer (Mera sub-key) |
| [MERA guide](https://docs.monad.xyz/guides/mera) | `apps/wallet` Mera integration — Week 4 |
| [x402 guide](https://docs.monad.xyz/guides/x402) | Implementation of `X402_FACILITATOR.md` |
| [ERC-8004](https://docs.monad.xyz/guides/erc-8004) | Agent identity/reputation — reference for the MetaMask plugin and ReputationRegistry design |
| [Deploy a smart contract](https://docs.monad.xyz/guides/deploy-smart-contract/index) | PaymentGuard deploy with Foundry — Week 1 |
| [Indexers guide](https://docs.monad.xyz/guides/indexers/index) | Before the Envio setup |

Enable **Monad gas pricing** in Foundry for local tests (MIP-8 note — see `notes (4).txt`): make storage layout decisions accordingly (group per-user fields in a single struct).

---

## 3. SDK / Tool → Usage Mapping

| Tool | Source | Where it is used | Bounty link |
|---|---|---|---|
| Alchemy Smart Wallets SDK | [Quickstart](https://www.alchemy.com/docs/wallets/quickstart) | Gas sponsorship for the agent's PaymentGuard `pay()` calls | Tier S #8 |
| Alchemy CLI | [Docs](https://www.alchemy.com/docs/alchemy-cli) | RPC/webhook/wallet setup in the dev workflow, agent-operable with `--json` | Tier S #8 |
| Alchemy MCP Server / Agent Skills | [Docs](https://www.alchemy.com/docs/alchemy-mcp-server) | Live chain data for the AI agent (me) during development | Tier S #8 |
| Envio HyperIndex | [Monad testnet quickstart](https://docs.envio.dev/docs/HyperIndex/monad-testnet) | `indexer/` — PaymentGuard + ReputationRegistry events | Tier S #7 |
| Envio HyperSync/HyperRPC | [Overview](https://docs.envio.dev/docs/HyperSync/overview) | Backfill (the indexer pulls historical events quickly on first setup) | Tier S #7 |
| Nansen API / CLI / MCP | [Similar to the Zerion CLI, Resources.txt §MCP] | `reputation.ts` — segment-based labeling | Tier S #2 |
| Dynamic SDK + CLI | Resources.txt (Dynamic section, detail link on the platform) | `agent-kit` — autonomous/server wallet, delegation | Tier S #3 |
| Mera guide | [docs.monad.xyz/guides/mera](https://docs.monad.xyz/guides/mera) | `apps/wallet` — passkey account layer + PRF sub-key | Tier S #4, #5 |
| Cleanverse API | To be obtained from the platform (the sponsor name is in Bounties.txt, API details are not in Resources.txt — will be requested via the sponsor channel in Week 1) | `compliance.ts` | Tier S #6 |
| Chainlink CRE | Resources.txt (CRE section) + `notes (4).txt` (weather demo pattern) | `workflows/reputation-oracle` | Tier A #10 |
| QuickNode Streams/Webhooks | [Streams](https://www.quicknode.com/docs/streams), [Webhooks](https://www.quicknode.com/docs/webhooks/getting-started) | Backup/complementary chain event monitoring | Tier S #8 (backup for Alchemy) |
| Tenderly Simulator/Debugger/Virtual TestNet/Alerts | [tenderly.co](https://tenderly.co/) | Contract development + demo rehearsal environment | Perk, not a bounty directly but improves quality |
| Zerion CLI/API | [developers.zerion.io](https://developers.zerion.io/) | Optional — backup data source for wallet activity | Perk, optional |
| Qwen 3.8 Max API | Alibaba Cloud (credits) | `agent-kit` adversarial reviewer | Tier A #11 |
| KIMI API | Moonshot AI (credits) | `baret_explain` MCP tool | Tier A #13 |
| MetaMask Agent Wallet plugin SDK | Bounty description, detailed documentation to be obtained from the platform | `packages/metamask-plugin` | Tier A #12 |

---

## 4. Idea-Based References (to consult while writing code)

This section lists the entries from the "Idea-specific resources" part of `Resources.txt` that apply directly to Baret:

- [Monad for Developers](https://docs.monad.xyz/introduction/monad-for-developers) in the **Execution-Aware Trading Interfaces** section — the 400ms block / 800ms finality performance envelope and the "no pending state" UI design principle will be applied to the extension popup.
- **Embedded Trading in Non-Trading Apps** → [Monad Embedded Wallets docs](https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets) — reference for how the fake dApps in the showcase set up their own embedded wallets (Baret protects them from the outside).
- **Onchain Skill Credentials** → [Ethereum Attestation Service](https://docs.attest.org) — an optional EAS-based "compliance proof" attestation can be added alongside the Cleanverse compliance detector (stretch, decision pending in `DECISIONS.md`).
- **Mobile-Native Proof of Personhood** → [RIP-7212 note](https://github.com/ethereum/RIPs/blob/master/RIPS/rip-7212.md): "Monad check: RIP-7212 is an L2 proposal, not part of Cancun — assume it is NOT available and verify." This must be clarified when computing the cost of Mera passkey signing.

---

## 5. Environment Variable / API Key Master List

The full technical list is in `ARCHITECTURE.md` §9. This table only tracks **which key comes from which sponsor** and **who is responsible**:

| Key | Sponsor | Where to get it | Status |
|---|---|---|---|
| `MONAD_TESTNET_RPC_URL` | Alchemy | Alchemy dashboard, create a Monad app | ⬜ |
| `NANSEN_API_KEY` | Nansen | Sponsor access on the bounty page | ⬜ |
| `CLEANVERSE_API_KEY` | Cleanverse | Sponsor channel | ⬜ |
| `DYNAMIC_ENVIRONMENT_ID` | Dynamic | dashboard.dynamic.xyz | ⬜ |
| `ENVIO_ENDPOINT` | Envio (our own deploy) | After the `indexer/` deploy | ⬜ |
| `QWEN_API_KEY` | Alibaba Cloud | Bounty credit access | ⬜ |
| `KIMI_API_KEY` | Moonshot AI | Bounty credit access | ⬜ |
| `TENDERLY_ACCESS_KEY` | Tenderly (perk) | Claim via the Notion link | ⬜ |
| `QUICKNODE_ENDPOINT` | QuickNode (perk) | Claim via the Notion link | ⬜ |

**Security note (Uttam/Alchemy, `notes-2.txt`):** No key will ever be written into code or prompt text; `.env` + `.gitignore`. Agent secrets (`agent-kit`) are never written to a file, only read from env/config.
