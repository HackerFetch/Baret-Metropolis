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

- **CI is the gate for the API:** `render.yaml` uses `autoDeployTrigger: checksPass`, so Render deploys a `main` commit only after its GitHub checks pass. `buildFilter` skips API deploys for commits that touch only the frontend: it deploys only on changes to `apps/server/**`, `packages/guard/**`, `packages/content/**`, `packages/llm/**`, `packages/agent-kit/**`, `pnpm-lock.yaml` or `render.yaml`.
- **Vercel builds on its own** through the Git integration. `ignoreCommand` skips a build when neither the app nor `packages/` nor the lockfile changed since the last successful deploy of that branch (`VERCEL_GIT_PREVIOUS_SHA`); when that commit is unknown or not in the clone, it builds. To make Vercel also wait for CI, turn on the required checks in GitHub (step 2.4 below).
- **Secrets never live in the repo.** Render env vars marked `sync: false` and Vercel env vars are entered in the dashboards.

## 3. One-time setup (Ezgin)

### 3.1 GitHub
1. Push the `infra` branch and open the PR. The first CI run starts by itself; nothing to configure. Actions must be enabled for the `HackerFetch` org (Settings → Actions → Allow all actions).
2. After the first green run: Settings → Branches → `main` rule → **Require status checks to pass**: `Lint, types, tests`, `Build apps`, `Contracts`. This makes CI the merge gate for both of us.

**Only `main` deploys (since 2026-10-11).** Both `vercel.json` files set `git.deploymentEnabled` to `main` only. The team is on Vercel's Hobby plan, which allows 100 deployments a day, and a skipped build counts as one. Every push to every branch made two (the showcase and the wallet), every merge two more; on 2026-10-10, with about 75 commits on `main` and 25 branches pushed, the limit was reached and Vercel refused every deployment for 24 hours ("Deployment rate limited"), production included. A pull request therefore has no preview URL: read its CI, and run the app locally. To bring previews back, remove the `git` block, or move the team to Pro (6000 a day).

Render deploys the API only after the GitHub checks of a commit pass (`autoDeployTrigger: checksPass`), and a failed Vercel status counts: while Vercel refuses deployments, the API does not follow `main` either. Use "Manual Deploy" on Render for a server change that cannot wait.

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
   - `KIMI_API_KEY` for `/v1/explain` and `/v1/policy/draft`, `QWEN_API_KEY` for `/v1/review`, and `BARET_DEMO_AGENT_PRIVATE_KEY`, the demo agent's key for the payment an approved honest review sends from Baret's demo vault on Monad testnet (`render.yaml` sets `BARET_REVIEW_SEND=1`). Without a key its route answers 503; without the agent key `/v1/review` reviews but never sends. Not set yet (E7): nothing of D-037 or D-038 is in production until they are and the merge deploys. `/health/ready` then shows `explain`, `policyDraft`, `review` and `reviewSends` true. The limits and the kill switch (`BARET_REVIEW_ENABLED`) keep their defaults from `apps/server/src/config/env.ts` unless set (`docs/ARCHITECTURE.md` §9).
   - `BARET_SEALED_RELAYER_PRIVATE_KEY` for `/v1/sealed` (D-039): a testnet key holding MON and nothing else, which pays the gas when a wallet saves its sealed settings. `render.yaml` sets the store's address. Without the key the route answers 503; `/health/ready` shows `sealed` true once it is set. Keep a few MON on its address (a save costs about 0.011 MON).
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
3. The hosted service deploys on every push to its branch, each deployment gets its own endpoint id, and the free plan keeps three. So the indexer follows the branch **`indexer-release`**, not `main`: to ship an indexer change, fast-forward that branch (`git push origin origin/main:indexer-release`) and then update `ENVIO_ENDPOINT` on Render with the new deployment's endpoint. Ordinary merges to `main` do not touch it.
4. When it has synced, copy its GraphQL endpoint into `ENVIO_ENDPOINT` on Render (`baret-monad-api`), "Save, rebuild, and deploy". `/health/ready` then shows `"indexer": true`, and `/v1/audit/recent` answers with the payments already made on testnet.

Checked before the first deployment (2026-10-07), with `ENVIO_API_TOKEN` set: `pnpm --filter @baret/indexer test:chain` passes on the real blocks of the wallet check, and a replay of every block since the contracts were deployed gives 21 events: two vaults (the demo vault with the Dynamic agent, 5 USDC in and 0.5 paid in two payments; the wallet-check vault with its owner, 1 USDC in, 0.2 paid, agent revoked), four payments at their blocks, and three registry entries at severity 4.

### 3.5 What runs on its own
- **Keep-warm** (`.github/workflows/keep-warm.yml`): asks `/health/ready` every 10 minutes so the free Render instance does not sleep (a sleeping instance needs close to a minute, the demo sites wait 15 seconds).
- **Wallet, live or sample**: a production build of `apps/wallet` is live (a Mera passkey account, Monad reads, the Baret check before every signature); any `?sample=<name>` in the URL keeps the sample. In dev, `VITE_BARET_WALLET=live pnpm --filter @baret/wallet dev` turns the live side on (a passkey made on `localhost` is a different wallet from one made on `baret-wallet.vercel.app`). `VITE_MONAD_TESTNET_RPC_URL` on the wallet's Vercel project replaces the public RPC for its reads; it is optional.
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
| Envio indexer (hosted) | ✅ Live since 2026-10-07 at `https://indexer.dev.hyperindex.xyz/b3bc40c/v1/graphql`; its data matches the chain and all four `/v1/audit` routes were checked against it. The free plan deletes a deployment after 30 days, or after 7 days without a request (the keep-warm job asks it every 10 minutes) |
| Extension release (store / signed zip) | ⬜ Artifact only for now |

## Browser checks

Two scripts drive the real product in Chromium, against the live API and Monad testnet. Playwright is not a dependency of the repository: install its Chromium once (`npx playwright install chromium`) and point `PLAYWRIGHT_CORE` at its `playwright-core/index.mjs` when it is not resolvable.

| Command | What it walks | Checks |
|---|---|---|
| `pnpm --filter @baret/extension verify:browser` | The built extension (`.output/chrome-mv3`, build it first with `WXT_BARET_API_URL` set): setup with a new wallet, NovaSwap connecting, an attack Blocked, a transfer signed and confirmed, the popup, lock and unlock, NovaSwap's own faucet and attack buttons | 23 |
| `pnpm --filter @baret/wallet verify:browser` | The web wallet with a virtual passkey: a new account, sealed settings saved, storage cleared, the copy brought back | 8 |

Both passed on 2026-10-11. The extension run makes a new wallet each time and funds it with 1 MON from `BARET_FUNDER_KEY_FILE` (default `~/.baret/deployer.key`), so it needs `cast` and a funded key. Each script's header lists its settings. They are not part of CI: they need a browser, a funded key and the live services.

