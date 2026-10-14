# Runbook: releasing Baret

How each part of Baret reaches its users, and what is checked first. The full setup and the history behind each step are in [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

| Part | Where it runs | How it is released |
|---|---|---|
| Showcase and demo sites (`apps/showcase`) | Vercel project `baret-metropolis`, https://usebaret.com | Vercel's Git integration builds every push to `main` |
| Baret web wallet (`apps/wallet`) | Vercel project `baret-wallet`, https://wallet.usebaret.com | Vercel's Git integration builds every push to `main` |
| API (`apps/server`) | Render service `baret-monad-api`, https://baret-monad-api.onrender.com | Render deploys a `main` commit after its GitHub checks pass (`render.yaml`) |
| Browser extension (`apps/extension`) | GitHub release `extension-latest` | CI replaces the release on every push to `main` |
| SDK (`@baret/guard`, `@baret/llm`, `@baret/agent-kit`) | npm, organisation `baret` | Published by hand from a login of the account that owns the organisation |
| Indexer (`indexer/`) | Envio hosted service | Envio builds from the repository; a new deployment gets a new endpoint |
| Contracts (`contracts/`) | Monad testnet (10143) | Deployed by hand with Foundry, once per network ([`../CONTRACTS.md`](../CONTRACTS.md)) |

## 1. Checks before any release

Run on the commit you are about to merge or publish:

```bash
pnpm install --frozen-lockfile
pnpm check                                  # lint, typecheck, lint:copy, tests (CI "checks")
pnpm build && pnpm --filter @baret/extension zip   # CI "build"
```

- Contracts, when they changed: `forge test` in `contracts/` (CI's "Contracts" job).
- Against the live API after a server change: `pnpm --filter @baret/server verify:demo -- --api https://baret-monad-api.onrender.com --from <a test address>` (the run recorded in `318175f` passed 20 of 20).
- Against a built app when its signing flow changed: the browser checks in [`../DEPLOYMENT.md`](../DEPLOYMENT.md), "Browser checks".
- Read every README that ships with a package once more: the README on an npm page is the one packed with that version.

## 2. Apps on Vercel

1. Merge the pull request into `main` after its checks pass. `main` is protected.
2. Vercel builds both projects. `ignoreCommand` in each `vercel.json` skips a build when neither the app nor `packages/` nor the lockfile changed.
3. Check the production URL answers and the change is there. A failed build leaves the previous deployment live.

Settings that a release must not change: the project names, the domains (`usebaret.com`, `wallet.usebaret.com`) and `ENABLE_EXPERIMENTAL_COREPACK=1`. A passkey belongs to its origin, so moving the wallet's domain loses every account made on it.

## 3. API on Render

1. Merge into `main`. `autoDeployTrigger: checksPass` makes Render wait for the GitHub checks.
2. `buildFilter` deploys only for changes under `apps/server/**`, `packages/guard/**`, `packages/content/**`, `packages/llm/**`, `packages/agent-kit/**`, `pnpm-lock.yaml` or `render.yaml`.
3. Check it is up and on the new commit:

```bash
curl -s https://baret-monad-api.onrender.com/health/ready
curl -s https://baret-monad-api.onrender.com/health   # "commit" names the deployed commit
```

`/health/ready` must answer `"status":"ready"` with `ok: true` for `testnet` and the expected `configured` flags. Secrets are set in the Render dashboard (`sync: false` in `render.yaml`), never in the repository.

## 4. Extension zip

On every push to `main`, the `release-extension` job in `.github/workflows/ci.yml` builds `baret-chrome.zip` and `baret-firefox.zip` and replaces the `extension-latest` release. `/install` links to `releases/latest/download/<name>.zip`. No manual step. Check the release's notes name the commit you merged.

The Chrome Web Store listing was submitted on 2026-10-12 and is pending Google's review; once it is public, set `VITE_BARET_EXTENSION_CHROMIUM_STORE_URL` on the showcase project and redeploy ([`../DEPLOYMENT.md`](../DEPLOYMENT.md) §3.5).

## 5. SDK packages on npm

The three packages are released together at one version, because `@baret/agent-kit` pins the other two at its own version. Record each release in [`../../CHANGELOG.md`](../../CHANGELOG.md).

1. Raise `version` in `packages/guard/package.json`, `packages/llm/package.json` and `packages/agent-kit/package.json`. A published version number cannot be used again.
2. Merge that change through a pull request, then publish from that commit of `main`.
3. `npm whoami`; `npm login` again when it answers 401 (a login lasts a few hours).
4. Publish in this order, because agent-kit depends on the other two:

```bash
pnpm --filter @baret/guard publish
pnpm --filter @baret/llm publish
pnpm --filter @baret/agent-kit publish
```

   `prepack` runs `tsc -p tsconfig.build.json` into `dist/`, and `publishConfig` points `main`, `types`, `exports` and the `bin` at `dist/`. pnpm rewrites `workspace:*` to the real version. Each publish asks for a one-time password when the account has one.

5. Check from the registry, in an empty folder:

```bash
npm install @baret/agent-kit
npx baret --help
npx baret policy list
```

   and run the smallest call from [`../../packages/guard/README.md`](../../packages/guard/README.md) against the live API: it must answer `blocked` with `KNOWN_MALICIOUS_ADDRESS`.

Alternative used for 0.1.0: `pnpm pack` in each package, then `npm publish <file>.tgz --access public`. On Windows, build from a checkout with LF line endings.

## 6. After a release

- The status tables in [`../DEPLOYMENT.md`](../DEPLOYMENT.md) and [`../../README.md`](../../README.md) say what is live.
- During the judging window (14 to 27 October 2026), nothing is released to `main` except the fixes that [`judging-window.md`](judging-window.md) allows.
