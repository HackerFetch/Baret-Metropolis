# Baret — Frontend Content Specification (Showcase / Marketing Site)

> **This file is about CONTENT only: what each page says, which sections it has, which text/messages/data are shown, and what the user can do.** Color, typography, spacing, animation, palette — none of that lives in this file and never will; those belong to `BRAND.md` and to the frontend team's own design decisions. A designer/developer reading this file should learn "what belongs on this page", not "how it should look".

Last updated: 2026-10-09 (M1: NovaSwap signs for real through the connected wallet; M2: the comparison tells that one request's two paths; before that, 2026-10-04, the frontend audit: the landing is prerendered, every route has its own head and preloads, accessibility and copy-truth fixes on every page) · Status: **Content specification, no design/implementation** · The final words live in `packages/content`; where this file and the content disagree, the content wins · Source: Baret-Stellar's `apps/showcase` codebase — content adapted to Monad/EVM. Per user instruction, the site names are **preserved verbatim**: SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD (see `DECISIONS.md` D-010).

This covers every page `apps/showcase` owns: **Home**, **Showcase hub + 6 sites**, **Agents**, **Docs**, **Install**.

Audit lab numbers (2026-10-04) are medians of three runs on the production build served over HTTP/2 with brotli, in Chrome with 4x CPU and Slow 4G (562.5 ms RTT, 1.44 Mbps), on a 390 px phone unless a row says desktop. On the client-rendered routes the first paint now comes about 0.2 s later, because the route's own chunks download beside the entry; the largest paint lands 0.45 to 3.1 s sooner on every route except Docs, where it holds at 3.1 s.

---

## 1. Home / Landing Page

**Purpose:** Answer "what does this do and why does it matter" in 60 seconds for someone who has never heard of the product. A professional, unpretentious tone that speaks in numbers.

| Surface | Status | Where |
|---|---|---|
| Landing `/` | **Simplified + signature layer** (2026-10-01): owner-approved smooth scroll (Lenis), parallax, word-mask text reveals, an eyelet cursor, a WebGL2 hero layer and a bento grid for the pillars block, each off under reduced motion (BRAND §08). 8 blocks in scroll order (opener in 3 frames, hero, checks, how it works, six dApps, verdicts, agents, closing), down from 12. Every block uses one grammar: a heading, at most one short paragraph, one row or grid of equal items, no boxes around copy, no numbered tags. Every string comes from `home.content.ts`; keys that no longer render stay in that file under a `Not rendered on the landing since 2026-10-01.` comment. **Audit (2026-10-04):** prerendered at build time and hydrated (`scripts/prerender.mjs`, `src/entry-server.tsx`, checked by `entry-server.test.tsx`), so the first frame needs the HTML and the CSS only: LCP 2.74 s to 1.88 s on a phone, 2.90 s to 1.88 s on desktop, CLS unchanged. Headings read once (TextReveal keeps one copy of the text); the trust line adds "Not audited yet"; "All 17 checks" became "the 17 checks"; the share image's alt text describes the logo. | `apps/showcase/src/pages/HomePage.tsx`, `apps/showcase/src/landing/` |

Landing improvement pass (2026-10-01, IMPROVE A-H on top of the signature layer, which is kept as it was):
- Done, interactive components (all sample data, keyboard and touch, complete static view under reduced motion): H1 verdict check in the Verdicts block with the H2 rule switch folded in (a real checkbox with `role="switch"`), H3 daily-cap presets in the Agents block, H4 "all 17 checks" `<details>` under the marquee (motion mode only; its open animation comes from `details::details-content` in `tokens.css`). Illustrative `<Verdict>`s pass `announce={false}`; one persistent `role="status"` region owns announcements (F8). C2: the Agents H2 breaks only between sentences (`keepBeats`). C3: Verdicts uses a subgrid. C4 partial (the row/card switch stays at `lg`), C5 skipped.
- Done, shell and type: B2 `text-wrap: pretty` is global (per-element classes removed), B3, B4 hero body via `splitLead` capped at 44ch, B7, H1 sized in `cqi` inside an `@container` copy column. F1 `scroll-padding-top: 72px` on `html` (per-section `scroll-mt` removed). A1/F2 press scale and listed-property transitions on LinkButton and ShowcaseCard. A3 160 ms view-transition crossfade on every internal `<Link>`. A5 `Reveal` sets `data-reveal` only once its IntersectionObserver is attached and `data-in` on entry; CSS hides only `[data-reveal]:not([data-in])`, reset under reduced motion and print. The landing surface enter follows BRAND §08 (460 ms / 14 px in `shared/reveal.css`), not IMPROVE A5's 160 ms / 6 px. D2 header action (`common.actions.openShowcase` from 768 px, the nav "Showcase" label on phones, `size="sm"` ghost LinkButton); no horizontal scroll at 320 px. D3 the closing note became linked `home.cta.facts` (`cta.note` is kept in content, not rendered). D4 phone labels via `labelPhone` keys. F3, F4 (`data-nav-item`, `aria-current="page"` from NavLink, forced-colors rules), F5.
- Done, SEO head (G1-G6): `index.html` gets title, description, canonical, `og:*`/`twitter:*`, `og:image:alt` from `home.meta` through the `baretHead` Vite plugin; `dist/<route>/index.html` is generated per route with its own head (`data-static-head` nodes are removed by `main.tsx` on boot); `og.png`, `robots.txt`, `llms.txt`, `site.webmanifest`, apple-touch icon. The canonical and sitemap appear, and `og:image` becomes absolute (it is a relative `/og.png` without it, which most link previews ignore), only when `BARET_SITE_URL` is set at build time; the domain is an owner decision. `envPrefix` was deliberately left unwidened (a `BARET_` prefix would expose every `BARET_*` variable to the client).
- Done, performance: E1 the hero image preload (AVIF set for l-06 with `type=image/avif`), E2 route registry with `warm(key)` on pointerenter/focus (E8, nav and showcase cards), E4, E5 metric fallback faces in `src/fonts.css`, E6 AVIF for l-01, l-06 (+w768, w1024), l-07, l-09, E7 leaf imports from `@baret/ui/primitives/*` on the home path. Measured on the production build after integration (`measure.mjs`, 4x CPU, 150 ms RTT, 1.6 Mbps): LCP 3.11 s at 1440 and 3.07 s at 390 (was 3.3 s; earlier pass 3.69 s), FCP about 0.79 s, CLS 0 / 0.0002, about 520-545 KB transferred; LCP is the l-06 AVIF, which waits on the JS and render path (target 1.6 s). Critical JS on `/` is the entry (86.6 kB gz) plus the React vendor chunk (98.7 kB gz), about 185 kB gz against the 150 kB target; no sonner, tailwind-merge or Radix code is in either. Build: HomePage is now in the entry chunk (`index-*.js` 262.1 / 86.6 kB gzip, was HomePage 136.8 / 45.8 kB gzip plus the entry) because `router.tsx` imports it statically; Vite warns `INEFFECTIVE_DYNAMIC_IMPORT`.
- Open: E5 needs `"Instrument Sans Fallback"` and `"JetBrains Mono Fallback"` added right after their families in `--font-sans` / `--font-mono` in `packages/ui/src/tokens.css`. The canonical and `og:*` tags in the live SPA are not marked `data-static-head`, but since 2026-10-04 every known route has its own generated file, so only an unknown path (noindex) carries the canonical of `/`. `RootLayout` still imports `Mark` from the `@baret/ui` barrel (no `./brand/*` export yet). D3 "Not audited yet" is on the trust line (2026-10-04).
- Site URL: the build takes `BARET_SITE_URL=https://<domain>`, and on Vercel falls back to the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`). Without either there is no `sitemap.xml`, no canonical or `og:url`, and `og:image` stays relative. Only a Vercel production build or `BARET_REQUIRE_SITE_URL=1` fails on it; the GitHub Actions build, which only proves the apps compile, warns.
- SEO/head routing: trailing-slash URLs (`/agents/`) are normalised in `RootLayout.headFor`. Unknown URLs render `robots noindex` (a soft 404 on a static host). The static `og:*` / `twitter:*` tags exist for bots only and are removed from the live DOM in `main.tsx`; per-route og tags are not rendered client-side.
- Hosting (for deploy): serve `dist/<route>/index.html` before the SPA fallback, give `/fonts` and `/assets` `Cache-Control: immutable`, set `BARET_SITE_URL` at build time. Since 2026-10-04 the build also writes a file for every demo site and `/kit` (noindex) and a `dist/404.html`, so a host can drop the catch-all rewrite and answer unknown paths with a real 404 (FOR_EZGIN).

Follow-ups for the landing:
- Superseded by the pass above (2026-10-01), landing bundle: the HomePage chunk is 182.7 / 59.1 kB gzip (was 152.9 / 49.3 before the signature layer); about 45 kB of it is Motion's layout-projection and drag code the page never uses. `LandingMotion` now wraps the page in `LazyMotion features={domAnimation}`, and `Reveal` and the marquee `Row` render `m.*`. The saving lands only when no landing file renders `motion.*`: Hero, FrameLayer, Parallax, LinePlate and TextReveal still do. A build with all of them on `m.*` measured 136.5 / 45.7 kB gzip. Track the rest against the perf plan (AVIF, font preload, CSS-only H1 reveal) toward the 1.6 s throttled-mobile LCP target. Done: after "Skip the intro" the hero H1 takes focus without the orange ring (it is a scripted landing point, not a control).
- Open (2026-10-01), signature layer: Done (2026-10-02): l-14 (night watchtower) now has `-w480` / `-w768` copies and `IMG.l14` carries a `srcSet`; `IMG.l12` adds a `-w1024` width. `node apps/showcase/scripts/encode-avif.mjs webp` regenerates the pillar WebP widths. The pillars block is 1067 px tall at 1440 (target under ~1000); `pad="compact"` would fix it. The bento tile images could take the shared `Parallax` (the hover scale would move to its wrapper). Done (2026-10-01): the hero's left scrim gradient is gone; one flat 35 % graphite veil sits over the photo from 1024 px. The hero H1 reveal triggers when its top passes 65 % of the viewport, and the WebGL chunk loads only within one viewport of the hero. Open: `l-01` exists only at 1536x768, so the 1920 hero is soft; regenerate or upscale it to 2560-3072 px and add w-variants plus a `srcSet` on `IMG.l01` (the WebGL layer uploads the img's `currentSrc`, so it improves with it).
- Open, copy owner: `home.content.ts` still marks `pillars.items[].label`, `items[].points` and `stats` as "Not rendered on the landing since 2026-10-01"; the bento renders all of them again, so those comments are stale.
- Superseded (2026-10-01) by G1 in the improvement pass above: `index.html` carries no `<title>` and no meta description. `RootLayout` renders exactly one of each per route: the title from the route registry, the description from `home.meta.description` on `/` and `common.brand.description` elsewhere. This removes the old duplicate tags with stale copy, but link previews and crawlers that do not run JS now see neither. Restoring a static fallback, plus `og:` and `twitter:` tags, is an SEO call.
- Resolved (2026-10-04): the brand and footer tagline now read "Check it first. Then sign.", like the hero H1, from one constant in `common.content.ts`.
- Fonts (2026-10-01): Big Shoulders Display is preloaded (one variable woff2 for 700 to 900) and loads with `display=optional`, so the opener lines never re-wrap on a late swap. The other families stay on `display=swap`. Open: a metric-matched `Big Shoulders Fallback` face in `packages/ui/src/tokens.css` for the first visit when the font misses the optional window.
- Library defects worked around locally, still open in `packages/ui`: the Tabs and Accordion default classes, the Separator, and the brand Tag's left edge on dark grounds. Fixed (2026-10-04): the Button's focus ring (the chamfer is painted on a pseudo-element, so the outline is no longer clipped).
- Tag text in the light theme uses the `--safe-ink`, `--caution-ink`, `--blocked-ink`, `--watching-ink` and `--network-ink` tokens (AA on the manila paper). The dark theme is unchanged.

**Motion.** Nothing on the landing runs on its own. Wheel scrolling is smoothed by Lenis (`packages/web-ui/src/components/SmoothScroll.tsx`, `lerp` 0.1, native window scroll kept, touch untouched); the signature layer (parallax, text reveal, eyelet cursor, WebGL hero, bento) is specified in BRAND §08. `LandingMotion` gives every motion element the BRAND ease-out and honours `prefers-reduced-motion`. With reduced motion on: the opener is one finished screen (the first frame with its three lines as one paragraph), the checks are a static list (one per line on phone, wrapped from 768 px), every reveal is static, Lenis and the custom cursor are not mounted, headings are plain text, photos do not drift and the WebGL hero never starts (the photo shows).

The sections below describe what each block says and does. Where they differ from the shipped copy, `home.content.ts` wins.

### 1.1 Opener (3 frames, scroll-stepped)
A pinned graphite stage that tells the product in three lines, one per scroll step of about 30svh: the problem, the act, the result (`home.opener.lines`, three entries). Frames and lines swap on the step and crossfade on time; nothing is scrubbed. Frames: the Confirm button (`l-06`), the inspector's desk (`l-07`), the three verdict tags (`l-09`, contained so all three tags stay in view). The last frame hands straight to the hero photo with no spacer. `home.opener.skip` lets the reader jump past it.

### 1.2 Hero
One photo, one copy column, one action row. No plate, no card, no badges. The night skyline (`l-01`) fills the section from 1024 px and the copy sits on its empty sky in columns 1 to 6; below 1024 px the photo is a band on top and the copy follows on graphite. Copy: `hero.status`, the H1 `hero.title` (one line per sentence), `hero.body`, and two actions (`hero.actions.primary`, `hero.actions.secondary`). `hero.badges`, `hero.previewLabel` and `hero.mockCaption` are kept in content but not rendered.

### 1.3 Checks (marquee)
`marquee.label` as a plain H2, then rows of the check names (`marquee.items`, each mapped to a finding code from `ARCHITECTURE.md` §6). The rows are scroll-linked, never self-running: every row drifts sideways at one constant ratio of the scroll, **0.1** sideways px per scrolled px (`RATIO` in `landing/sections/marquee/Row.tsx`), the same at every width, so the checks stay readable while they move. A single pass no longer shows every check; the screen-reader list and the reduced-motion list carry all of them. In motion mode a `<details>` under the rows (`marquee.allChecks` as its summary, `marquee.allChecksList` as the list's label) opens the full list (H4); a test keeps the number in the summary equal to `items.length`.

### 1.4 How it works
`pillars.title` (H2) and `pillars.body` in a split header, then one row of three equal columns, one per product layer: Pre-sign Guard, Authorization Ledger, Post-sign Monitor (`pillars.items[i].title` and `.body`). The bodies carry the sponsor names (Alchemy, Nansen, Chainlink CRE, Envio). No labels, points, icons, numbers or links; `pillars.eyebrow`, `items[].label` and `items[].points` are not rendered.

### 1.5 Six dApps
`showcase.title` and `showcase.body` in a split header, then the six fake sites as one list: rows split by 1 px rules on phone, a 2-column grid from 768 px and 3 columns from 1024 px. Each site is one whole-card link with its expected verdict tag (`showcase.labels.verdict` is the screen-reader label). `showcase.notice` follows. There is one responsive list in the DOM (no duplicate phone list). Since the improvement pass (C1/C4) each card in the card layout (from 1024 px) ends in a visible `showcase.labels.open` cue ("Open the site" with an arrow), and each phone row ends in the arrow alone, and `showcase.action` is rendered again as one ghost button beside the notice. Measured block height: about 990 px at 1440 and 1210 px at 390.

### 1.6 Verdicts
`caution.title` and `caution.body`, then Safe, Caution and Blocked as three equal columns, each a Tag (in an h3) and its body (`caution.examples[].body`) under the same single top rule as the Pillars items. The "If signed" impact lines (`caution.labels.impact`, `caution.examples[].impact`) are not rendered. Fail-closed shows as one small caption under the columns (`caution.honesty.title`, "The fourth verdict: Can't reach Baret"). The block uses the frame's compact padding (`pad="compact"`) to stay near 520 px tall at 1440. Between the header and the columns sits one sample verdict check (H1, `verdicts/VerdictCheck.tsx`): pick a sample transaction with a segmented control and turn the sample rule on or off (H2, a checkbox with `role="switch"`); the matching column is marked and one persistent `role="status"` region announces the result. Everything is labelled sample data, has no timers, and all three verdict bodies stay in the DOM. `caution.eyebrow`, `caution.honesty.body` and `common.verdicts.unreachable` are not rendered.

### 1.7 Agents
The x402 claim on the left (`agents.title`, `agents.body`), the three controls Baret adds (the budget, the leash, the kill switch: `agents.gaps[i].control` and `.answer`) as plain rows on the right, and under the heading one action (`agents.action`) with the Dynamic and PaymentGuard line (`agents.note`). The H2 breaks only between sentences (`keepBeats`, C2). Under the budget control, four daily-cap presets (H3, `agents/CapPresets.tsx`) show which sample payments a cap lets through, announced through one status region. `agents.eyebrow`, `agents.labels`, the gap titles and gap lines, `agents.track` and `agents.kicker` are not rendered.

### 1.8 Closing
One centred column on graphite in both themes, mirroring the hero: `cta.title` (the page's second and last stencil title), `cta.body`, the two actions (`cta.actions.primary` is the page's last filled button, phone labels from `labelPhone`) and the facts row `cta.facts` (each fact links only when it has an `href`; `cta.note` is kept in content but no longer rendered, D3). Then the footer.

### No longer on the landing
The stats strip (`home.stats`), the comparison (`home.comparison`), the privacy section (`home.privacy`) and the FAQ (`home.faq`) were removed from `/` on 2026-10-01. Their copy stays in `home.content.ts`, marked as not rendered, for reuse on other pages.

---

## 2. Showcase Hub Page

**Purpose:** "The proving ground." Six fake-but-real dApps, each wired to a different attack pattern.

| Surface | Status | Where |
|---|---|---|
| Shared layer on every route | **Done** (2026-10-02, moved 2026-10-03): `RootLayout` mounts `LandingMotion`, Lenis and the eyelet cursor once for every page, so the demo sites get the landing's fonts, motion and cursor. Since 2026-10-03 the layer lives in `packages/web-ui` (`@baret/web-ui`, D-019), shared with the wallet: the type scale (`lib/type`), the frame (`lib/layout`), motion tokens, `Reveal`, `TextReveal`, `Parallax`, `SmoothScroll`, the cursor and `Signature`, `Img`, `LinkButton`, a generic `Section` and `SectionHeader`, the verdict blocks of the Baret panel (`components/CheckBlocks`, `lib/check`), and the self-hosted fonts (served at `/fonts` by its `webUiFonts()` Vite plugin). The showcase keeps only the landing's own pieces in `src/shared` (asset registry, anchors, the WebGL hero). Proof the move changed nothing: document height of `/` at 1440 and 390 is the same before and after (7495 / 9824 px light), `/novaswap` screenshots are pixel-identical, and the entry chunk grew by 0.6 kB raw. | `packages/web-ui/`, `apps/showcase/src/layouts/RootLayout.tsx`, `apps/showcase/src/shared/` |
| Disclosure groups | **Rule** (2026-10-02): every list of `<details>` (FAQ, troubleshooting) is one group with a shared `name`, so opening an item closes the others. Done on NovaSwap, Agents and Install; use it on every future list. | `name="..."` on each `<details>` |
| Six dApp palettes | **Done** (2026-10-02): each site changes only its palette. `DappTheme` sets `data-dapp="<slug>"` on its wrapper and on `<html>`, and `dapp-themes.css` re-declares the ground, surface, text, rule and accent tokens for light, OS-dark and explicit dark. State colours (safe, caution, blocked) are never re-themed. Anything inside `data-scope="baret"` (the demo strip, Baret's panel, the "Demo site" bar) keeps Baret's palette, as the real extension would. `themes.test.ts` checks every block. **Audit (2026-10-04):** light `--fg-faint` is 0.66 alpha in all six palettes (4.87:1 to 5.81:1 on ground and surface); a new `--accent-mark` draws thin marks at 3:1 or more where a pale accent fails (OrbitYield light `#5d7500`, Scrybe light `#6e6200`; the other palettes use their own accent); `themes.test.ts` checks both. The browser theme colour follows each palette in light and dark. | `apps/showcase/src/sites/theme/` |
| Demo kit | **Done** (2026-10-03), frontend only, ready for the live API: the Baret strip (honest/attack switch), the "suspicious swap" switch (`AttackSwitch`, a native `role="switch"` in the dApp's card, bound to the same state as the strip), and the Baret panel (a right-hand sheet that walks the four analysis phases at 160 ms each, then shows the result). One seam per site: a `CheckSource` resolves a `CheckResult` (sample, live or failed). `runCheck` is fail-closed: a rejection, an answer off the `/v1/analyze` contract, a non-2xx status or no answer within 15 s all become Blocked with "The check did not finish". `kit/live.ts` posts to `/api/v1/analyze` (Vite proxy in dev, Vercel rewrite in prod), validates with `analyzeResponseSchema` (loaded only for live checks) and keeps the visitor's own balance changes and allowances. Live results show Baret's verdict, a match/mismatch line against the expected one, then the same blocks. A finding's fix line is left out when one of its values is empty. The panel takes a site's own block after "What the site asks for" (`extra`) and after the lesson (`after`); `kit/amount.ts` and `kit/site/AmountField.tsx` hold the MON amount and the loss rule the staking and sale cards share. **Audit (2026-10-04):** the panel returns focus to its trigger and its results rise in; view links are real links with the current one marked and the change announced; Back and Forward restore the scroll; the demo switch passes AA and shows in forced colours; every control is 44 px; charts and meters fill once and their values are reachable by focus; amount errors are announced; the live mapping uses a BigInt formatter instead of viem. Each demo route has its own HTML file titled as a Baret scenario ("NovaSwap swap scenario · Baret"), noindex, that preloads the site's own chunks (NovaSwap LCP 3.55 s to 2.86 s, Scrybe 3.47 s to 2.77 s). The floating "Demo site" tag became a slim opaque Baret bar across the foot of the screen, the tag and "Back to the showcase", so it never sits on the site's content on a phone (K5); anything scrolled or tabbed to stops above it, and the panel opens over it. **Wallet connect (2026-10-06):** "Connect wallet" in every site's header opens a picker with the Baret wallet first (since M3 it opens the Baret wallet in its own window, below), then every wallet the browser announces over EIP-6963 (one that announces Baret's name `app.vercel.baret-metropolis` among them), then the sample wallet. The engine is @wagmi/core 3 on viem (`kit/wallet/engine.ts`), loaded on the first hover, focus or press, or on idle when a wallet was connected before (silent reconnect); one config holds Monad testnet only, and "Switch to Monad testnet" adds the chain when the wallet lacks it. With a wallet connected, all six sites check the real request from that address (`@baret/demo` builders, Scrybe as an x402 payment under the visitor's cap), and value-carrying cards compare the amount with the wallet's real MON (read from the public RPC). Without one, the prepared samples, and nothing is fetched. `VITE_BARET_DEMO_FROM` stays as a developer stand-in. Nothing is signed or sent, except by a card's "Sign with your wallet" (below). **Sign path (2026-10-09, M1):** the engine can also send: `send(call)` refuses unless the connected account is the one the call was built for and the wallet is on Monad testnet, estimates gas on Monad testnet and sends a limit a tenth above the estimate (Monad charges the limit, not the gas used); `confirm(hash)` waits up to a minute for the receipt; `tokenBalance` reads an ERC-20 balance. `useSendFlow` runs a list of calls in order, each confirmed before the next is asked for (so an allowance exists before the call that spends it is estimated), optionally reading one token's balance before the first and after the last; a new run, a reset or an unmount drops the old one. `SignBlock` is the shared block under a card's main button: the button, the testnet and no-value note, each step with its status and an explorer link, the balance before and after, and every way a run stops (declined, a request already open, another network, no MON for the fee, another account, reverted, no receipt in time, failed), none of which reads as done. A press with no wallet opens the header's picker (`requestPicker`); another network offers the switch. Copy in `hub.frame.sign`. Checked end to end on a fork of Monad testnet with an injected EIP-6963 wallet (18 checks, axe clean on the card). **The Baret wallet window (2026-10-09, M3):** the picker's Baret row opens https://baret-wallet.vercel.app (`VITE_BARET_WALLET_URL`) in its own window named `baret-wallet` and talks to it over postMessage with the protocol in `@baret/wallet-core/window` (strict parsers both ways; the site accepts answers only from its own window and the wallet's origin). Connected, the header chip shows the Baret address and live checks simulate from it. `BaretCheck` sends a card's request to the wallet's /sign and shows the answer: refused with each finding worded from the site's copy, declined, signed with the explorer link, or the window closed or blocked; nothing counts as signed without a signed answer. | `apps/showcase/src/sites/kit/`, `apps/showcase/src/layouts/RootLayout.tsx` |
| `/novaswap` | **Built** (2026-10-03), frontend ready, wallet connect open: cobalt on steel, on the real testnet contracts from `@baret/demo` (D-018). Honest: the card buys dUSDC with MON (`swapMonForUsdc` on the router), expected Safe. Attack (the strip or the switch at the bottom of the card): the card sells dUSDC and its button "Enable dUSDC trading" asks for `approve(look-alike, unlimited)`, expected Blocked by `ERC20_APPROVAL_UNLIMITED` + `KNOWN_MALICIOUS_ADDRESS`. Each version starts from its own amount (2.5 MON, under half the sample balance; 20 dUSDC). Header with a fake connect and a working nav (Swap, Pools, Stats, Docs in `?view=`; Docs shows the real router address), stats, two feature blocks with s-04, FAQ, footer. Answers: the prepared sample by default (never calls the API); live from `/v1/analyze` when `VITE_BARET_DEMO_FROM` holds a funded testnet address (`apps/showcase/.env.example`). Wallet connect replaced that variable with the connected address on 2026-10-06. **Sign path (2026-10-09, M1):** "Sign with your wallet" under the main button sends the same request the panel checks to the connected wallet, with no check: honest, the swap; attack, the "enable trading" approval and then the look-alike's "swap", which takes the whole balance to the sink. In the attack the card reads the wallet's dUSDC and offers "Get 100 test dUSDC" (the token's faucet) first. After each transaction its hash links to the explorer; after the last, the dUSDC balance before and after (the attack: 100 before, 0 after) with what happened and that the allowance stays open. The calls come from `@baret/demo` through `source.ts` (`signCalls`, `faucetCall`), the same builders as the check. Copy in `novaswap.sign`. **The two paths as one story (2026-10-09, M2):** a line above the second button says the site's button goes through Baret's check first; once the attack was signed with no check, Baret's panel for the same request shows "When you signed it with no check" with the dUSDC before and after, in place of "If this were signed"; the panel's closing line on every site reads "Through Baret, this transaction was never sent, so nothing moved." The landing's six cards say Blocked for OrbitYield and LaunchPad (D-033). Headline and tagline keep "USDC" because display type is uppercase and would print "DUSDC". **Check with Baret (2026-10-09, M3):** under Sign with your wallet, the same request goes to the Baret wallet window: the attack comes back refused with the unlimited allowance and the blocklisted spender named and nothing signed; the honest swap is signed in the wallet and confirmed, with its hash. Checked end to end on a Monad testnet fork with a virtual passkey in the popup (38 checks). | `apps/showcase/src/sites/novaswap/`, `NovaSwapPage.tsx` |
| Hub `/showcase` | **Built** (2026-10-03), five blocks in the landing's grammar (owner-approved cut of seven): (1) split hero: `T.h1Page` stencil title, the lead, "See the six sites" (the page's orange) and "Install the extension", the four `hub.stats` as one hairline row, the simulation notice, and h-01 (six tags on a wire); (2) "Six sites, one trap each.": a radio filter (All six / Drainers / Trust traps / Silent agents) with its own picture per class (h-06, h-02, h-03, h-04) and sentence, a status line for the count (`hub.filters.status`), and the six scenario cards (the landing's picture per site, category, name, expected verdict, summary, "Watch for" rows, whole-card link that warms the site's chunk); (3) "Four steps, one sign request": a step picker that slides the four-panel strip h-05 one drawing at a time (460 ms, none under reduced motion), title and body per step, one status region; (4) "Same site, same button, two wallets.": a real table beside l-17 (two blank tags); (5) the closing band. Cut: the detector grid (the landing's checks marquee carries the nine detectors) and the ticker; the stats strip folds into the hero. Pure parts (`hub/hub.ts`: filter, status, strip crop) are tested. **Audit (2026-10-04):** the filter lives in `?filter=` (deep links, Back and Forward work); the hero numbers count up once; the hero picture loads at once with no fade; the route file preloads its own chunks (LCP 3.19 s to 2.74 s). | `apps/showcase/src/pages/HubPage.tsx`, `apps/showcase/src/hub/` |
| The other five sites, shared | **Built** (2026-10-03), frontend ready, prepared samples only. Each uses NovaSwap's frame in its own palette: Baret's strip, the site's header with a fake connect and a nav in `?view=`, the hero with the site's card, the stats, the site's hero picture beside its blocks (a portrait picture keeps a 2:3 frame), the FAQ, the footer, and Baret's panel with the safe and danger pictures. Secondary pages are typed `SiteView`s in each content file (`site.pages.views`), drawn by one renderer (`kit/site/Views.tsx`: table, chart, docs, list, faq, shares). No request builders exist yet for these five (task for Ezgin), so their panels say they are not connected and nothing is sent. The old `DemoSite` shell is gone. **Audit (2026-10-04):** `source.ts` is the one live switch for every site; NovaSwap's copy says dUSDC and the test tokens it trades; card inputs refuse exponents and hex before a live check; closing the panel aborts a check in flight. | `apps/showcase/src/sites/kit/site/` |
| `/scrybe` | **Built** (2026-10-03): highlighter on newsprint. The question box (a starting question, the price per answer, who is paid, "Pay and ask"). The agent loop (the strip or the card's switch) swaps the question for the visitor's hourly cap (0.15, 0.25 or 0.50 USDC) and "Start the agent". One answer: Safe, 0.05 USDC out. Loop: each payment that fits is paid; the one that would cross the cap is stopped, expected "Blocked at the cap" by `X402_HOURLY_CAP_EXCEEDED`. The panel lists the run (`analysis.run`) and ends with the way to /agents (`scrybe.cta`). Pricing, API and Usage pages. Amounts are counted in base units. | `apps/showcase/src/sites/scrybe/`, `ScrybePage.tsx` |
| `/pixeldrop` | **Built** (2026-10-03): fluorescent ink on card stock. The mint box (quantity 1 to 10, price, per-wallet limit, a bar for the minted share). Honest: Safe, the price out and the pieces in; with more than one piece the panel uses `analysis.modes.safe.many`. Attack: `setApprovalForAll(operator, true)`, Blocked by `NFT_OPERATOR_GRANTED` + `KNOWN_MALICIOUS_ADDRESS`, the grant shown as an unlimited allowance. Collection, Roadmap and Team pages. | `apps/showcase/src/sites/pixeldrop/`, `PixelDropPage.tsx` |
| `/orbityield` | **Built** (2026-10-03): lime on observatory sage. The stake box (balance, Max, the oMON it promises one to one). Honest: Safe, MON out and oMON in. Attack: a second pool on no list keeps the MON and sends nothing: **Blocked** under Balanced at any size by `VALUE_KEPT_BY_UNKNOWN_CONTRACT`, next to `UNKNOWN_CONTRACT_EXPOSURE` (D-033, since 2026-10-09; it was Caution before). Above Balanced's loss limit (50 %, read from the policy template) the sample adds `ESTIMATED_LOSS_EXCEEDS_MAX`. Rewards, Stats and Security pages. | `apps/showcase/src/sites/orbityield/`, `OrbitYieldPage.tsx` |
| `/claimhub` | **Built** (2026-10-03): ink stamp on kraft. Two steps: the eligibility check (the address typed, or the connected wallet when left empty; every wallet is eligible, which is the page's own theatre), then the allocation rows, announced once, and "Claim 2,410 HUB". Honest: Safe, HUB in. Attack: `approve(spender, unlimited)` on USDC, Blocked by `ERC20_APPROVAL_UNLIMITED` + `KNOWN_MALICIOUS_ADDRESS`. Eligibility, Distribution and FAQ pages. Known: the danger picture s-15 carries a green tag where orange was meant. | `apps/showcase/src/sites/claimhub/`, `ClaimHubPage.tsx` |
| `/launchpad` | **Built** (2026-10-03): plum. The contribution box (the LNTL the amount buys, 0.01 to 1 MON with a message for each limit, a bar for the raised share). Honest: Safe, MON out and LNTL in. Attack: a proxy whose code its deployer can replace; LNTL still arrives; **Blocked** under Balanced by `DELEGATECALL_DETECTED` (Balanced blocks borrowed code since 2026-10-09, D-033), shown with `UNKNOWN_CONTRACT_EXPOSURE`. Tokenomics (one bar of four shares), Vesting and Team pages. | `apps/showcase/src/sites/launchpad/`, `LaunchPadPage.tsx` |

### 2.1 Hero
Headline: **"Six dApps. Six threats. One signature you never made."** Description: "Every site below looks production-ready and behaves like the real thing. Connect a wallet, press a button, and watch Baret catch the attack in plain language — before your keys ever sign." CTAs: "See the scenarios", "Install the wallet", "Read the Docs". A live "ticker" line rotates through different threat types in turn: "wallet drainers", "unlimited approvals", "rug-pull patterns", "silent agent drift", "look-alike assets", "hidden contract calls".

### 2.2 Stats Strip
_Since 2026-10-03 one hairline row inside the hero, not a strip of its own._

"6" simulated sites · "3" kinds of threat · "9" detectors · "25" rules. The exact wording lives in `packages/content/src/showcase/hub.content.ts`.

### 2.3 Scenario Cards (filterable: All / Drainers / Trust traps / Silent agents)

Each card: name, category tag, tagline, description, "Watch for" list (3 items), threat class tag, a one-line "why it matters", verdict (Blocked/Caution/Capped).

#### 01 — SCRYBE (x402, flagship)
- **Tagline:** Pay-per-question oracle
- **Description:** An AI Q&A service that charges $0.001 USDC per answer over x402. A real 402 challenge, a real on-chain settlement, and a wallet that puts a ceiling on what the agent can spend.
- **Watch for:** Per-merchant rolling spend cap · Facilitator allowlist enforcement · Asset allowlist for the payment leg
- **Threat class:** Silent agent · Drift risk
- **Why it matters:** Agent payments repeat by design, so a small leak compounds with every request.
- **Verdict:** Capped

#### 02 — NOVASWAP (DeFi)
- **Tagline:** Swap MON for USDC in one step
- **Description:** A clean swap page on real testnet contracts. In the attack version, "enable trading" is an unlimited dUSDC allowance to a look-alike router that can empty your balance (D-018).
- **Watch for:** An unlimited allowance the swap does not need · A spender one character off the real router · A spender on the reported list
- **Threat class:** Drainer · Address poisoning
- **Why it matters:** The approval moves nothing, so the page looks fine. The drain comes later, through the allowance.
- **Verdict:** Blocked

#### 03 — PIXELDROP (NFT)
- **Tagline:** Generative NFT mint
- **Description:** A "Night Shift" mint page. Behind the artwork sits a hidden authorization change that empties every asset in your wallet.
- **Watch for:** An operator authorization (`setApprovalForAll`) change you never asked for · Wallet-drainer pattern signature · Transfers of assets unrelated to the mint
- **Threat class:** Wallet drainer · Authorization theft
- **Why it matters:** Mint pages make a good drainer disguise because buyers expect to sign fast.
- **Verdict:** Blocked

#### 04 — ORBITYIELD (Staking)
- **Tagline:** Liquid staking at 14.2% APY
- **Description:** A staking page that pays a receipt token for every MON you stake. In the attack version, the deposit goes to a pool nobody vouches for, and no receipt comes back.
- **Watch for:** A pool contract Baret does not know · MON leaving with no receipt token arriving · A deposit above the loss limit in your rules
- **Threat class:** Trust trap
- **Why it matters:** The page shows nothing wrong. The missing receipt is the only sign, and it shows in the balance change, not on the page.
- **Verdict:** Blocked (D-033, since 2026-10-09; Caution before)

#### 05 — CLAIMHUB (Airdrop)
- **Tagline:** Ecosystem airdrop claim
- **Description:** Looks like every airdrop site you have ever used. The "eligibility check" actually signs an unlimited approval on your stablecoins.
- **Watch for:** Unlimited approval to a spender wallet · Domain not verified by the allowlist · A claim operation hiding a transfer
- **Threat class:** Phishing · Unlimited approval
- **Why it matters:** Approval drainers are the most common wallet attack anywhere signatures are blind.
- **Verdict:** Blocked

#### 06 — LAUNCHPAD (Launch)
- **Tagline:** Reviewed launches on Monad
- **Description:** A polished token sale with a countdown and a tokenomics chart. In the attack version, your tokens still arrive, but the sale runs code its deployer can replace after you pay.
- **Watch for:** A sale that runs code borrowed from another contract · A sale contract Baret does not know · A contribution above the loss limit in your rules
- **Threat class:** Trust trap
- **Why it matters:** Nothing goes wrong on the day you buy. The risk is what the deployer can change after the sale closes.
- **Verdict:** Blocked (D-033, since 2026-10-09; Caution before)

### 2.4 "How It Works" (four steps, interactive)
1. **Connect a wallet** — Pick Baret or any EIP-6963 wallet from the picker.
2. **Trigger an action** — Press Swap, Mint, Stake, Claim or Buy. The site builds the transaction.
3. **Baret inspects** — Server-side simulation + nine detectors + your local policy run on the unsigned tx.
4. **Verdict** — Safe / Caution / Blocked, every finding in plain language. You sign with your eyes open, or you reject.

### 2.5 Detector Grid ("Under the hood")
_Cut from the page on 2026-10-03 (owner-approved simplification); the copy stays in `hub.content.ts`, marked not rendered. The landing's checks marquee names every check._

Headline: "Nine detectors run on every signature." Description: "Every scenario trips a different subset. The popup only shows you the findings that matter. Each one explains in a single sentence why the transaction is suspicious." Three featured cards: Pre-sign Guard (server simulation + detectors), Authorization Ledger (every grant is a row with cap+expiry+progress bar), Post-sign Monitor (WebSocket subscribe, alert on anything you never signed). Alongside, a list/grid of detector labels (see the §1.3 marquee list).

### 2.6 Comparison and final CTA
Before the CTA, "Same request, with and without a check." (`hub.comparison`, M2, 2026-10-09): the NovaSwap story in the lead (Sign with your wallet sends the attack straight to your wallet, the site's button sends it through Baret's check, which stops it; "No wallet is singled out here."), then a table of what a wallet with no pre-sign check shows against what Baret's check shows, five rows with the NovaSwap attack first, and "Try both on NovaSwap" under it.

Headline: "Pick a card. Watch the firewall fire." Description: "No slides, no mockups. Every scenario above runs a real transaction against a real analysis server and shows the verdict before signing."

---

## 3. Agents Page

| Surface | Status | Where |
|---|---|---|
| Agents `/agents` | **Built** (2026-10-03), six blocks (owner-approved cut of thirteen): (1) the night hero: a-01 (robot carts with tags) under a flat 35 % graphite veil from 1024 px, a band on top below it; the `T.h1Page` stencil claim, the lead, "Read the quickstart" (the page's orange) and "Try the playground", the install line with a copy button; (2) the three layers (the check a-05, the guarded signer a-02, the vault a-04), each a drawing, a paragraph and its points on hairlines, the revoke and fail-closed lines folded into the points and the note; (3) the quickstart: the three steps beside a-03 (a hand picking a tag), the code for TypeScript, any language and agent frameworks behind one radio group, each with a copy button and the secrets note; (4) the playground: the policy picker (Strict, Balanced, Permissive as radio cards) inside it, the six prepared actions or a pasted transaction, the agent address with a random one, a terminal that prints the exchange, the verdict tag, every finding in Baret's own words and what would change; the answer column stays in view from 1024 px; (5) fair questions, one exclusive group beside its title; (6) the closing band with a-06. One policy choice drives both the code samples (`policy: "..."`, `--policy ...`) and the playground's answers. Verdicts come from the engine's rule (D-014) applied to each action's findings and the template, not from a table (`agents/playground/sample.ts`, tested for all eighteen pairs). Nothing is sent by default: the six actions answer from prepared samples, a pasted transaction gets the fail-closed answer. With `VITE_BARET_PLAYGROUND=live` (`apps/showcase/.env.example`) a pasted transaction goes to `/v1/analyze` through the same seam (`agents/playground/source.ts`), with the picked template as full rules and the body checked against `analyzeRequestSchema` before it is sent; the six actions stay on samples until `@baret/demo` builds their requests (task for Ezgin). Cut, kept in content and marked not rendered: the problem block, the control model, the layer chooser, the separate fail-closed and revoke blocks, the layer flow line, the quickstart's levels, decision-only and raw request parts, the picker's intro, the playground's policy field, raw toggle, "Wire this into your own agent" link and its rate-limit and unreachable errors (a failed live check shows the unreachable answer), and every eyebrow. **Audit (2026-10-04):** the kit, the CLI and the MCP samples are labelled "Planned. Not published yet" with no copy button, and a new HTTP API tab shows the `/v1/analyze` call that works today; a pasted transaction without the live flag reads "Not checked" (still Blocked); "1 finding" reads right; the hero picture is preloaded at high priority (LCP 5.44 s to 2.95 s). | `apps/showcase/src/pages/AgentsPage.tsx`, `apps/showcase/src/agents/` |

**Purpose:** Show that Baret is not just a wallet — it also exists as an **NPM package + CLI** that agent/bot wallets can use. The same firewall that protects the wallet is offered to agent developers as an SDK and a CLI.

### 3.1 Hero
Headline: **"Your agent signs. Baret checks first."** Description: "The same pre-sign firewall that protects your wallet, now an SDK and CLI for agents and bot wallets. Baret simulates and policy-checks every transaction your agent builds **before** the key touches it. Drains, unlimited approvals and rogue contracts don't get signed, they get blocked."

### 3.2 How It Works (three steps)
1. **Install** — Add `@baret/agent-kit` to your agent, or use the `baret` CLI from any language.
2. **Configure a policy** — Pick Strict, Balanced or Permissive. These are the firewall rules your agent has to follow.
3. **Wrap your signer** — Call `guardedSubmit()` (or pipe the raw tx into `baret submit -`). Safe → signed and submitted. Unsafe → blocked.

### 3.3 Quickstart (code samples — as content; the real package names stay in sync with `ARCHITECTURE.md`)

**Install:** `pnpm add @baret/agent-kit`

**SDK (TypeScript/Node) sample content:**
```
import { AgentWallet } from "@baret/agent-kit";

// The secret is read from BARET_AGENT_SECRET; never hard-coded.
const agent = AgentWallet.fromSecret(process.env.BARET_AGENT_SECRET!, {
  serverUrl: "http://localhost:8080",
  network: "testnet",
  policy: "balanced",
});

const { hash, explorerUrl } = await agent.guardedSubmit(txRequest);
//  ↳ throws GuardBlockedError if the policy blocks. The key never signs.
```

**CLI (from any language) sample content:**
```
baret init --server http://localhost:8080 --network testnet --policy balanced
export BARET_AGENT_SECRET=0x...agent-private-key
echo "$TX_JSON" | baret submit -      # exit 0 submitted · 1 blocked · 2 error
```

A note alongside: **"Fail-closed by design."** If the Baret server is unreachable, `evaluate` throws and signing never happens. Your agent stops instead of signing blind.

### 3.4 Policy Picker
Three template cards (Strict / Balanced / Permissive), each with a short description and a selection state that, when chosen, updates the code samples/playground below it.

### 3.5 Live Playground
Headline: "Live playground." Description: "Runs the real `/v1/analyze` pipeline with the policy you selected. Paste an unsigned transaction (raw hex or a `{from,to,value,data}` request) and see the verdict your agent would get."

**Input fields:** Agent address (0x…, with a "generate random" button), Network picker (testnet/mainnet), Policy (comes from the picker, read-only display), Transaction input (raw hex or JSON tx-request, textarea).

**Button:** "Analyze as agent" → returns the real analysis result.

**Result panel:** ALLOW/ADVISORY/BLOCK label + reasons, risk findings (code + severity + message), estimated MON/token balance movements.

Note text: "This playground talks to Baret's rate-limited, testnet-only hosted demo server — no setup required. Want to point it at your own server? Spin one up with `pnpm dev:server` and change the SDK's `serverUrl`."

Footnote: "A per-agent audit monitor requires authenticated server-side access, so it is not part of this public demo."

---

## 4. Docs Page

| Surface | Status | Where |
|---|---|---|
| Docs `/docs` | **Built** (2026-10-03), four blocks (owner-approved cut of five): (1) split hero with l-33 (a tower model on a drafting table) and, under it, the two timelines (a standard wallet against Baret, Baret's two added steps in ink); (2) the eleven files in four anchored groups (`#start-here`, `#what-you-see`, `#contracts-and-payments`, `#plan-and-decisions`), each card a whole-card link to its file on GitHub with its d-02 line drawing (`DOCS_CARD_ART`, keyed by file); (3) known limitations beside l-18 (one tag fallen from the wire); (4) the closing band with d-04 (the site office at night). Cut: "The short version" pipeline (`docs.summary`, kept in content, marked not rendered). The URL builder and the group slugs are tested. **Audit (2026-10-04):** the hero picture was lazy, above the fold and the 1254 px original on phones, and painted long after the text; it now loads at high priority with an accurate `sizes` and a preload and paints with the text at 3.1 s, and the cards ask for the copy their column needs. | `apps/showcase/src/pages/DocsPage.tsx`, `apps/showcase/src/docs/` |

**Purpose:** Access to every document describing how Baret works from a single index. Each card points to a real file in this project's `docs/` tree (GitHub link).

### 4.1 Hero
Headline: "How Baret works, in detail." Description: "The specs, protocols and design notes behind every claim on the home page. Every entry below corresponds to a file in the project's `docs/` tree."

### 4.2 Document Cards

The real files the Docs page points to for this project (must stay in sync with this doc set — whenever a new `docs/*.md` is added, this list is updated too):

| Card title | Description | Corresponding file |
|---|---|---|
| Vision | Why a transaction firewall belongs in the wallet, not in the dApp | `PROJECT_OVERVIEW.md` |
| Architecture | Server, risk detectors, policy engine, data flow | `ARCHITECTURE.md` |
| Wallet Spec | Wallet primitives, account layers, session model, every screen/flow | `WALLET.md` |
| Frontend Content | The content specification for every page of this site | `FRONTEND.md` (this file) |
| Contracts | PaymentGuard and ReputationRegistry contract specs | `CONTRACTS.md` |
| x402 Defense | The attack matrix for the x402 era and Baret's answer | `X402_FACILITATOR.md` |
| Resources | Which sponsor tool is used where and how | `RESOURCES.md` |
| Bounties & Track | Targeted bounties, track selection, priority order | `BOUNTIES_AND_TRACKS.md` |
| Roadmap | Weekly plan and progress tracking | `ROADMAP.md` |
| Decisions | Architecture/scope decisions taken and their rationale | `DECISIONS.md` |
| Brand | Brand identity, tone, design tokens | `BRAND.md` |

### 4.3 Known limitations and bottom CTA
The six `docs.limitations.items` sit in their own block before the CTA.

Headline: "Would you rather see it in action?" Description: "The Showcase exercises every layer of the wallet in your browser." CTA: "Open the Showcase".

---

## 5. Install Page

| Surface | Status | Where |
|---|---|---|
| Install `/install` | **Built** (2026-10-03), five blocks (owner-approved cut of nine): (1) the hero carries the download, so the main action is in the first viewport: the detected browser (`detectBrowser`, read on the client after the first render) picks the lead build; while no build is published, the hero says so and the primary action is "Build it from source" (`install.download.pending`), with the version, Manifest V3 and the minimum browser in mono; (2) "Load it in three steps.": a browser picker, then three steps with i-03, i-04, i-05 and the address to copy, the developer-mode note folded in (Firefox: the temporary add-on warning); (3) what Baret can and cannot do, three equal lists and the audit fact; (4) troubleshooting as one exclusive group beside i-06; (5) the closing band with i-02. Download URLs come from `VITE_BARET_EXTENSION_CHROMIUM_URL` / `VITE_BARET_EXTENSION_FIREFOX_URL` (https only; empty by default). Cut: "What happens next" and "What you get" (kept in content, marked not rendered). **Audit (2026-10-04):** until a download URL is set, step one is "Build it from source" and points at `apps/extension/SOURCE_BUILD.md`; nothing says "download it here" (LCP 6.12 s to 3.00 s with the hero preload). | `apps/showcase/src/pages/InstallPage.tsx`, `apps/showcase/src/install/` |

**Purpose:** Get the user to download the Baret wallet extension and install it in a few minutes.

### 5.1 Hero
Badge: "Install Baret." Headline: **"Install Baret in a few minutes."** Description: "A Monad wallet with a transaction firewall. It simulates every transaction, checks it against your policy, and puts a ceiling on what any agent can spend over x402 — before your keys sign. Until store listings arrive, it loads like a developer build." Browser-detection note: "We detected a Chromium-based browser (Chrome/Brave/Edge)." / "We detected Firefox." / "Pick the build that matches your browser."

### 5.2 Download Card
Primary download: "Baret for Chrome/Brave/Edge" or "Baret for Firefox" depending on the detected browser (ZIP archive, latest build, MV3 manifest note). Below it, a secondary link: "Also available: [the other browser build]".

### 5.3 Install Steps (three steps, vary by browser)

**Chrome/Brave/Edge:**
1. **Unzip** — Extract `baret-chrome.zip` and remember the folder.
2. **Open `chrome://extensions/`** — Paste it into the address bar, turn on "Developer mode" in the top right.
3. **"Load unpacked"** — Select the `baret-chrome` folder you extracted. Baret appears in the toolbar. Click it and create your wallet. Setup opens in a full tab: passphrase, secret backup, testnet funding. About three minutes.

**Firefox:**
1. **Unzip** — Same.
2. **Open `about:debugging#/runtime/this-firefox`**
3. **"Load Temporary Add-on…"** — Select the `manifest.json` in the folder you extracted. Note: Firefox clears temporary add-ons when the browser restarts; reload Baret after every restart.

### 5.4 Feature Grid ("Why this wallet")
_Cut from the page on 2026-10-03 (owner-approved simplification); kept in `install.content.ts`, marked not rendered._

- **Pre-sign simulation** — "Baret decodes and simulates every transaction before the popup asks you to sign."
- **x402 firewall** — "Baret caps HTTP 402 payments per hour/day and checks them against your allowlist."
- **On-chain revoke** — "Every site gets its own sub-key. Revoke it on-chain with a single tap."

### 5.5 Post-install CTA
_"What happens next" (`install.afterInstall`) is cut on 2026-10-03; the closing band keeps this CTA._

Headline: "Take a lap through the Showcase." Description: "Six fake-but-real dApps trigger six different attack patterns. Baret catches every one of them live. You see the analysis before you sign." CTAs: "Open the Showcase", "Read the Docs".

---

## 6. Utility pages

| Surface | Status | Where |
|---|---|---|
| Showcase 404 `/*` | **Built** (2026-10-03): split hero, "Nothing here.", one sentence, "Back to the start" and "Open the showcase", beside l-29 (a site door tagged out). Words in `common.notFound`. Marked noindex by `RootLayout`. **Audit (2026-10-04):** the build also writes `dist/404.html` (noindex) for a host that serves a real 404; unknown paths that still get `index.html` keep the prerendered landing hidden until the router shows this page. | `apps/showcase/src/pages/NotFoundPage.tsx` |
| Wallet 404 `/*` | **Built** (2026-10-03): the vector mark on a plate, one stencil line, one sentence, "Back to your wallet". The raster marks m-01 and m-10 are not used here: BRAND section 02 keeps the mark vector, and m-10's helmet departs from the mark's geometry. | `apps/wallet/src/pages/NotFoundPage.tsx` |
| Design kit `/kit` | **Updated** (2026-10-03), internal, out of the nav: adds the shared `@baret/web-ui` controls (Segment, RuleSwitch, CopyButton, Disclosures, LinkButton) and the brand and social pictures (m-01 to m-12, x-01 to x-10) with their ids, plus the brand clip v-01 with controls, never autoplaying. **Audit (2026-10-04):** no horizontal overflow at 320 px, named rule switches, and its own static file with noindex (runtime noindex too). | `apps/showcase/src/pages/KitPage.tsx`, `apps/showcase/src/kit/` |

## 7. Page–Doc Sync Rule

The content in this file must stay in sync with the real code: whenever a section is added to, removed from, or has its copy changed on a page, this file is updated first. The Docs page card list (§4.2) in particular must match the existing files of this doc set (`docs/*.md`) one to one — whenever a new document is added, both places (the card list + the real Docs page implementation) must be updated.
