# Baret — Deployment and CI/CD

> How Baret is built, checked and shipped. Frontend on Vercel, the analysis API on Render, contracts with Foundry. Keep this file in sync with `.github/workflows/ci.yml`, `render.yaml` and `apps/*/vercel.json`.

Last updated: 2026-10-01 · Status: **API on Render and both web apps on Vercel are live; main domain `baret-metropolis.vercel.app` live**

---

## 1. What runs where

| Piece | Host | Config | URL (target) |
|---|---|---|---|
| `apps/showcase` | Vercel project `baret-metropolis` | `apps/showcase/vercel.json` | **`https://baret-metropolis.vercel.app`** (main domain) |
| `apps/wallet` | Vercel project `baret-wallet` | `apps/wallet/vercel.json` | `https://baret-wallet.vercel.app` |
| `apps/server` | Render web service `baret-monad-api` | `render.yaml` (Blueprint) | `https://baret-monad-api.onrender.com` (live) |
| `apps/extension` | GitHub Actions artifact (zip) | `ci.yml` → `build` job | Chrome "Load unpacked" / store later |
| `contracts/` | Monad testnet, by hand | `contracts/script/Deploy.s.sol` | addresses in `docs/CONTRACTS.md` |

The two Vercel apps call the API at `/api/...`. Vercel rewrites `/api/:path*` to the Render service, so the browser stays on one origin (no CORS) exactly like the Vite dev proxy does locally. If the Render service gets a different URL, change the rewrite in both `vercel.json` files.

## 2. The pipeline

```
PR opened / pushed ──► GitHub Actions CI ──────────────► Vercel preview per app (Git integration)
                        checks: lint, typecheck,           (skipped when the app and packages/ did not change)
                                copy lint, vitest
                        build:  pnpm build + extension zip (artifact)
                        contracts: forge fmt/build/test

merge to main ────────► CI on main ──── all checks green ──► Render deploys baret-monad-api (autoDeployTrigger: checksPass)
                                                         └─► Vercel production deploy of each changed app
```

- **CI is the gate for the API:** `render.yaml` uses `autoDeployTrigger: checksPass`, so Render deploys a `main` commit only after its GitHub checks pass. `buildFilter` skips API deploys for commits that touch only the frontend.
- **Vercel builds on its own** through the Git integration. `ignoreCommand` skips a build when neither the app nor `packages/` nor the lockfile changed since the last successful deploy of that branch (`VERCEL_GIT_PREVIOUS_SHA`); when that commit is unknown or not in the clone, it builds. To make Vercel also wait for CI, turn on the required checks in GitHub (step 2.4 below).
- **Secrets never live in the repo.** Render env vars marked `sync: false` and Vercel env vars are entered in the dashboards.

## 3. One-time setup (Ezgin)

### 3.1 GitHub
1. Push the `infra` branch and open the PR. The first CI run starts by itself; nothing to configure. Actions must be enabled for the `HackerFetch` org (Settings → Actions → Allow all actions).
2. After the first green run: Settings → Branches → `main` rule → **Require status checks to pass**: `Lint, types, tests`, `Build apps`, `Contracts`. This makes CI the merge gate for both of us.

### 3.2 Render (API)
1. render.com → sign in with GitHub → grant access to `HackerFetch/Baret-Metropolis`.
2. **New → Blueprint** → pick the repo. The service is named `baret-monad-api` because an older, unrelated `baret-api` service already exists on our Render account; do not reuse or overwrite it.
   Then → Render reads `render.yaml` and proposes `baret-monad-api`.
3. Fill the `sync: false` values when it asks:
   - `MONAD_TESTNET_RPC_URL` — Alchemy Monad testnet URL (required; the public `https://testnet-rpc.monad.xyz` works for a first run).
   - `MONAD_TESTNET_USDC_ADDRESS` — verified testnet USDC.
   - `BARET_CORS_ORIGINS` — leave empty for now (the extension calls the API from its own origin).
   - `BARET_API_KEYS` — **leave empty** while the showcase calls the API from the browser: a static site cannot keep a key secret. Rate limiting (120/min per IP) still applies. Keys come with agent-kit.
   - The rest (registry, Nansen, Cleanverse) — empty until those land; their rules fail closed.
4. Apply. `/health` shows the running commit (`commit`) and `/health/ready` shows which optional settings each network has (`configured`: USDC, registry, number of known contracts) — booleans and counts only, no values. Use them to confirm an env change actually reached the running service.
   When it is live, open `https://baret-monad-api.onrender.com/health/ready` → `{"status":"ready",...}`.
5. If Render assigned another name (e.g. `baret-monad-api-x1y2`), put that URL into both `vercel.json` rewrites.

The free plan sleeps after 15 minutes idle and the first request then takes ~50 s. Fine for development; switch to Starter before the demo video and judging.

