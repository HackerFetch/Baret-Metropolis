# Contributing to Baret

Thanks for looking. Baret is a pnpm monorepo: the apps are in `apps/`, the shared packages in `packages/`, the Solidity contracts in `contracts/` (Foundry), the Envio indexer in `indexer/` and the Chainlink CRE workflow in `workflows/`.

Security issues do not go in a public issue or pull request: see [`SECURITY.md`](SECURITY.md).

## Prerequisites

- **Node.js 22.22.0** or newer (`.nvmrc` pins `22.22.0`; `engines.node` is `>=22.22.0`).
- **pnpm 11** (`packageManager` is `pnpm@11.1.3`; `engines.pnpm` is `>=11.0.0`). `corepack enable` picks the pinned version.
- **Foundry** (`forge`), only to build and test the contracts in `contracts/`.

## Install

```bash
git clone https://github.com/HackerFetch/Baret-Metropolis.git
cd Baret-Metropolis
corepack enable
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env` where an app needs one, and fill it locally. Secrets never go into the repository.

## The checks

Run these before you open a pull request. CI runs the same ones on every pull request and every push to `main`.

```bash
pnpm check   # pnpm lint && pnpm typecheck && pnpm lint:copy && pnpm test
pnpm build   # builds every workspace package and app
```

- `pnpm lint` is Biome; `pnpm lint:fix` applies its fixes.
- `pnpm lint:copy` checks the user-facing copy in `packages/content`.
- Contracts: `forge test` in `contracts/`.
- Browser checks against the built apps are listed in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), "Browser checks".

## Branches and pull requests

- `main` is protected: no direct commits. Work on a branch and open a pull request into `main`.
- A pull request merges only after its checks pass and its owner says so. The API on Render deploys a `main` commit only after its checks pass.
- One piece of work per pull request. Code and the docs it changes go in the same pull request, including the status tables in `docs/`.
- **English everywhere**: code, comments, commit messages, docs, UI copy.
- Commit messages: short, in English, saying what changed.
- **Monad only**: chain ids `10143` (testnet) and `143` (mainnet); environment variables use the `MONAD_TESTNET_*`, `MONAD_MAINNET_*` and `BARET_*` prefixes.
- **Fail-closed**: when data is missing, the decision is Blocked. A change that turns a failure into Safe will not be merged.
- Never commit a secret (`.env`, private keys, API keys).

## Where the docs live

- [`README.md`](README.md): what Baret is, how to try it, the live links and the status.
- [`docs/README.md`](docs/README.md): the map of every document in `docs/`.
- Package READMEs: [`packages/guard`](packages/guard/README.md), [`packages/agent-kit`](packages/agent-kit/README.md), [`packages/llm`](packages/llm/README.md).
- [`CHANGELOG.md`](CHANGELOG.md): the npm package releases.
