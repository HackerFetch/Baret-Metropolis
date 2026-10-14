# Baret documentation

A map of every document in `docs/`, one line each. The project itself, the live links and how to try it are in the root [`README.md`](../README.md).

## Start here

| Document | What it is |
|---|---|
| [`../README.md`](../README.md) | What Baret is, the two-minute tour, live links, contracts, status |
| [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) | The product: problem, users, what Baret does and does not do |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the parts fit: engine, detectors, policy, contracts, SDK, apps, sponsor integrations |
| [`assets/architecture.svg`](assets/architecture.svg) | The architecture diagram (also [`assets/architecture.png`](assets/architecture.png)) |
| [`../SECURITY.md`](../SECURITY.md) | How to report a vulnerability, scope, the fail-closed design |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Prerequisites, install, the checks, branch and pull request rules |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Releases of `@baret/guard`, `@baret/llm` and `@baret/agent-kit` |

## Product and architecture

| Document | What it is |
|---|---|
| [`API_REFERENCE.md`](API_REFERENCE.md) | Every API route end to end: requests, answers, errors, limits |
| [`CONTRACTS.md`](CONTRACTS.md) | The contracts on Monad testnet: specification, addresses, Sourcify verification, demo vaults |
| [`WALLET.md`](WALLET.md) | The Baret web wallet: passkey account, the check before every signature, sealed settings |
| [`X402_FACILITATOR.md`](X402_FACILITATOR.md) | x402 paid requests and the facilitator design |
| [`FRONTEND.md`](FRONTEND.md) | Content specification of the showcase and the demo sites |
| [`BRAND.md`](BRAND.md) | Brand specification: name, colours, type, voice |
| [`DECISIONS.md`](DECISIONS.md) | The decision log (D-001 onwards), with the reason for each decision |
| [`PRIVACY.md`](PRIVACY.md) | Privacy policy of the extension and the apps |
| [`../workflows/README.md`](../workflows/README.md) | The Chainlink CRE workflow and its on-chain runs |
| [`../packages/guard/README.md`](../packages/guard/README.md) | `@baret/guard`: the SDK a dapp or wallet calls before signing |
| [`../packages/agent-kit/README.md`](../packages/agent-kit/README.md) | `@baret/agent-kit`: a guarded agent wallet and the `baret` CLI |
| [`../packages/llm/README.md`](../packages/llm/README.md) | `@baret/llm`: the KIMI and Qwen client |

## Building and running

| Document | What it is |
|---|---|
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | What runs where (Vercel, Render, Envio), the CI pipeline, one-time setup, npm publishing, browser checks |
| [`runbooks/release.md`](runbooks/release.md) | How the SDK packages, the apps, the API and the extension are released, and the checks before a release |
| [`runbooks/judging-window.md`](runbooks/judging-window.md) | 14 to 27 October: what must not change, what to watch and how to check it |
| [`STORE_LISTING.md`](STORE_LISTING.md) | The Chrome Web Store listing answers |
| [`RESOURCES.md`](RESOURCES.md) | External resources: Monad, sponsor docs, tools |
| [`HANDOFF_EZGIN_SECOND_MACHINE.md`](HANDOFF_EZGIN_SECOND_MACHINE.md) | Setup notes for a second development machine (npm, Cleanverse, Chainlink) |

## Quality and evidence

| Document | What it is |
|---|---|
| [`QA_AND_DELIVERY.md`](QA_AND_DELIVERY.md) | The test plan, the bug format, the prize requirements word for word |
| [`QA_LOG.md`](QA_LOG.md) | The QA log: every test session, its results and the bugs filed |
| [`evidence/README.md`](evidence/README.md) | Recorded evidence: KIMI panels ([`evidence/kimi/`](evidence/kimi/)) and Qwen review runs ([`evidence/qwen/`](evidence/qwen/)) |
| [`assets/screenshots/`](assets/screenshots/) | Screenshots of the live product, desktop and mobile (`01-novaswap-blocked` to `09-registry-lookup`) |
| [`GAP_AUDIT.md`](GAP_AUDIT.md) | Gap audit of 2026-10-11 |
| [`SYSTEM_GAPS.md`](SYSTEM_GAPS.md) | What is sample, missing, wrong or half done, and its state |

## Submission

| Document | What it is |
|---|---|
| [`submission/README.md`](submission/README.md) | The submission folder and what is in it |
| [`submission/TEXTS.md`](submission/TEXTS.md) | The submitted texts for the main track and every bounty |
| [`submission/SCRIPTS.md`](submission/SCRIPTS.md) | The scripts of the demo and pitch videos |
| [`submission/baret-pitch-deck.pdf`](submission/baret-pitch-deck.pdf) | The pitch deck |
| [`submission/baret-one-pager.pdf`](submission/baret-one-pager.pdf) | The one-page summary |
| [`BOUNTIES_AND_TRACKS.md`](BOUNTIES_AND_TRACKS.md) | Track and bounty strategy, with each sponsor integration and its proof |
| [`articles/kimi.md`](articles/kimi.md) | The article on the KIMI integration |
| [`articles/qwen.md`](articles/qwen.md) | The article on the Qwen reviewer |
| [`assets/hero.png`](assets/hero.png) | The hero image |

## Planning

| Document | What it is |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | The roadmap and the final-week board |
| [`analysis/competitive-landscape.md`](analysis/competitive-landscape.md) | Who else works on pre-signing security, and how Baret differs |
| [`analysis/market-and-integrators.md`](analysis/market-and-integrators.md) | Who adopts Baret and why: dapps, wallets, agents |
| [`next-steps/mainnet-readiness.md`](next-steps/mainnet-readiness.md) | What is needed before a mainnet launch |
| [`REFERENCE_REPOS.md`](REFERENCE_REPOS.md) | Comparative review of the five earlier Baret versions |
| [`research/README.md`](research/README.md) | The research behind the plan: the hackathon's tracks and bounties, its resources page, and our notes from the kickoff and the sponsor workshops (Nansen, Dynamic, Envio, Alchemy, Chainlink CRE, Cleanverse, Kuru, QuickNode, MetaMask) |
