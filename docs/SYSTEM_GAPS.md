# Baret — what is sample, missing, wrong or half done

Checked 2026-10-10 against commit `a48900b`, the live API (`de95b38` and later) and the live sites. Written by Ezgin's agent for the team, before the freeze of Sun 11 Oct.

This is a list of gaps, not of what works. What works and how it was checked on the same day: `verify:demo` 20 of 20 on the live API, KIMI and Qwen with real keys, the wallet's account, vault, history and sealed settings on the live URL with a virtual passkey (`tasks/FOR_EZGIN.md`, `docs/DECISIONS.md` D-032 to D-039). The interfaces themselves: `docs/API_REFERENCE.md`.

**What was not looked at:** the look of any screen; every button of every showcase page in a browser; a real passkey provider, MetaMask or a second device (Hale's H3 and H10); the model answers' wording beyond one run each.

Priority: **P1** a judge can hit it or it makes a public claim false; **P2** real, and it does not break the demo path; **P3** known limit, written down so nobody is surprised.

## Summary

| # | Gap | Kind | Priority | Owner |
|---|---|---|---|---|
| G-01 | Every visitor shares one rate-limit bucket | Wrong | P1 | Ezgin |
| G-02 | The landing and `/install` describe the extension as a working wallet; it is a sample | Wrong claim | P1 | Meriç (copy), Ezgin (decision) |
| G-03 | The API sleeps: the first request after idle takes 15 to 40 s | Half done | P1 | Ezgin |
| G-04 | Five of the six demo sites sign nothing | Sample | P2 | Meriç |
| G-05 | Scrybe's x402 payment is checked and never made | Sample | P2 | Ezgin, Meriç |
| G-06 | Nansen is off | Missing | P2 | Ezgin |
| G-07 | No Cleanverse settlement has happened | Half done | P2 | Ezgin |
| G-08 | Qwen's overpay veto sometimes names a mismatch that is not there | Wrong | P2 | Meriç |
| G-09 | The CRE workflow runs only as a simulation from one machine | Half done | P2 | Ezgin |
| G-10 | The server keeps its state in memory | Limit | P2 | Ezgin |
| G-11 | The wallet's live side: what is still empty or lost on reload | Half done | P2 | Ezgin, Meriç |
| G-12 | The wallet window cannot sign messages | Missing | P2 | Meriç, Ezgin |
| G-13 | Documents that describe an older state | Wrong | P2 | Hale (H14) |
| G-14 | `verify:demo` reports a false failure from the deploy wallet | Wrong (test) | P3 | Ezgin |
| G-15 | Sealed settings: saved by hand, and two things to watch | Limit | P3 | Ezgin |
| G-16 | The SDKs are not on npm | Missing | P3 | Ezgin |
| G-17 | The API is open: no keys, any origin | Limit | P3 | Ezgin |
| G-18 | Contracts are unaudited testnet deployments | Limit | P3 | Ezgin |
| G-19 | The indexer does not cover two contracts | Limit | P3 | Ezgin |
| G-20 | No browser test in the repository | Missing | P3 | Hale |
| G-21 | Named in documents, never built | Missing | P3 | — |

---

## P1

### G-01 · Every visitor shares one rate-limit bucket

**What:** the API limits requests per client, and it sees every request as the same client. Measured on the live API: a direct request left `x-ratelimit-remaining: 119`, the next one through the wallet's Vercel proxy `118`, the next through the showcase's proxy `117`, and a direct one again `116`. Three different senders, one counter.

**Why:** `Fastify({ ... })` in `apps/server/src/api/app.ts` sets no `trustProxy`, so `req.ip` is Render's own proxy and never the visitor.

**What it costs:** the limits are for the whole world, not per visitor: 120 requests a minute in total, and 6 a minute on `/v1/review` and on `/v1/sealed`. Three judges pressing "Run the review" in the same minute can get 429; the page then shows the recorded run of 9 October (which is labelled as recorded). One busy page also slows every other visitor.

**Fix:** `trustProxy: true` in the Fastify options, so the limit keys on the `X-Forwarded-For` address Render and Vercel pass. A caller can then forge that header to dodge the per-minute limit; the daily caps (KIMI 500, review 200, sealed 200) still bound what that can spend. One line, plus a test; redeploy and repeat the measurement above from two networks.

### G-02 · The landing and `/install` describe the extension as a working wallet

**What the pages say:** the landing's first button is "Install the extension". Its FAQ says: "A wallet, installed as a browser extension. It appears in a site's wallet list beside the wallets you already use." `/install` says "It is a Monad wallet that simulates every sign request and checks it before you sign", and offers the zips, which are published (`releases/latest/download/baret-chrome.zip`, built 2026-10-10).

**What the extension does:** it shows its screens on a sample wallet. `apps/extension/src/entrypoints/provider.content.ts`, `background.ts` and `relay.content/index.ts` are stubs (77 lines together, each with a `TODO(week 2)`): no `window.ethereum`, no EIP-6963 announcement, no keystore, no request reaches the server. Installed, it never appears in a site's wallet list and never sees a sign request. `docs/WALLET.md` says so ("frontend only: every surface runs on a sample wallet").

**What it costs:** a judge who installs it finds that the product's first call to action does not do what the page says. The thing that does work is the web wallet and the wallet window (`/novaswap` → "Check with Baret").

**Options:** (a) make the web wallet the first button everywhere and say on `/install` that the extension build is a preview of the screens on sample data; (b) leave it and say it in the submission text. (a) is a copy change in `packages/content/src/showcase/{home,hub,install}.content.ts` and `shared/common.content.ts`. Building the provider is not possible before the freeze.

### G-03 · The API sleeps

**What:** Render's free plan stops the service after 15 minutes idle. On 2026-10-10 the first request after idle took 14.8 s once and did not answer in 40 s once; the next was instant. The keep-warm job (`.github/workflows/keep-warm.yml`, every 10 minutes on paper) ran three times in 24 hours on 2026-10-09: GitHub does not run scheduled jobs on time.

**What it costs:** the first check a judge runs shows "Can't reach Baret" or a long wait. In the wallet, a check that does not answer is unreachable and cannot be signed (correct, and it looks broken).

**Fix:** the Starter plan (E7 part 2). Ezgin has said it comes later; it should be on before Hale records (H13) and stay on through judging.

---

## P2

### G-04 · Five of the six demo sites sign nothing

Only NovaSwap has "Sign with your wallet" and "Check with Baret" (`SignBlock`, `BaretCheck` and `useSendFlow` are used only under `apps/showcase/src/sites/novaswap`). On PixelDrop, OrbitYield, ClaimHub, LaunchPad and Scrybe a connected wallet only gives the panel an address to simulate from: the verdict is live, and there is no transaction. With no wallet and no `VITE_BARET_DEMO_FROM` a site shows a prepared sample and calls nothing; production has the variable set, so the panels are live there.

The demo script uses NovaSwap for the signed attack, so the demo path holds. A judge who tries the same on another site finds a panel and no signature.

### G-05 · Scrybe's x402 payment is checked and never made

Scrybe sends Baret a real EIP-3009 message as typed data with the payment's terms, and the verdict is live. Nothing answers 402, nothing settles the payment, and no question is answered: there is no facilitator and no paywall (`docs/X402_FACILITATOR.md` is a design from 2026-09-13; `/demo/paywall` does not exist). The price, the merchant and the hourly history on the page are fixed values (`apps/showcase/src/sites/scrybe/sample.ts`, `source.ts`). The agent path that does move money is `baret pay` through a PaymentGuard vault, not x402.

Say "Baret checks an x402 payment before it is signed", never "Baret pays over x402".

### G-06 · Nansen is off

No key on Render: `/health/ready` shows `nansen: false` and every verdict lists `nansen: skipped`. The code is there (`apps/server/src/sources/nansen.ts`). Under Balanced the trust-level rule passes without it; under Strict the rules that need Nansen fail closed. The Nansen prize cannot be entered without it (E2). When the key arrives: `labels` mode costs 100 credits a call and the API is open (G-17) behind one shared rate-limit bucket (G-01), so fix G-01 first or keep `funder` mode (1 credit).

### G-07 · No Cleanverse settlement has happened

The check works: the server reads the credential on chain and blocks a transfer to a wallet without one (2 of 2 on the live API). `CompliantPaymentGuard` is deployed and tested on a fork. What has never happened is a real payment through it: the deploy wallet holds 0 aUSDC and only Cleanverse's operator mints it (E6). Without it the prize is entered with the check and the playground screens, and the video must not show a settlement.

### G-08 · Qwen's overpay veto sometimes names a mismatch that is not there

Filed by Hale as P1 for Meriç (`tasks/FOR_MERIC.md`). On `overpay` the veto is right (900000 against 100000) and its reason sometimes adds that the ref does not match the invoice; it does (`ref` is `keccak256("inv-2001")`). The model is never told that. Seen at 11:03 UTC, not seen in the run at 09:10 UTC. The demo uses `injected` until it is fixed.

### G-09 · The CRE workflow runs only as a simulation

`workflows/reputation-oracle` is written and writes to the registry through `simulate.sh --broadcast`. It is not deployed to a DON: that needs CRE Early Access, which the account does not have. So nothing runs on a schedule, the registry is as fresh as the last hand run, and the run needs this machine (`cre login`, `workflows/.env`). The prize page accepts a simulation; the clip is recorded on Ezgin's machine.

### G-10 · The server keeps its state in memory

One process, no database. Lost on every deploy, restart or sleep (G-03): the verdicts `/v1/explain` can explain (ten minutes anyway; after a restart a request id answers 404 `verdict_unknown`), the explanation cache, the 30-minute review answers, and the daily counters of KIMI, review and sealed, which start again from zero. A second instance would not share any of it. Fine for the event; it is a limit to state, not to hide.

### G-11 · The wallet's live side: what is still empty or lost

- **Token allowances are not listed.** Home's "open permissions" shows only the agent; the page says so ("Token allowances you gave sites are not listed here yet").
- **Alerts are always empty** live (`alerts: []` in the store): the drift alert of `docs/WALLET.md` 4.4 is not built.
- **The session's own log lives in memory.** A send, a decline or a Blocked verdict is gone after a reload. Only the vault's payments come back, from the indexer.
- **Nine vault events have no row** in Activity (E10): only `paid` shows.
- **The rules' change history** clears on reload (the page says so).
- **No field for a pasted agent address.** `live.vault.agent(address)` exists; the Agents page only offers the key derived from the passkey, so a Dynamic server wallet cannot be authorised from the wallet's screens. The Dynamic prize rewards exactly that pairing.
- **Balances** are MON and test USDC only, with no price.
- **Rules after a storage clear** fall back to Balanced unless the person saved a sealed copy and presses "Bring them back here" (G-15).

### G-12 · The wallet window cannot sign messages

The protocol between a site and the wallet has `connect` and `sign` for one call (`packages/wallet-core/src/window.ts`). There is no request for `personal_sign` or typed data, so a site cannot ask the Baret wallet for a permit or an x402 authorisation, and "sign in with your wallet" does not work with it. The server already analyses typed data; the wallet's side of it is not built.

### G-13 · Documents that describe an older state

- `README.md` status table: "Apps: built on sample data, frontend only" (the wallet is live), "KIMI and Qwen ... not yet live in production" (live since 2026-10-10), "62 tests" and "18 of 18 scenarios" (171 server tests, 20 of 20).
- `docs/ROADMAP.md` "Where things stand" is dated 2026-10-08 and several bullets are false today ("apps/wallet runs on sample data", "No screen reads /v1/audit/*", "the explanation route is off").
- `docs/WALLET.md` "Live side" ends with "Not live yet: ... the `/connect` and `/sign` windows for a site (M3)"; M3 shipped on 2026-10-09.
- `docs/ARCHITECTURE.md` lists `/mcp/*` and `/demo/paywall` in its endpoint table beside the built ones.
- `docs/X402_FACILITATOR.md` reads as a plan in progress; nothing of it is built.

Judges read the README. These are Hale's H14; the facts to correct them with are in this file and in `docs/API_REFERENCE.md`.

---

## P3

### G-14 · `verify:demo` reports a false failure from the deploy wallet

The scenario "Cleanverse aUSDC to a wallet with no credential" pays the `--from` address. The deploy wallet `0x5aE1…8197` has held an A-Pass since 2026-10-09, so from it the answer is Safe, correctly, and the script prints 19 of 20. From a wallet with no credential (the playground wallet `0x5AE9…2C93`) it is 20 of 20. Until the script uses a fixed uncredentialed recipient, run it with `--from 0x5AE98770795957F9a376083afcb775672FbD2C93`. The `/agents` playground is not affected: it uses the playground wallet as that recipient.

### G-15 · Sealed settings: saved by hand, and two things to watch

- Nothing is saved by itself: after a rule changes, the person presses "Save an encrypted copy" again (the block says when the copy is behind).
- A fresh device is not told a copy exists; the person has to know to open Settings.
- The relayer `0x076705F1ba9e1a295Fc38f99eB767b66F8468eAf` pays about 0.011 MON a save from about 8 MON. Nothing warns when it runs low; `/v1/sealed` then answers 502.
- Ciphertext written to the chain stays there: an entry can be replaced, never removed.

### G-16 · The SDKs are not on npm

`@baret/guard` and `@baret/agent-kit` are `private` workspace packages. A developer clones the repository; `/agents` says so. For "which applications would adopt it", this is the first step missing.

### G-17 · The API is open

`BARET_API_KEYS` is empty and CORS allows any origin, on purpose: a static site cannot keep a key. Anyone who finds the URL can call every route, the paid ones included. What bounds the cost: the rate limits (see G-01) and the daily caps. `/v1/review` can also make the demo agent pay 0.10 dUSDC, at most once per 30 minutes, inside the demo vault's caps.

### G-18 · Contracts are unaudited testnet deployments

Tested with `forge test` (85 tests) and verified on Sourcify; no audit. In `docs/CONTRACTS.md` two lines are unticked: the fuzz of the cap arithmetic as its own item, and the Tenderly traces for the video. Nothing is on mainnet and nothing is planned there.

### G-19 · The indexer does not cover two contracts

`indexer/config.yaml` follows the factory, every vault it made, the first demo vault and the registry. `CompliantPaymentGuard` (its `Settled` events) and `SealedStore` are not indexed, so a Cleanverse settlement would not appear in `/v1/audit/*`.

### G-20 · No browser test in the repository

Every end-to-end check of the wallet was a hand-written Playwright script in a scratch folder, run once. What a later session needs to repeat one is written in `tasks/FOR_HALE.md` (the virtual passkey needs `hasPrf: true`; a `page.goto` after unlock locks the wallet). Unit and route tests: 1029, green.

### G-21 · Named in documents, never built

`/mcp/tools` and `/mcp/call`; batch, stream and replay variants of analyze; the x402 facilitator and `/demo/paywall`; the extension's provider, keystore and x402 interceptor; a Cleanverse REST client (the integration reads Cleanverse's contracts instead); anything on mainnet.

---

## Not gaps: samples that are meant to be samples

- The landing's verdict picker and the agents section's cap run are fixed examples, each labelled "An example request with sample data, not a live check."
- `?sample=<name>` on the wallet and the extension's sample picker exist for the tests and the design states.
- `/review`'s recorded run appears only when the live run cannot start, and is labelled "Recorded run, 9 October 2026".

## Suggested order before the freeze

1. G-01 (one line and a redeploy).
2. G-02 (decide the wording; a copy change).
3. G-03 (the Starter plan, before recording).
4. G-13 (with H14).
5. G-06 and G-07 only if the key and the aUSDC arrive tonight; otherwise both prizes are entered as they stand or dropped, and the texts say what is true.