### 3.3 Vercel (showcase and wallet)
Do this twice, once per app:
1. vercel.com → **Add New → Project** → import `HackerFetch/Baret-Metropolis`.
2. **Root Directory**: `apps/showcase` (second time: `apps/wallet`). Framework: Vite (detected). Leave build/install/output empty — `vercel.json` sets them.
3. **Environment variable**: `ENABLE_EXPERIMENTAL_COREPACK=1` (All environments). The repo pins pnpm 11 in `packageManager`; without this Vercel installs with an older pnpm.
4. Settings → General → **Node.js Version**: 22.x.
5. Project name: `baret-metropolis` (showcase) / `baret-wallet`. Deploy.
6. Showcase only: Environment Variables → `BARET_SITE_URL` = `https://baret-metropolis.vercel.app`. The build writes the canonical URL, `og:url`, absolute `og:image` and `sitemap.xml` from it; without it Vercel falls back to `VERCEL_PROJECT_PRODUCTION_URL`.

**Why the install command runs the extension's `postinstall`:** Vite's native tsconfig resolution in the web apps follows the workspace project references into `apps/extension/tsconfig.json`, which extends `.wxt/tsconfig.json`. `wxt prepare` generates that file in `postinstall`, but when Vercel restores `node_modules` from its build cache, `pnpm install` is a no-op and skips lifecycle scripts, so the file is missing and the build fails with `Tsconfig not found .../apps/extension/.wxt/tsconfig.json`. Running the script explicitly makes cached and fresh builds behave the same.

### 3.4 Contracts (manual, once per network)
```
cd contracts
BARET_OWNER=0x... BARET_CRE_FORWARDER=0x... MONAD_TESTNET_USDC_ADDRESS=0x... \
forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```
Put the addresses into `docs/CONTRACTS.md` §2.6 / §3.4 and `MONAD_TESTNET_REPUTATION_REGISTRY_ADDRESS` / `MONAD_TESTNET_KNOWN_CONTRACTS` on Render. Contracts are not deployed from CI on purpose: a deployer key in GitHub secrets is a bigger risk than a manual step we run twice.

### 3.6 Envio (the indexer)
1. envio.dev → sign in with GitHub → **API Tokens** → create a **HyperSync** token. It is `ENVIO_API_TOKEN`: for local runs put it in `indexer/.env`, never in the repo.
2. **Add Indexer** → repository `HackerFetch/Baret-Metropolis`, branch `main`, **root directory `indexer`**, config file `config.yaml`. Add `ENVIO_API_TOKEN` to its environment if the service asks.
3. The hosted service deploys on a push to that branch: nothing happens until the next commit lands on `main` (the page shows "Deployments 0/3" until then). After that, every merge that reaches `main` redeploys it; the free plan keeps three deployments.
4. When it has synced, copy its GraphQL endpoint into `ENVIO_ENDPOINT` on Render (`baret-monad-api`), "Save, rebuild, and deploy". `/health/ready` then shows `"indexer": true`, and `/v1/audit/recent` answers with the payments already made on testnet.

Checked before the first deployment (2026-10-07), with `ENVIO_API_TOKEN` set: `pnpm --filter @baret/indexer test:chain` passes on the real blocks of the wallet check, and a replay of every block since the contracts were deployed gives 21 events: two vaults (the demo vault with the Dynamic agent, 5 USDC in and 0.5 paid in two payments; the wallet-check vault with its owner, 1 USDC in, 0.2 paid, agent revoked), four payments at their blocks, and three registry entries at severity 4.

### 3.5 What runs on its own
- **Keep-warm** (`.github/workflows/keep-warm.yml`): asks `/health/ready` every 10 minutes so the free Render instance does not sleep (a sleeping instance needs close to a minute, the demo sites wait 15 seconds).
- **Extension release** (`ci.yml` → `release-extension`): every push to `main` replaces the `extension-latest` GitHub release with `baret-chrome.zip` and `baret-firefox.zip`. `/install` links to `releases/latest/download/<name>.zip` through `VITE_BARET_EXTENSION_CHROMIUM_URL` and `VITE_BARET_EXTENSION_FIREFOX_URL` on the showcase project.
- **Showcase 404s**: no catch-all rewrite; the build writes a file per route and `404.html`. The wallet keeps its single-page fallback.

## 4. Running the pipeline locally

```
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm lint:copy && pnpm test   # CI "checks"
pnpm build && pnpm --filter @baret/extension zip              # CI "build"
cd contracts && forge fmt --check && forge build && forge test # CI "contracts"
```
Render's commands, to reproduce a deploy:
```
corepack enable && pnpm install --frozen-lockfile --filter @baret/server...
cd apps/server && ./node_modules/.bin/tsx src/main.ts
```
The API starts `tsx` directly: `pnpm start` would make pnpm 11 re-check, and re-install, the whole workspace before every boot.

## 5. Status

| Item | Status |
|---|---|
| `ci.yml` (checks, build, contracts) | ✅ Written, every step passes locally |
| `render.yaml` | ✅ Written, build + start commands verified locally |
| `vercel.json` (showcase, wallet) | ✅ Written, `pnpm build` verified locally |
| GitHub required checks | ⬜ After the first green run |
| Render service | ✅ `baret-monad-api` live, traced analysis verified 2026-10-02 |
| Vercel projects | ✅ `baret-metropolis` (showcase, main domain, canonical + sitemap verified) and `baret-wallet` live, `/api` rewrite verified 2026-10-02 |
| Envio indexer (hosted) | 🔶 Handlers verified against the full on-chain history (21 events); indexer created on Envio, first deployment starts with this commit; `ENVIO_ENDPOINT` on Render still to set |
| Extension release (store / signed zip) | ⬜ Artifact only for now |
