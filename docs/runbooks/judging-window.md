# Runbook: the judging window (14 to 27 October 2026)

Monad Metropolis submissions closed on 2026-10-14 at 06:59 GMT+3. Judging runs from 14 to 27 October and winners are announced on 3 November. For these two weeks the live demo is the product: a judge who meets a sleeping API, an empty demo vault or a wallet that no longer opens sees a broken Baret, whatever was built. This page says what must not change, what to watch and how to check each thing. Every command here is read-only.

## 1. What was submitted

There is no release tag. The submission links the repository, so what was submitted is `main` as it stood at the deadline (2026-10-14, 06:59 GMT+3). Find that commit:

```bash
git fetch origin
git log -1 --before='2026-10-14 06:59 +0300' origin/main
```

After the deadline, `main` is frozen: only a fix for something a judge can see broken (a P0 or P1, see [`../QA_AND_DELIVERY.md`](../QA_AND_DELIVERY.md) §6) goes in, through a pull request whose checks pass. Every such fix is listed with its reason in the pull request. New features wait until after 27 October.

## 2. What must not change

| Thing | Why | Where it is set |
|---|---|---|
| The wallet's domain `wallet.usebaret.com` and the Vercel project `baret-wallet` | The passkey's relying-party id is the page's host (`window.location.hostname` in `apps/wallet/src/live/live.tsx`). A different host is a different wallet: every account a judge made would stop opening. `baret-wallet.vercel.app` is an alias with its own passkeys | Vercel dashboard, Cloudflare DNS |
| The showcase domain `usebaret.com` and the project `baret-metropolis` | Every link in the submission, the videos and the README points there | Vercel dashboard |
| `main` after the deadline | What judges read must match what they run | GitHub branch protection |
| The indexer endpoint `https://indexer.dev.hyperindex.xyz/b3bc40c/v1/graphql` | A new indexer deployment gets a new endpoint, and the API's `ENVIO_ENDPOINT` would point at the old one | Envio dashboard, Render env |
| Nansen mode `labels` (`NANSEN_MODE`, `NANSEN_LABELS_DAILY_LIMIT`) | Verdicts must not change under a judge mid-review; `/health/ready` shows the mode | Render env |
| The API's URL `https://baret-monad-api.onrender.com` | The SDK README, the extension zips and both sites call it | Render dashboard |
| Contract addresses ([`../CONTRACTS.md`](../CONTRACTS.md)) | The README, the submission texts and the explorer links name them | On chain |

Do not rotate an API key on Render during judging unless it leaked, and if it did, put the new one in before removing the old.

## 3. What to watch, and how

Check once a day, and before any moment a judge is known to be looking.

### 3.1 The API is up and ready

```bash
curl -s --max-time 120 https://baret-monad-api.onrender.com/health/ready
curl -s --max-time 60  https://baret-monad-api.onrender.com/health
```

Expect `"status":"ready"`, `ok: true` for `testnet`, chain id `10143`, and in `configured`: `nansenMode: "labels"`, `cleanverse`, `indexer`, `explain`, `policyDraft`, `review`, `reviewSends`, `sealed` and `x402` all `true`. `nansenLabelsLeftToday` falls during the day and resets at 00:00 UTC; at 0 the API answers from first-funder data. `/health` names the deployed `commit`.

The first call after a quiet spell can take close to a minute: Render's free plan sleeps after 15 minutes without traffic, and the demo sites fail closed after 15 seconds. That is what the keep-warm job is for.

### 3.2 The keep-warm job runs

`.github/workflows/keep-warm.yml` asks `/health/ready` and `/v1/audit/recent?limit=1` every 10 minutes. The second request also keeps the hosted indexer alive: Envio deletes a deployment after 7 days without a request.

GitHub does not keep that schedule: on 2026-10-09 the job had run about every 6 hours (17 runs in 3.7 days). Look at the gaps:

```bash
gh run list --repo HackerFetch/Baret-Metropolis --workflow keep-warm.yml --limit 20
```

A gap of hours means a judge can meet a sleeping API. The fixes are a paid Render plan (account owner) or another pinger; neither is a code change.

### 3.3 The demo agent's MON

The demo agent `0x227ba9d7B649988C48662Ac42360727bA971647E` pays the gas of every payment `/review` sends. It held 11.42 MON on 2026-10-12.

```bash
cast balance 0x227ba9d7B649988C48662Ac42360727bA971647E --ether --rpc-url https://testnet-rpc.monad.xyz
```

Or on the explorer: https://testnet.monadscan.com/address/0x227ba9d7B649988C48662Ac42360727bA971647E. Top it up well before it runs low, and space the top-up from other transactions of the funding account: on Monad a MON transfer sent right after other transactions from the same account can revert; check the receipt.

### 3.4 The review vault's dUSDC

The review demo vault `0x46F159DA1aD40A78526d35ea1Adb8531aDa52158` holds dUSDC (`0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc`, 6 decimals). The honest `/review` scenario sends 0.10 dUSDC from it, at most 48 sends a day (a run is cached for 30 minutes); its caps are 1 / 2 / 5 dUSDC per payment / hour / day.

```bash
cast call 0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc "balanceOf(address)(uint256)" \
  0x46F159DA1aD40A78526d35ea1Adb8531aDa52158 --rpc-url https://testnet-rpc.monad.xyz
```

Divide by 1,000,000 for dUSDC. Explorer: https://testnet.monadscan.com/address/0x46F159DA1aD40A78526d35ea1Adb8531aDa52158.

### 3.5 KIMI and Qwen credit

KIMI writes the plain words under every verdict (`/v1/explain`) and the rule drafts (`/v1/policy/draft`); Qwen runs the agent reviewer (`/v1/review`). When a provider runs out of credit, the verdict is unchanged and the panels show the findings without the plain words, but the KIMI and Qwen demos stop working.

- `/health/ready` shows `explain`, `policyDraft` and `review` `true` (the keys are set), not that credit is left.
- Credit, tier and spending cap are read in the providers' dashboards by the account owner (Moonshot for KIMI, QwenCloud for Qwen).
- A live check uses the product itself: open https://usebaret.com/novaswap, run the suspicious swap, and see "In plain words" under the Blocked verdict; open https://usebaret.com/review and run the honest scenario.

### 3.6 The sites

- https://usebaret.com/novaswap: the suspicious swap comes back Blocked.
- https://wallet.usebaret.com: the page loads and a passkey account opens.
- https://usebaret.com/install: both zip links download (`extension-latest` release).

## 4. When something breaks

1. Check `/health/ready` and the Render dashboard first; most failures are a sleeping or redeploying API.
2. A fix to code goes through a pull request into `main` with its checks passing ([`release.md`](release.md)); the pull request says what broke and why the fix is needed.
3. Record what broke, when and what was done in [`../QA_LOG.md`](../QA_LOG.md).
