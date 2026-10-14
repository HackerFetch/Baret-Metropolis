# Research

The notes the team worked from while deciding what to build for Monad Metropolis: the hackathon's own list of tracks and bounties, its resources page, and our notes from the kickoff and the sponsor workshops. They are kept as they were written in September 2026. The decisions they led to are in the rest of [`docs/`](../README.md).

| File | What it is | Related part of Baret |
|---|---|---|
| [hackathon-tracks-and-bounties.txt](hackathon-tracks-and-bounties.txt) | The tracks and sponsor bounties as the hackathon platform listed them (snapshot of 2026-09-13). | The prize plan in [BOUNTIES_AND_TRACKS.md](../BOUNTIES_AND_TRACKS.md) |
| [hackathon-resources.txt](hackathon-resources.txt) | The platform's resources page (hackathon.monad.xyz/resources, snapshot of 2026-09-13): sponsor perks, docs, SDKs and idea guides. | Which sponsor tool lives where, in [RESOURCES.md](../RESOURCES.md) |
| [workshop-notes-kickoff-envio-alchemy-zerion.txt](workshop-notes-kickoff-envio-alchemy-zerion.txt) | The kickoff talk; Envio (an indexer as the layer between the front end and the contracts: config, schema, handlers); Alchemy (WebSockets for live data, keys only in `.env`); Zerion. | The Envio indexer in [`indexer/`](../../indexer); the no-keys-in-code rule in [RESOURCES.md](../RESOURCES.md); the wallet's chain monitor in [WALLET.md](../WALLET.md) |
| [workshop-notes-nansen-dynamic-aurora.txt](workshop-notes-nansen-dynamic-aurora.txt) | Nansen (labels and wallet segments; API, CLI and MCP); onboarding; Dynamic (headless SDK, CLI, agent wallets, an adversarial layer for agent trust); building with coding agents; Aurora Intents. | Nansen labels in the risk check ([RESOURCES.md](../RESOURCES.md)); the demo agent's Dynamic server wallet; the agent story in [X402_FACILITATOR.md](../X402_FACILITATOR.md) |
| [workshop-notes-kuru-quicknode-metamask.txt](workshop-notes-kuru-quicknode-metamask.txt) | Kuru; a passkey Mera wallet demo; QuickNode webhooks and Streams; MetaMask Agent Wallet plugins; launchpads. | The MetaMask Agent Wallet plugin in [`packages/metamask-plugin`](../../packages/metamask-plugin) |
| [workshop-notes-chainlink-cre-gtm-mip8.txt](workshop-notes-chainlink-cre-gtm-mip8.txt) | Chainlink CRE (workflows, simulation, the forwarder); go-to-market and retention; MIP-8 storage on Monad. | The CRE workflow in [`workflows/`](../../workflows); the per-user storage layout in [CONTRACTS.md](../CONTRACTS.md) |
| [workshop-notes-cleanverse-agora-tenderly.txt](workshop-notes-cleanverse-agora-tenderly.txt) | Cleanverse (the credential check belongs on the path where value moves, and a refusal must say why); Agora AUSD; Tenderly simulation. | The CompliantPaymentGuard in [CONTRACTS.md](../CONTRACTS.md) |

The files moved here from the repository root on 2026-10-14 with their git history kept (`git log --follow <file>`).
