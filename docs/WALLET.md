# Baret — Wallet Specification

> Every surface, every screen, every flow of the wallet. This document is **binding**: adding a new screen requires updating this file first, then implementing it. Color/typography will come from `BRAND.md`. See `ARCHITECTURE.md` for the overall architecture, `CONTRACTS.md` for contract details, and `X402_FACILITATOR.md` for x402 mechanics.

Last updated: 2026-10-09 (M6: the screens on live data, one-prompt onboarding, the scoped session; before that the standalone wallet went live: account, transfers and the vault) · Status: **`apps/wallet` is live for the account, transfers and agent delegation on a deployed build; the history page and the site windows are next. The extension stays on sample data** · Source: Baret-Stellar's `docs/wallet-spec.md` — adapted to Monad/EVM (Soroban→EVM, trustline→ERC-20 approval, XLM→MON, Horizon→Monad RPC, Friendbot→Monad faucet).

---

## Implementation status (`apps/wallet`)

| Surface | Status | Where |
|---|---|---|
| Shell | **Done** (2026-10-03): one root route wraps every screen, the request windows and setup included, with the web signature layer shared with the showcase (`@baret/web-ui`, D-019): the self-hosted fonts (no Google Fonts), the motion provider, scroll restoration, the eyelet cursor on every screen, and Lenis on every screen except `/sign` and `/connect`, where the native scroll stays. The page title comes from the route registry. **Audit (2026-10-04):** noindex (meta and `public/robots.txt`); AppLayout loads with the router and paints as the HydrateFallback, so the second lazy hop and the console warning are gone; the screen lead paints at once, with no reveal, and counted balances hold their final width (LCP on a throttled phone 3.07 s to 2.99 s on Home, CLS 0.0004); the cursor and Lenis are off on `/sign` and `/connect` (`Signature quiet`) and stay mounted elsewhere; route errors show copy and a reload, never the raw message; titles carry the brand. | `apps/wallet/src/layouts/RootLayout.tsx`, `apps/wallet/src/router.tsx` |
| 404 | **Built** (2026-10-03): the vector mark on a plate, one stencil line, the way back. | `apps/wallet/src/pages/NotFoundPage.tsx` |
| Assets | **Registered** (2026-10-03): w-01 to w-14, each with 480/768 px copies. The raster marks m-01 and m-10 stay unused (the mark is the vector `Mark`). **Audit (2026-10-04):** the unused raster marks m-01 and m-10 are removed from `public/assets/brand`. w-12 (the gate latch) stays registered and unused: the request windows are narrow and carry no picture, so the request stays above the fold. `assets.test.ts` checks every registry path exists and that no unregistered file ships. | `apps/wallet/src/assets.ts` |
| Frame | **Built** (2026-10-03): from 1024 px a sidebar (the mark, the network, the screens, the account line with copy, the lock); below it a top bar whose menu opens in place and closes on any navigation. The active screen is marked in ink, so orange stays each screen's main action. The sample notice sits above every screen, the request windows included. Locking hides the app until the passkey opens it again. **Audit (2026-10-04):** the phone menu scrolls within the screen, closes on Escape and returns focus; a skip link leads; the current page shows in forced colours. **Session (2026-10-09, M6):** live, the sidebar foot and a strip under the phone header show "Signing without a prompt until {time}" (`components/SessionLine.tsx`); in the last two minutes it turns to the caution tone with "Unlock again for 15 more minutes". With the passkey on every signature it says so instead. The locked screen tells an expired session ("Your session ended", the time, "Anything you had not signed was not sent", focus on the title) from a manual lock. The sample notice shows only on the sample. | `apps/wallet/src/layouts/AppLayout.tsx`, `apps/wallet/src/components/` |
| Data seam | **Sample** (2026-10-03): one store (`WalletProvider`) holds the account, balances, activity, permissions, alerts, rules and their history, the vault and the settings, in memory; a reload starts over and nothing is sent. Live data (Mera, Monad RPC, the Baret server, the indexer) replaces its starting state and its actions, not the screens. Findings are weighed with the engine's D-014 rule where a screen needs it (the rules preview, "check it again"). **Audit (2026-10-04):** the store carries a fail-closed `status` for the analyzer, balances and activity, and `?sample=empty`, `?sample=offline` and `?sample=drift` reach the empty, error and unreachable states every page now renders (K9); offline also hides the vault, the permissions and the alerts, and withdrawals refuse while balances are unread. `fromAnalyze()` in `@baret/wallet-ui/data/analyze` maps a `/v1/analyze` answer onto a sign request. **Live by default (2026-10-09, M6):** the deployed build runs live and `?sample=` keeps the sample; while live data loads, screens show a loading line instead of the error (`status` "loading"); the session's 15-minute deadline always applies and is checked on return to the tab; a passkey asked again while unlocked wipes the old session's keys and keeps the screens; the analyzer status comes from `/api/health`. | `apps/wallet/src/data/` |
| Live side | **Live for the account, balances, send and sign requests (2026-10-09).** `apps/wallet/src/live/live.tsx` is the one place the store meets a real account; a deployed build is live, `?sample=<name>` keeps the sample (the tests and the design states), and `VITE_BARET_WALLET=live` turns it on in dev. **Account:** a Mera passkey account from `@baret/wallet-core`, made with one passkey prompt; the keys stay in memory inside the unlocked session and end on lock, a reload or a 15-minute deadline (`state.sessionEndsAt`). **Stateless:** the browser keeps only the credential id, the account's name and the rules, none of them needed: with storage cleared, "I already have a Baret passkey" offers the site's passkeys and the same passkey gives the same address; rules fall back to Balanced. **Reads:** MON and test USDC from Monad (`VITE_MONAD_TESTNET_RPC_URL`, the public RPC by default); a balance that was not read is an error, never a number. **Signing:** Send builds the call with wallet-core, shows Checking until `/api/v1/analyze` answers with the account's rules, and signs through `Wallet.sign`: Safe is signed, Caution only after the hold-to-override, Blocked and an expired verdict never; no answer is Can't reach Baret. **Checked 2026-10-09 in a headless browser with a virtual passkey against the live API and Monad testnet:** a new account, funded, sent 0.01 MON (confirmed in block 69363788); a send to an address on the registry came back Blocked with no sign button; after `localStorage.clear()` the same passkey restored the same address. The same pass ran on `https://baret-wallet.vercel.app` after the merge (confirmed in block 69367602). **Delegation, live since 2026-10-09 (D-032):** the vault page reads the account's vault from the factory, its balance, caps and spend from the chain and its merchants and payments from `/v1/audit/vault`; every change is a run of sign requests on the page (`start` in `DelegationPage.tsx`, steps from `live.vault`), the first one opening the vault when the account has none. The agent key comes from the passkey's own namespace for that agent (one more passkey prompt) and is derived again each time it is shown. Checked end to end on testnet, the agent's payment and the refusals included (D-032). **Not live yet:** a field to authorise a Dynamic agent address (the call exists: `live.vault.agent(address)`), the history page from the indexer (H5), the `/connect` and `/sign` windows for a site (M3), allowances and alerts (empty). | `apps/wallet/src/live/` |
| Home `/` | **Built**: the account, the balance (testnet tokens have no price, so the USD estimate says so), send, receive and the agent, the assets, recent activity, alerts, and the open permissions with revoke and disconnect. **Audit (2026-10-04):** one banner (analyzer down, then no funds), the balance error, the empty assets and the drift alert come from the store status; the MON balance counts up once; the agent row counts the vault's active merchants. **Live (2026-10-09, M6):** right after setup a one-time panel (the passkey warning, the address with copy, the faucet in a new tab, the rules) that stays hidden once dismissed; balances poll every 3 s for 90 s while the panel or the no-funds banner shows, and on return to the tab; the balance shows a skeleton while it loads; live shows no revoke or disconnect that would only change memory. | `apps/wallet/src/pages/HomePage.tsx` |
| Send `/send` | **Built**: asset, recipient and amount with a summary; each field's error under it; a contract recipient warns without stopping; a look-alike of an address from the history is called out before the review (address poisoning). "Check and review" opens the same sign request a site's request gets. | `apps/wallet/src/pages/SendPage.tsx`, `apps/wallet/src/send/` |
| Receive `/receive` | **Built**: the address as a QR code (a small encoder in `lib/qr.ts`, matched module for module against node-qrcode 1.5.4, no new package) and in groups of four, copy, the network, the faucet. **Live (2026-10-09, M6):** polls for 90 s with "Watching for incoming transfers", then offers "Check again"; it never claims to watch when nothing polls. | `apps/wallet/src/pages/ReceivePage.tsx`, `apps/wallet/src/lib/qr.ts` |
| Activity `/history` | **Built**: eight filters, each row's details (verdict at the time, findings, the rule, what changed, the override, the transaction), a check of the same findings under today's rules, and a CSV built on the device. A declined request is never logged as Blocked. **Audit (2026-10-04):** a failed load shows its error instead of an empty list; a real transaction hash links to the Monad testnet explorer. | `apps/wallet/src/pages/HistoryPage.tsx`, `apps/wallet/src/data/activity.ts` |
| Rules `/policies` | **Built**: where the rules stand (a template or Custom), the three templates, the 25 rules in their ten groups (switches, thresholds where empty means no limit, the trust level, lists) or the exact JSON, Save checked against the server's own schema (loaded with the first save), a preview of recent requests under the draft, the history of changes, export and import. **Audit (2026-10-04):** unparsable JSON is kept with an error instead of being dropped; preview and save refuse while Baret is unreachable and when the schema cannot load (fail-closed); the Form/JSON choice shows in forced colours. | `apps/wallet/src/pages/PoliciesPage.tsx`, `apps/wallet/src/rules/` |
| Agent delegation `/agents` | **Built**: why a vault, who can do what (with the sub-key drawing), the four steps, the vault and its reserve, the merchants with per-payment, hourly (optional) and daily caps and a review of the terms before one is added, pause, resume and remove, what the vault refuses, the agent key and its handover, stopping the agent with a confirmation, and the agent's payments. The copy now matches PaymentGuard as built (D-013): an optional hourly cap, a real pause, and a reserve of the daily caps of every merchant not removed. **Audit (2026-10-04):** a deposit above the balance is refused with its own message; each merchant shows a meter of what it spent against its caps. **Live (2026-10-09, M6):** a change opens in a focused section at the top (scrolled into view, focus back to the trigger after); "Step N of M" with each Sent result kept until Continue; every other trigger waits; a step that cannot be built offers Try again and Stop here; an outside agent address (a Dynamic wallet) can be authorised beside the passkey key; announcements come after the transaction, not before. | `apps/wallet/src/pages/DelegationPage.tsx`, `apps/wallet/src/delegation/` |
| Settings `/settings` | **Built**: account, security, network, privacy and about rows, the danger zone with every consequence stated and a confirmation that stays locked until acknowledged, and what Baret keeps. **Audit (2026-10-04):** Reset leaves an empty wallet, as its copy promises, instead of reloading the sample. **Live (2026-10-09, M6):** the lock switch becomes the read-only "This session" row with its end time; the passkey row says what it covers; the node and server rows are statements. | `apps/wallet/src/pages/SettingsPage.tsx` |
| Setup `/onboarding` | **Built**: the five steps full screen, each with its picture; the passkey prompt and the faucet transfer are stood in for by short waits started by the reader. **One screen (2026-10-09, M6):** "Create my wallet" opens the passkey prompt at once (one ceremony on an authenticator that returns PRF at create) and lands on Home; "Open with my passkey" sits beside it with equal weight for the stateless test; no passkey support is said before any tap. Measured on a Monad testnet fork with a virtual passkey: 4 taps and about 6 s from landing to a confirmed send (funding aside). | `apps/wallet/src/pages/OnboardingPage.tsx` |
| Sign request `/sign` | **Built**: four sample requests, one per verdict, quoting the showcase sites' own claims. The site's claim, the verdict and who checked it, what happens if you sign, what changes, the findings with why they matter, the rules it breaks and the suggested fix, the raw request, the countdown. Blocked has no sign button; the override is press and hold (pointer, Space or Enter) and is logged. Addresses keep their case in the headline. **Audit (2026-10-04):** a locked wallet shows the lock screen here and cannot sign or override (the gate follows the matched route, so /Sign or /%73ign is gated too; the sample keeps the lock in memory, in the tab that set it, until the live keystore holds it); the hold stops on blur, on the key released anywhere, on a hidden tab or a lost window, and screen readers hear how to hold; "1 more rules" and "in 1 seconds" read right; a failed send is announced; SignRequest takes an optional pending state and async callbacks for the live check. **Live, in Send and Agents (2026-10-09, M6):** the result links the transaction on the explorer; a block offers no override (the live wallet never signs Blocked) but the way to the rule; when Baret's answer runs out the request goes stale with Check again and Decline instead of declining itself; "Checked by" lists only the sources that ran; "You send" shows the amount without the fee; a line says no passkey prompt is needed until the session ends. **From a site (2026-10-09, M3):** opened by a site with window.open, the window says "ready" to its opener and takes the first valid request from it (`apps/wallet/src/request/siteRequest.tsx`, protocol in `@baret/wallet-core/window`); the origin shown and checked is the one the browser reports. Locked, it names the waiting site and lets the reader decline, unlock, or create a wallet when this device has none. The request is checked by Baret like a send (impact "This runs a call on {contract}"); Decline answers refused with the reason (blocked, unreachable, declined) and each finding with its values; a sent call answers signed with its hash. Then "Your answer went back to {origin}" and Close this window. No link to the rules there: leaving /sign would drop the request. **KIMI's plain words (2026-10-09, M4, D-036):** a live request that Baret answered (Safe, Caution or Blocked) has a section "In plain words" under the findings, in Send, Agents and a site's /sign: SignRequest takes `explainId` (the request's id, which is Baret's `meta.requestId` on live) and shows `PlainWordsBody` from `@baret/web-ui` with KIMI's byline and the English, Turkish and Chinese switch. Never on the sample, never for an unreachable or unchecked request; after Check again it asks about the new answer. With no key, no answer or an answer about another verdict there is no section at all. | `apps/wallet/src/pages/SignPage.tsx`, `apps/wallet/src/sign/`, `packages/wallet-ui/src/sign/SignRequest.tsx` |
| Connection request `/connect` | **Built**: what the site will and will not be able to do, with the same weight; the first-visit and insecure-connection warnings; connecting adds the site to the open permissions. **Audit (2026-10-04):** gated on the lock like `/sign`; "Don't ask again" now decides whether the site is remembered. **From a site (2026-10-09, M3):** the same handshake; the connect view shows the site's real origin (the insecure warning stays for http outside localhost); Connect answers with the address, Decline answers refused. Without a site, live, the window says it opens from a site's request; the sample keeps its picker. | `apps/wallet/src/pages/ConnectPage.tsx` |

## Implementation status (`apps/extension`)

Built 2026-10-04 on branch `extension-ui`, frontend only: every surface runs on a sample wallet, and nothing is signed or sent. The background, the keystore, the provider and the messaging (`src/entrypoints/background.ts`, `provider.content.ts`, `relay.content/`, `src/lib/messaging.ts`) are untouched and still to be wired (`tasks/FOR_EZGIN.md`).

| Surface | Status | Where |
|---|---|---|
| Shared pieces | **Shared**: the sign request, findings, the rule editor and template cards, the send checks, the QR encoder, the sample account and the formats moved from `apps/wallet` to `@baret/wallet-ui`, so both surfaces show a request the same way. The sign request takes the log, the passkey step and the rules link as props, with slots for a notice, the verdict's picture, a footnote and a compact pinned footer. **Audit (2026-10-04):** the popup layout puts Baret's verdict under the heading, before the site's claim, and pins only the hold (K11); `@baret/wallet-ui` Brand takes the slit of its ground and keeps its mark silent beside the wordmark (K17). | `packages/wallet-ui/` |
| Data seam | **Sample**: one store (`ExtensionProvider`) per page holds the accounts, balances, activity, permissions (allowances, collection access, payment caps), alerts, sites, x402 payments, facilitators, problems, watched addresses, rules and settings; times read against a fixed sample present. Live data replaces its starting state and its actions, not the screens. **Audit (2026-10-04):** `reachable` starts unknown (`null`) and reads as unreachable until the source answers; `check()` retries; unlock, wrong tries and the pause live in the store; `?offline=1` and `?sample=loading` preview the unreachable and loading states. | `apps/extension/src/data/` |
| Sample picker | **Built**: a strip at the top of every popup state says the data is a sample and opens a picker of phases, sign requests and connection requests. `popup.html?phase=signing&request=blocked` and `options.html?sample=empty#/activity` open any state directly. It goes once the background decides the phase. **Audit (2026-10-04):** kept in the build while the extension runs on sample data (owner decision), now a 36 px target. | `src/lib/start.ts`, `src/entrypoints/popup/frame/Sample.tsx` |
| Assets | **Registered**: e-01 to e-31, each with 480/768 px copies (the four verdict tags also 160/320 px). E-22 came back as a second take of the connect gate, so it stands for one site (the site detail); the overview uses e-11. The raster marks m-01 and m-10 stay unused (the mark is the vector `Mark`). The toolbar icons, 16 to 128 px, are drawn from the vector mark (`public/icon/`); the manifest had none. **Audit (2026-10-04):** the pictures top out at 1152 px copies and the 27 unused 1536 px originals and the raster marks are removed (the package drops by about 7.5 MB); the verdict tags keep their 1024 px originals. | `apps/extension/src/assets.ts`, `apps/extension/public/icon/` |
| Popup frame | **Built**: 360 by 600; the top strip (mark, account switcher, alerts with their count, settings), the tab bar with an ink bar that slides to the active tab, sheets that rise over the tab and close on Escape, and bottom confirm dialogs that state every consequence. Opened as a page (a preview), the frame sits centred. **Audit (2026-10-04):** the frame shrinks to the window (zoom, 320 px, Firefox Android full screen) so the decision buttons stay visible; every state has a main landmark and an h1; sheets return focus to their opener and make what is under them inert; a confirm ignores Escape while it works. | `src/entrypoints/popup/frame/` |
| First run, Locked | **Built**: first run makes the case in three verbs and hands off to setup in a tab (e-09). Locked is one field with show and hide, the reason it is locked, a wrong-passphrase error, a 30 s pause after five tries, and an honest "forgot your passphrase" (e-10). **Audit (2026-10-04):** unlock, wrong tries and the pause live in the store (they hold while the popup stays open; the live keystore must keep them across reopens, FOR_EZGIN), the countdown is announced once, and the first-run line is the brand line "Check it first. Then sign." | `src/entrypoints/popup/screens/` |
| Home tab | **Built**: the balance (counts up once, never under reduced motion), send, receive and swap, the one banner that matters most (drift, unreachable, revoked, unsettled, a cap nearly used, backup, fee money), tokens, the last four log rows and the two busiest allowances with meters. Empty: e-11. **Audit (2026-10-04):** the balance counts up inside a box sized by its final value, so MON never moves (CLS 0). | `screens/Home.tsx` |
| Activity tab | **Built**: six filter chips, Today, Yesterday and Earlier, each row opening in place into its verdict, rule, findings, what changed, fee and transaction. Empty: e-12. | `screens/Activity.tsx` |
| Allowances tab | **Built**: token allowances and payment sites with live meters (per payment, hour, day), pause and resume for payments, revoke and revoke all behind confirmations that say revoking is a transaction, caps set in advance, the help. Empty: e-13. | `screens/Allowances.tsx` |
| Settings tab | **Built**: six rows that open their full page, lock, and a reset that waits for "I have my recovery phrase" (e-31). | `screens/Settings.tsx` |
| Send, Receive, Swap, Accounts, Alerts | **Built**: Send checks like the wallet's (address poisoning included) and opens the same sign request; Receive shows the QR and the address in groups; Swap says it is not built (e-15); Accounts picks, renames and adds (e-16); Alerts marks read, dismisses and acts (e-14). Empty Send e-29, empty Receive e-30. | `screens/` |
| Sign request phase | **Built**: the wallet's request, compact, with the verdict's tag (e-17 to e-20), a first request from a site, the window note, and the queue (1 of 3, decline all). Messages (readable and raw), structured data with the allowance a permit hides, and the four x402 payment states (first payment with its caps, paid automatically, over a cap, not checked). **Audit (2026-10-04):** typed data and permits carry a verdict, findings and rules: a Blocked permit gets the hold-to-override, never a one-click Sign; each request shows its own network; while a request is checked, the verdict line holds two lines, so the answer does not push the request down (CLS 0.0007 for Safe and Caution, 0.009 for Can't reach Baret, 0.021 for Blocked). | `screens/Sign.tsx`, `parts/Requests.tsx` |
| Connect phase | **Built**: what the site will and will not be able to do with the same weight, the account the site gets to see, the first-visit, insecure and several-wallets notes, and the already-connected state (e-21). **Audit (2026-10-04):** on an insecure (http) site Decline is the primary and Connect is secondary. | `screens/Connect.tsx` |
| Options frame | **Built**: the wallet's frame: from 1024 px a sidebar with the seven pages and the account line (copy, lock); below it a top bar with a menu; the sample notice above every page; locking shows the popup's locked screen. **Audit (2026-10-04):** the options page opens in a tab (`manifest.open_in_tab`); "Forgot passphrase > Reset" on its lock screen used to unlock the wallet and now resets and opens restore; navigation moves focus and announces the page; the layout paints as the HydrateFallback. | `src/entrypoints/options/OptionsLayout.tsx`, `parts/kit.tsx` |
| Overview `#/` | **Built**: the balance beside Baret's status (answering, the rules in force, the last check), assets, permissions by exposure, the wallet checkup, recent activity, connected sites and watched addresses. **Audit (2026-10-04):** the total counts up inside a box sized by its final value, so nothing beside it moves (CLS 0). | `options/pages/HomePage.tsx` |
| Activity `#/activity` | **Built**: search, six filters and an amount range, rows that open into the full details, select rows to check them again under today's rules or export them, and a CSV of everything built on the device. | `options/pages/ActivityPage.tsx` |
| Permissions `#/permissions` | **Built**: the four figures, search, sort and the kind filter, each permission opening into its week of spending, caps, holder and uses, with revoke, set a limit and pause; the clean-up states the count before every button. An allowance with no limit counts as the whole balance of its token. | `options/pages/AllowancesPage.tsx` |
| Rules `#/rules` | **Built**: start from a set (switching shows every change first), the 25 rules by group or by search, the exact JSON with the line of any error, the changes as stricter or looser with their own undo, the preview over recent requests, save checked against the server's schema, a question before leaving unsaved changes, export and import. **Audit (2026-10-04):** the save bar no longer covers the view switch (K12); JSON edits count as unsaved; leaving with unsaved edits asks first; a failed schema load saves nothing. | `options/pages/PoliciesPage.tsx`, `src/data/rules.ts` |
| Payments `#/payments` | **Built**: the case for keeping count (x402 forgets every payment), six figures, a 7-day ticker where each payment fills its checked, verified and settled squares, the merchants with their caps and spend (pause, change caps, revoke), the facilitators (used before or new), what needs a look (declined by a rule, over a cap, wrong payee, unsettled) with pause and dismiss, the settlement receipts with explorer links, and pay-within-caps. **Audit (2026-10-04):** cap changes follow PaymentGuard's order rules and say that saving is one transaction to the vault with a network fee (K13, confirm with Ezgin); totals use BigInt and the asset from the data. | `options/pages/X402Page.tsx` |
| Sites `#/sites`, `#/sites/:origin` | **Built**: every site that ever asked, with search and five filters, its status and what it can spend; a site's page says what it can and cannot do with the same weight, its requests and payments, and pause, disconnect, block, revoke its permissions and forget, each behind a dialog that says what changes on-chain and what does not (e-27, e-22). | `options/pages/SitesPage.tsx`, `SiteDetailPage.tsx` |
| Settings `#/settings` | **Built**: account, security (passphrase, lock time, the recovery phrase behind a passphrase and a check, lock now), rules, network (the node and the analysis server with a test), notifications, privacy (export, clear), advanced, about (not audited yet, said plainly) and the danger zone. **Audit (2026-10-04):** the custom node and server URLs no longer claim "Saved" or a working connection; they live on the page until the settings shape has fields for them (K14, FOR_EZGIN). | `options/pages/SettingsPage.tsx` |
| 404 | **Built**: the mark on a plate, the shared line, the way back. | `options/pages/NotFoundPage.tsx` |
| Setup `#/onboarding` | **Built**: the eight steps full screen, each with its picture (e-01 to e-08): welcome, a passphrase with its strength, the key, the backup (twelve sample words that fail the recovery-phrase checksum, a reveal, a copy warning and a two-word check, or a confirmed skip), the faucet, the account check, the starting rules, done. Restoring checks the twelve words against the word list and the checksum and skips the key and backup steps. `options.html?restore=1#/onboarding` opens it. **Audit (2026-10-04):** Back on every step and browser Back moves one step; the key step uses `m.div` (LazyMotion is strict) and the progress marks no longer pulse. | `options/pages/OnboardingPage.tsx`, `options/pages/onboarding/` |

---

## 0. There Are Two Wallet Surfaces — Why

Baret ships two separate wallet products; both use the same `@baret/guard` analysis engine but have different account layers and different bounty targets:

| | `apps/extension` (flagship) | `apps/wallet` (standalone demo) |
|---|---|---|
| Account layer | Classic self-custody: local keypair, passphrase-encrypted keystore (seed phrase backup available) | **Mera passkey** — no seed phrase, PRF-derived key material |
| Purpose | Daily use, connecting to dApps, showcase demos | Live proof for the Mera bounties (`BOUNTIES_AND_TRACKS.md` #4, #5) + PaymentGuard agent sub-key demo |
| Platform | Chrome MV3 (+ Firefox if possible) | Standalone web app (React, its own port) |
| In this file | §2 | §3 |

**Decision (D-009, see `DECISIONS.md`):** The extension's account layer is not being moved to Mera — the reliability and permission model of a WebAuthn/passkey flow inside an MV3 popup is more complex; the extension keeps the classic passphrase+seed model. Mera's "no seed phrase" promise can be shown much more cleanly in `apps/wallet`, a web page with full control. This lets both bounties be won on a real, unforced surface.

---

## 1. Shared Concepts

### 1.1 State Machine (for both surfaces)

```
WalletState =
  | { phase: "uninitialized" }       // first-run setup, no wallet
  | { phase: "locked"; meta }        // wallet exists, session locked
  | { phase: "ready"; session }      // unlocked, idle
  | { phase: "signing"; req, … }     // a sign request is being reviewed
  | { phase: "alert"; alert, … }     // drift / revoked merchant — banner
```

Transitions are one-way and explicit. `uninitialized` → redirects to onboarding; `locked` → shows a minimal unlock screen.

### 1.2 Terms

| Term | Meaning |
|---|---|
| **Authority address** | The wallet's main 0x address (extension: local keypair; apps/wallet: address derived from Mera) |
| **Sub-key / Agent signer** | A narrowly scoped signing authority derived for a merchant/agent. A local session key in the extension; in apps/wallet a Mera PRF sub-key, bound on-chain via `PaymentGuard.setAgentSigner()` |
| **Allowance** | An ERC-20 `approve` grant (spender + limit) OR a PaymentGuard merchant cap — both are shown in the same "Allowances" tab |
| **Drift** | An on-chain event that the wallet did not sign but that changes balance/authority |
| **Verdict** | The user-facing form of an analysis result: Safe / Caution / Blocked |

---

## 2. Extension — Four Surfaces

The wallet renders in four mutually exclusive contexts:

| Surface | Trigger | Size | Persistence | Navigation |
|---|---|---|---|---|
| **Popup** | User clicks the toolbar icon | 360 × 600 | None — closes on blur | Bottom tab bar |
| **Options page** | Toolbar menu / browser settings / deep-link | 1280×800+ (responsive) | Tab persists | Sidebar |
| **Sign request** | dApp calls `eth_sendTransaction`/`eth_signTransaction`; or the content interceptor catches an HTTP 402 | 360×600 (popup re-render) | Closes on resolve/reject | None — uses the canvas itself |
| **Onboarding** | First-run setup or after a Reset | Full screen (options page route) | Persists until completed | Step indicator only |

**Rule:** While a sign request is in progress the popup never shows nav. The sign-request surface is a full-screen re-render of the popup; balance, history, chrome — all hidden. When the signature resolves, the popup returns to the last viewed tab.

### 2.1 Popup (compact)

```
┌──────────────────────────────────────┐  360 × 600
│  TOP STRIP                          ⋯│  Account switcher · alert count · ⚙
├──────────────────────────────────────┤
│  MAIN BALANCE                        │  Big number · USD sub-line
│  [ Send ] [ Receive ] [ Swap ]       │
├──────────────────────────────────────┤
│  ALERT BANNER (conditional)          │
├──────────────────────────────────────┤
│  TAB CONTENT — scrollable            │  Default: Home → recent activity
├──────────────────────────────────────┤
│  TAB BAR: Home · Activity · Allowances · Settings │
└──────────────────────────────────────┘
```

**Top strip:** Account switcher (address + balance sub-line) → opens the *Accounts* sheet. Alert counter → shows a pill when `alertsUnread > 0`, goes to *Activity → Alerts*. Settings icon → opens the *Settings* tab.

**Main balance:** A single big number, the native MON balance (from Monad RPC, converted from wei). USD sub-line from the price API (60s cache). Count-up animation on first load, none afterwards. Three quick actions: **Send**, **Receive**, **Swap**. "Swap" is a placeholder in v1: *"Swap coming soon. For now, use a Monad DEX directly → [link]"* — we are not shipping a half-baked swap feature.

**Alert banner** is visible if any of the following holds:
- An allowance that exceeded 80% of its cap in the last hour
- An unread drift alert in the last 7 days
- A merchant's sub-key was force-revoked
- A pending x402 verify-orphan (signed but no settlement confirmation arrived)

**Tab content (Home default):** "Recent activity" (last 4 entries), "Active allowances" (top 2 by hourly hit count, mini progress bar). Empty state: "No activity yet. Try a transfer or connect to a dApp."

**Bottom tab bar:** Home · Activity (badge: `alertsUnread > 0`) · Allowances · Settings. Send/Receive are **not** in the tab bar — they live in the quick actions on Home; the tab bar is only for things you return to.

### 2.2 Popup — Activity Tab

Reverse-chronological log: outgoing transfers, incoming transfers (detected by the post-sign monitor), dApp signatures (with merchant origin chip), x402 payments (merchant + amount + cumulative spend chip), drift alerts, verify-orphans, revoke events.

**Filter chips:** All · Sends · Receives · dApps · x402 · Alerts

**Row anatomy:** `● Origin/Counterparty` (status dot + bold line) / `Action — amount · time ago` (muted line). Click → expands inline (popup) or opens a full detail sheet (options): simulation findings, balance changes, signature, explorer link (`testnet.monadexplorer.com`).

**Empty state:** "You haven't signed anything yet. Connect to a dApp or send some MON."

### 2.3 Popup — Allowances Tab

The visual heart of the product — the live cap of every active authorization and one-click revoke.

**Header strip:** Total number of active grants + total spent in the last 24 hours. "Revoke all" button (destructive, asks for confirmation; drops every smart-wallet sub-key/agent signer).

**Merchant card:**
```
▲ merchant.example
  USDC · Hourly cap
  ━━━━━━━━━━━━━━━━━━━░░░░░  62%
  $1.86 / $3.00 (this hour)
  ─────
  18 calls today · last 4 min ago
  [ Pause ]  [ Revoke ]
```

**Pause** = freeze the sub-key locally (no on-chain change, reversible). **Revoke** = sends a `PaymentGuard.revokeAgentSigner()` (or classic ERC-20 `approve(spender, 0)`) call; the merchant can never sign with this sub-key again. Revoke opens a confirmation sheet that explains the outcome in plain language.

**Empty state:** "You haven't authorized any merchants yet. They'll show up here when you connect to an x402 service or a dApp that asks for a token approval."

**Manual allowance creation (advanced):** Behind the `+` icon in the header. Lets an advanced user pre-create a capped sub-key before any merchant asks for one — for testing and for agents that need pre-provisioned scope.

### 2.4 Popup — Settings Tab

Compact; each row links to its full version on the options page.

| Row | Sub-line |
|---|---|
| Network | "Testnet" / "Mainnet" |
| Security | "Locks after 15 min of inactivity" |
| Policy | "Balanced template" |
| About | "v0.1.0 · open source" |
| Lock wallet | (instant action) |
| Reset wallet | (destructive — opens confirmation flow) |

### 2.5 Options Page (full)

Two columns: 240px left sidebar + main column (max-width 1024). Same tabs as the popup, expanded.

**Sidebar:** Account switcher · Home · Activity · Allowances · **Policies** (options only) · **x402** (options only) · Settings · Lock wallet · Help/Docs

**Home (options):** In addition to the popup hero: Holdings table (MON + ERC-20 token list, with values), Watched allowances list (pulse animation when a hit occurs), Recent dApp connections, News/changelog strip (from a static JSON feed).

**Activity (options):** Same as the popup + date range filter, origin search, amount range filter, CSV export, bulk re-analysis (re-runs past txs against the current policy and flags retroactive drift).

**Allowances (options):** Each merchant card grows to a full row: 7-day spend chart (sparkline), detailed cap breakdown (per-tx · hour · day), sub-key/agent signer 0x address + explorer link, all txs under this allowance (expandable). Bulk actions: "Revoke unused for 30 days", "Export all", "Reset to defaults".

**Policies (options only):** Full editor. Form tab + raw JSON tab. Three template buttons at the top (Strict/Balanced/Permissive). A live policy preview shows what would change if applied. Saving is explicit; never auto-applied.

**x402 (options only):** Dedicated x402 dashboard — see `X402_FACILITATOR.md` §4.4, kept in sync:
- Overview header: total spent today/week/month, active merchant count, alert count
- Live ticker: a 7-day timeline where each x402 payment fills its simulate→verify→settle states as 3 dots
- Per-merchant: the same allowance cards, grouped by facilitator
- Per-facilitator: reputation card — known-good vs unknown
- Drift-orphan inbox: verified-but-not-settled and signed-but-unconfirmed cases

**Settings (options):** Identity (account name), Security (change passphrase, idle timeout, recovery), Network (testnet/mainnet selector, custom RPC URL override), Policy (link to the Policies tab), Notifications, Privacy (telemetry off by default, local data export), Advanced (dev-only), Danger zone (Reset wallet).

### 2.6 Sign Request

Triggered when a dApp calls `eth_sendTransaction`/`eth_signTransaction`/`personal_sign`/`eth_signTypedData_v4` or when the content interceptor catches an HTTP 402.

```
┌──────────────────────────────────────┐  360 × 600
│  ◐  merchant.example                 │  origin chip + favicon
│  Sign request                        │
│  Send 0.50 MON to 0xBF…Q9Y           │  verb + object
├──────────────────────────────────────┤
│  ✓ Safe to sign                      │  hero finding (Safe/Caution/Blocked)
│  Matches your policy.                │
├──────────────────────────────────────┤
│  WHAT CHANGES                        │
│   − 0.50 MON  →  Counterparty        │
│   − 0.0002 MON (network fee)         │
├──────────────────────────────────────┤
│  [▾ Findings (2)]                    │  collapsible
│  [▾ Policy hits (0)]                 │
│  [▾ Raw transaction]                 │  always last; advanced
├──────────────────────────────────────┤
│  ⏱ Auto-declines in 04:23            │
│  [ Decline ]    [ Sign and send ]    │  primary disabled on block
└──────────────────────────────────────┘
```

**Hero finding states:**

| State | Hero text | Primary button |
|---|---|---|
| `ok` (safe) | "Safe to sign" + 1-line summary | Enabled, primary |
| `advisory` (safe + warning) | "Sign with caution" + reason | Enabled, primary; "Sign anyway" |
| `block` | "Blocked by your policy" + rule | Disabled (or, if the user's policy allows it, "Sign anyway" + double confirmation) |
| `error` (analyzer unreachable) | "Can't reach Baret" + offline-mode hint | Enabled but not styled as primary — explicitly "Sign without protection" |

**What changes:** Comes from the analyzer's `estimatedChanges`: native MON delta, ERC-20 token delta, allowance/approval changes.
- Native MON and token balance deltas as `±` rows; the user's wallet first, then counterparties
- Approval row: yellow "**ERC-20 approve** — merchant.example spends up to 10 USDC"
- For x402: "Pays $0.001 USDC to merchant.example" + cumulative spend chip

**Findings/Policy hits/Raw transaction:** Each finding has a severity dot + code + plain-language summary; expanded, the full message + a "Why it matters" link. Policy hits lists the rules that fired (rule name + current/limit + "edit policy" link). Raw transaction: hex calldata dump + decoded function call + signers — advanced users only, never the default.

**Auto-decline:** For x402 requests, a countdown to `maxTimeoutSeconds`; auto-rejects on expiry. For normal dApp requests, a fixed 5-minute ceiling (configurable in advanced settings).

### 2.7 Onboarding (Extension — classic seed)

8 steps, ~3-4 minutes for a careful user. Rendered on the options page route, not in the popup.

```
[●○○○○○○○] Welcome
[●●○○○○○○] Set a passphrase
[●●●○○○○○] Generate keypair (automatic)
[●●●●○○○○] Back up your secret
[●●●●●○○○] Fund the account (testnet faucet)
[●●●●●●○○] Smart wallet provisioning
[●●●●●●●○] Choose a policy template
[●●●●●●●●] Done
```

1. **Welcome:** One-sentence hero ("A wallet that watches what happens after you sign."), three feature chips (Pre-flight sim · Live monitor · Real revoke). CTA: **Get started**. Footer: "Testnet only · Demo network · Open source · Self-custody".
2. **Set a passphrase:** Two password inputs + strength meter + a "Why a passphrase instead of a PIN?" explainer. Min 12 characters.
3. **Generate keypair (advances automatically):** ~3-second "generating" animation. When done, the new `0x…` address + a "Created" timestamp are shown. In the background: secp256k1 keypair generation; the encrypted keystore is written to IndexedDB.
4. **Back up your secret:** "Save this **once**. If you lose it, there is no recovery." 12/24-word mnemonic or raw private key (decision to be added to `DECISIONS.md` — which one will be used). "Reveal" button → "I've saved it" checkbox → **Continue** unlocks. The "Skip backup" link requires a two-click confirmation.
5. **Fund the account:** Current balance (`0 MON`), address, testnet faucet CTA (`faucet.monad.xyz`). Already-funded accounts count as success. The user must reach a minimum threshold (e.g. ≥0.1 MON) to proceed.
6. **Smart wallet provisioning:** Triggered automatically. Progress text shows the status stream ("Checking authority…", "Resolving…", "Resolved"). **For now**, provisioning verifies that the authority is funded and returns the funded address as a placeholder smart wallet — a real smart account contract integration is TODO (see `ARCHITECTURE.md` §10 "explicit non-goals" — this placeholder must not be permanent; it should turn into the real integration in Week 4).
7. **Choose a policy template:** Three cards (Strict/Balanced/Permissive), each showing its 3 most prominent rules. A "Customize later" link below. CTA: **Apply policy**.
8. **Done:** ✓ + "You're protected." + three "Try it" suggestions: try the showcase, connect to a real Monad dApp, set up your first allowance. CTA: **Open wallet**.

---

## 3. Standalone Mera Wallet (`apps/wallet`)

The simplified, Mera-passkey-powered demo counterpart of the extension. Goal: demonstrate the Mera bounties (`BOUNTIES_AND_TRACKS.md` #4, #5) clearly and without forcing it.

### 3.1 Onboarding (Mera — no seed phrase)

```
[●○○○○] Welcome
[●●○○○] Create a passkey (WebAuthn)
[●●●○○] Fund the account (testnet faucet)
[●●●●○] Choose a policy template
[●●●●●] Done
```

1. **Welcome:** "No seed phrase. A passkey is enough." theme. CTA: **Start with a passkey**.
2. **Create a passkey:** The browser's native WebAuthn dialog (Face ID/Touch ID/Windows Hello/security key). On success, Mera derives deterministic key material from the PRF extension; the account's `0x…` address is derived from it. The only thing shown to the user: "Your account is ready — your device is your key."
3. **Fund the account:** Same as the extension (testnet faucet).
4. **Choose a policy template:** Same three templates as the extension.
5. **Done:** "You're protected — and there's no recovery phrase anywhere."

### 3.2 Agent Sub-Key Demo (Mera "One Passkey, Many Keys")

An "Agent Delegation" page unique to the standalone wallet: here the user deposits MON/USDC into a PaymentGuard vault, defines a cap for a merchant, and triggers **the derivation of a second, narrowly scoped sub-key from Mera's PRF material**. This sub-key is bound on-chain via `PaymentGuard.setAgentSigner()` without ever touching the main passkey. The page shows this:

```
Owner passkey (Mera)  ──derives──▶  Agent sub-key (Mera PRF, different salt)
        │                                   │
        │ full control                      │ pay() only, within cap
        ▼                                   ▼
   Vault deposit/withdraw          PaymentGuard.pay(merchant, amount)
```

If the user says "Revoke", the sub-key is immediately invalidated on-chain via `revokeAgentSigner()` — the main passkey was never at risk. This flow is the direct answer to the Mera bounty's "most creative non-wallet use of Mera's PRF-derived key material" criterion.

### 3.3 Pages (summary)

A simplified form of the extension's tab structure: Home, Send, Receive, History, Policies, Settings, Connect, Sign, **Agent Delegation** (new, §3.2). The Sign flow uses the same `@baret/guard` call as the extension.

---

## 4. Critical Flows

### 4.1 Connecting to a dApp (EIP-1193 / EIP-6963)

```
dApp                 Content script        Background          Popup UI
 │ window.ethereum   │                     │                   │
 │ (EIP-6963 announce)│<────────────────────│                   │
 │ eth_requestAccounts│────────────────────>│ openConnectPopup()│
 │                    │                     │──────────────────>│ Connect screen
 │                    │                     │                   │ user approves
 │                    │                     │<──────────────────│ approve(account)
 │ {accounts}         │<────────────────────│                   │
```

### 4.2 Signing a transaction

1. The dApp calls `eth_sendTransaction`.
2. The content script forwards the raw tx-request to the background via `runtime.connect`.
3. Background: decodes the calldata → calls `TransactionGuard.evaluate({ transaction, userWallet, policy })` (goes to the Baret analyzer at `/v1/analyze`) → reads the `allow`/`block` decision + `estimatedChanges` → opens the popup in Sign-Request mode.
4. The popup renders the Sign Request (§2.6).
5. The user chooses Decline or Sign.
6. Background: on Sign, signs with the local keypair (or Mera sub-key), sends to Monad RPC if in `signAndSend` mode, and posts the signed tx back to the dApp. On Decline, posts sign-rejected with the rejection reason. Logs to history in every case.
7. The popup returns to the last viewed tab.

### 4.3 Capturing x402 payments

The content script monitors `fetch`/`XMLHttpRequest`. When a 402 + `PaymentRequirements` response arrives: see `X402_FACILITATOR.md` §3 (the full sequence diagram is there). Summary: extract → policy check → if approved, the payment header is built and signed (not an envelope, only the payment authorization) → the content script automatically retries the request → the background monitors settlement → the ledger is updated.

### 4.4 Drift alert

The background monitor watches Monad RPC (WebSocket subscribe, not polling — per the Alchemy recommendation in `notes-2.txt`) for the authority + smart-wallet addresses, and if it sees an outgoing tx we did not initiate: push notification → enters the ALERT state → popup badge +1 → the user clicks the banner → full event view: Inspect (open in explorer), Pause sub-key, Revoke sub-key, Mark as known (allowlist).

### 4.5 Revoking a sub-key / agent signer

1. The user presses "Revoke" on an allowance card.
2. Confirmation sheet: "merchant.example will no longer be able to sign payments from your wallet. This drops the on-chain sub-key. Continue?"
3. If confirmed, the background builds a `PaymentGuard.revokeAgentSigner()` (or classic `approve(spender, 0)`) call and opens a Sign Request.
4. The user signs (this is a privileged operation; it requires the main authority, not the sub-key).
5. Once confirmed: the ledger marks the merchant `revoked`, the sub-key is gone, and every future payment attempt from that merchant fails at the wallet level.

---

## 5. Error and Empty States

| Where | State | Copy |
|---|---|---|
| Popup home | No balance + no activity | "Connect to a dApp or send some MON." |
| Activity tab | Empty | "Your activity will show up here. We log every signature, including the ones we rejected." |
| Allowances | Empty | "You haven't authorized any merchants yet." |
| Sign request | Analyzer offline | "Can't reach Baret. Sign without protection?" |
| Sign request | RPC unreachable | "Monad RPC isn't responding right now. We'll retry shortly." |
| Network mismatch | dApp wants mainnet, wallet is on testnet | "This dApp wants mainnet but you're on testnet. Switch?" |
| Wallet locked | Toolbar click | Single-input passphrase screen + Reset link |

Every error: what happened, what the user can do, what we did — never just "Error" or a stack trace.

---

## 6. Accessibility & Performance Budget

- Every action is reachable via Tab+Enter; the sign-request modal traps focus.
- Minimum 32px hit target (36px in the popup).
- `prefers-reduced-motion` disables count-ups, live pulses, and the onboarding animation.
- Screen reader: every status icon is paired with an `aria-label`.
- Popup first paint: ≤200ms cold, ≤60ms warm. Sign-request render: ≤400ms. Background memory: ≤120MB idle, ≤200MB while actively monitoring.

---

## 7. Out of Scope for V1 (scope-guard)

- Multi-account UI beyond the single smart-wallet identity
- Mainnet (v1 is testnet only; mainnet flag in v1.5)
- Hardware wallet integration (Ledger/WebUSB)
- Cross-device sync for the allowance ledger
- In-popup swap (placeholder only)
- NFT view / portfolio (Phase 2)
- Custom RPC URL (Phase 2; v1 has a fixed Monad testnet endpoint, optional override in advanced settings)

---

*This document is the implementation contract. Every wallet PR must reference the section it implements.*
