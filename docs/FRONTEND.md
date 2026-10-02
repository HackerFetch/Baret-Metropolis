# Baret — Frontend Content Specification (Showcase / Marketing Site)

> **This file is about CONTENT only: what each page says, which sections it has, which text/messages/data are shown, and what the user can do.** Color, typography, spacing, animation, palette — none of that lives in this file and never will; those belong to `BRAND.md` and to the frontend team's own design decisions. A designer/developer reading this file should learn "what belongs on this page", not "how it should look".

Last updated: 2026-10-01 (landing simplified to 8 blocks) · Status: **Content specification, no design/implementation** · The final words live in `packages/content`; where this file and the content disagree, the content wins · Source: Baret-Stellar's `apps/showcase` codebase — content adapted to Monad/EVM. Per user instruction, the site names are **preserved verbatim**: SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD (see `DECISIONS.md` D-010).

This covers every page `apps/showcase` owns: **Home**, **Showcase hub + 6 sites**, **Agents**, **Docs**, **Install**.

---

## 1. Home / Landing Page

**Purpose:** Answer "what does this do and why does it matter" in 60 seconds for someone who has never heard of the product. A professional, unpretentious tone that speaks in numbers.

| Surface | Status | Where |
|---|---|---|
| Landing `/` | **Simplified + signature layer** (2026-10-01): owner-approved smooth scroll (Lenis), parallax, word-mask text reveals, an eyelet cursor, a WebGL2 hero layer and a bento grid for the pillars block, each off under reduced motion (BRAND §08). 8 blocks in scroll order (opener in 3 frames, hero, checks, how it works, six dApps, verdicts, agents, closing), down from 12. Every block uses one grammar: a heading, at most one short paragraph, one row or grid of equal items, no boxes around copy, no numbered tags. Every string comes from `home.content.ts`; keys that no longer render stay in that file under a `Not rendered on the landing since 2026-10-01.` comment. | `apps/showcase/src/pages/HomePage.tsx`, `apps/showcase/src/landing/` |

Landing improvement pass (2026-10-01, IMPROVE A-H on top of the signature layer, which is kept as it was):
- Done, interactive components (all sample data, keyboard and touch, complete static view under reduced motion): H1 verdict check in the Verdicts block with the H2 rule switch folded in (a real checkbox with `role="switch"`), H3 daily-cap presets in the Agents block, H4 "all 17 checks" `<details>` under the marquee (motion mode only; its open animation comes from `details::details-content` in `tokens.css`). Illustrative `<Verdict>`s pass `announce={false}`; one persistent `role="status"` region owns announcements (F8). C2: the Agents H2 breaks only between sentences (`keepBeats`). C3: Verdicts uses a subgrid. C4 partial (the row/card switch stays at `lg`), C5 skipped.
- Done, shell and type: B2 `text-wrap: pretty` is global (per-element classes removed), B3, B4 hero body via `splitLead` capped at 44ch, B7, H1 sized in `cqi` inside an `@container` copy column. F1 `scroll-padding-top: 72px` on `html` (per-section `scroll-mt` removed). A1/F2 press scale and listed-property transitions on LinkButton and ShowcaseCard. A3 160 ms view-transition crossfade on every internal `<Link>`. A5 `Reveal` sets `data-reveal` only once its IntersectionObserver is attached and `data-in` on entry; CSS hides only `[data-reveal]:not([data-in])`, reset under reduced motion and print. The landing surface enter follows BRAND §08 (460 ms / 14 px in `shared/reveal.css`), not IMPROVE A5's 160 ms / 6 px. D2 header action (`common.actions.openShowcase` from 768 px, the nav "Showcase" label on phones, `size="sm"` ghost LinkButton); no horizontal scroll at 320 px. D3 the closing note became linked `home.cta.facts` (`cta.note` is kept in content, not rendered). D4 phone labels via `labelPhone` keys. F3, F4 (`data-nav-item`, `aria-current="page"` from NavLink, forced-colors rules), F5.
- Done, SEO head (G1-G6): `index.html` gets title, description, canonical, `og:*`/`twitter:*`, `og:image:alt` from `home.meta` through the `baretHead` Vite plugin; `dist/<route>/index.html` is generated per route with its own head (`data-static-head` nodes are removed by `main.tsx` on boot); `og.png`, `robots.txt`, `llms.txt`, `site.webmanifest`, apple-touch icon. The canonical and sitemap appear, and `og:image` becomes absolute (it is a relative `/og.png` without it, which most link previews ignore), only when `BARET_SITE_URL` is set at build time; the domain is an owner decision. `envPrefix` was deliberately left unwidened (a `BARET_` prefix would expose every `BARET_*` variable to the client).
- Done, performance: E1 the hero image preload (AVIF set for l-06 with `type=image/avif`), E2 route registry with `warm(key)` on pointerenter/focus (E8, nav and showcase cards), E4, E5 metric fallback faces in `src/fonts.css`, E6 AVIF for l-01, l-06 (+w768, w1024), l-07, l-09, E7 leaf imports from `@baret/ui/primitives/*` on the home path. Measured on the production build after integration (`measure.mjs`, 4x CPU, 150 ms RTT, 1.6 Mbps): LCP 3.11 s at 1440 and 3.07 s at 390 (was 3.3 s; earlier pass 3.69 s), FCP about 0.79 s, CLS 0 / 0.0002, about 520-545 KB transferred; LCP is the l-06 AVIF, which waits on the JS and render path (target 1.6 s). Critical JS on `/` is the entry (86.6 kB gz) plus the React vendor chunk (98.7 kB gz), about 185 kB gz against the 150 kB target; no sonner, tailwind-merge or Radix code is in either. Build: HomePage is now in the entry chunk (`index-*.js` 262.1 / 86.6 kB gzip, was HomePage 136.8 / 45.8 kB gzip plus the entry) because `router.tsx` imports it statically; Vite warns `INEFFECTIVE_DYNAMIC_IMPORT`.
- Open: E5 needs `"Instrument Sans Fallback"` and `"JetBrains Mono Fallback"` added right after their families in `--font-sans` / `--font-mono` in `packages/ui/src/tokens.css`. The canonical and `og:*` tags in the live SPA are not marked `data-static-head`, so on a route with no generated file (for example `/kit`) a JS-rendering crawler sees canonical `/` once `BARET_SITE_URL` is set. `RootLayout` still imports `Mark` from the `@baret/ui` barrel (no `./brand/*` export yet). D3 "Not audited yet" waits on Ezgin (FOR_EZGIN).
- Site URL: the build takes `BARET_SITE_URL=https://<domain>`, and on Vercel falls back to the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`). Without either there is no `sitemap.xml`, no canonical or `og:url`, and `og:image` stays relative. Only a Vercel production build or `BARET_REQUIRE_SITE_URL=1` fails on it; the GitHub Actions build, which only proves the apps compile, warns.
- SEO/head routing: trailing-slash URLs (`/agents/`) are normalised in `RootLayout.headFor`. Unknown URLs render `robots noindex` (a soft 404 on a static host). The static `og:*` / `twitter:*` tags exist for bots only and are removed from the live DOM in `main.tsx`; per-route og tags are not rendered client-side.
- Hosting (for deploy): serve `dist/<route>/index.html` before the SPA fallback, give `/fonts` and `/assets` `Cache-Control: immutable`, set `BARET_SITE_URL` at build time.

Follow-ups for the landing:
- Superseded by the pass above (2026-10-01), landing bundle: the HomePage chunk is 182.7 / 59.1 kB gzip (was 152.9 / 49.3 before the signature layer); about 45 kB of it is Motion's layout-projection and drag code the page never uses. `LandingMotion` now wraps the page in `LazyMotion features={domAnimation}`, and `Reveal` and the marquee `Row` render `m.*`. The saving lands only when no landing file renders `motion.*`: Hero, FrameLayer, Parallax, LinePlate and TextReveal still do. A build with all of them on `m.*` measured 136.5 / 45.7 kB gzip. Track the rest against the perf plan (AVIF, font preload, CSS-only H1 reveal) toward the 1.6 s throttled-mobile LCP target. Done: after "Skip the intro" the hero H1 takes focus without the orange ring (it is a scripted landing point, not a control).
- Open (2026-10-01), signature layer: Done (2026-10-02): l-14 (night watchtower) now has `-w480` / `-w768` copies and `IMG.l14` carries a `srcSet`; `IMG.l12` adds a `-w1024` width. `node apps/showcase/scripts/encode-avif.mjs webp` regenerates the pillar WebP widths. The pillars block is 1067 px tall at 1440 (target under ~1000); `pad="compact"` would fix it. The bento tile images could take the shared `Parallax` (the hover scale would move to its wrapper). Done (2026-10-01): the hero's left scrim gradient is gone; one flat 35 % graphite veil sits over the photo from 1024 px. The hero H1 reveal triggers when its top passes 65 % of the viewport, and the WebGL chunk loads only within one viewport of the hero. Open: `l-01` exists only at 1536x768, so the 1920 hero is soft; regenerate or upscale it to 2560-3072 px and add w-variants plus a `srcSet` on `IMG.l01` (the WebGL layer uploads the img's `currentSrc`, so it improves with it).
- Open, copy owner: `home.content.ts` still marks `pillars.items[].label`, `items[].points` and `stats` as "Not rendered on the landing since 2026-10-01"; the bento renders all of them again, so those comments are stale.
- Superseded (2026-10-01) by G1 in the improvement pass above: `index.html` carries no `<title>` and no meta description. `RootLayout` renders exactly one of each per route: the title from the route registry, the description from `home.meta.description` on `/` and `common.brand.description` elsewhere. This removes the old duplicate tags with stale copy, but link previews and crawlers that do not run JS now see neither. Restoring a static fallback, plus `og:` and `twitter:` tags, is an SEO call.
- Open, copy owner: the hero H1 ("Check it first. Then sign.") and the footer tagline in `common.content.ts` ("Read first. Then sign.") are two versions of one line on the same page and read like a slip. Align the footer tagline with the hero line in a copy pass; nothing was changed in the simplification (owner decision: no headline or body copy changes).
- Fonts (2026-10-01): Big Shoulders Display is preloaded (one variable woff2 for 700 to 900) and loads with `display=optional`, so the opener lines never re-wrap on a late swap. The other families stay on `display=swap`. Open: a metric-matched `Big Shoulders Fallback` face in `packages/ui/src/tokens.css` for the first visit when the font misses the optional window.
- Library defects worked around locally, still open in `packages/ui`: the Button chamfer focus ring, the Tabs and Accordion default classes, the Separator, and the brand Tag's left edge on dark grounds.
- Tag text in the light theme uses the `--safe-ink`, `--caution-ink`, `--blocked-ink`, `--watching-ink` and `--network-ink` tokens (AA on the manila paper). The dark theme is unchanged.

**Motion.** Nothing on the landing runs on its own. Wheel scrolling is smoothed by Lenis (`shared/SmoothScroll.tsx`, `lerp` 0.1, native window scroll kept, touch untouched); the signature layer (parallax, text reveal, eyelet cursor, WebGL hero, bento) is specified in BRAND §08. `LandingMotion` gives every motion element the BRAND ease-out and honours `prefers-reduced-motion`. With reduced motion on: the opener is one finished screen (the first frame with its three lines as one paragraph), the checks are a static list (one per line on phone, wrapped from 768 px), every reveal is static, Lenis and the custom cursor are not mounted, headings are plain text, photos do not drift and the WebGL hero never starts (the photo shows).

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

### 2.1 Hero
Headline: **"Six dApps. Six threats. One signature you never made."** Description: "Every site below looks production-ready and behaves like the real thing. Connect a wallet, press a button, and watch Baret catch the attack in plain language — before your keys ever sign." CTAs: "See the scenarios", "Install the wallet", "Read the Docs". A live "ticker" line rotates through different threat types in turn: "wallet drainers", "unlimited approvals", "rug-pull patterns", "silent agent drift", "look-alike assets", "hidden contract calls".

### 2.2 Stats Strip
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
- **Tagline:** Token swap routed to an on-chain order book
- **Description:** A clean DEX aggregator clone. Flip on Danger mode and a hidden operation reroutes your output token to a fresh wallet.
- **Watch for:** Output transfer to an unknown wallet · Fee/gas abuse against the simulated baseline · Contract not verified by the reputation index
- **Threat class:** Fund drain · Unknown contract
- **Why it matters:** Output reroutes hide well because the swap itself still succeeds.
- **Verdict:** Blocked

#### 03 — PIXELDROP (NFT)
- **Tagline:** Generative NFT mint
- **Description:** A "Night Shift" mint page. Behind the artwork sits a hidden authorization change that empties every asset in your wallet.
- **Watch for:** An operator authorization (`setApprovalForAll`) change you never asked for · Wallet-drainer pattern signature · Transfers of assets unrelated to the mint
- **Threat class:** Wallet drainer · Authorization theft
- **Why it matters:** Mint pages make a good drainer disguise because buyers expect to sign fast.
- **Verdict:** Blocked

#### 04 — ORBITYIELD (Staking)
- **Tagline:** Liquid staking · 14% APY
- **Description:** A liquid-staking landing page. The pool really exists, but it is an anonymous fork with no on-chain unstake path. A one-way deposit.
- **Watch for:** Unverified pool contract · No discoverable unstake function · TVL inflated with self-deposits
- **Threat class:** Trust trap · No exit path
- **Why it matters:** A one-way deposit looks perfectly fine in the UI. The missing exit only shows up on-chain.
- **Verdict:** Caution

#### 05 — CLAIMHUB (Airdrop)
- **Tagline:** Ecosystem airdrop claim
- **Description:** Looks like every airdrop site you have ever used. The "eligibility check" actually signs an unlimited approval on your stablecoins.
- **Watch for:** Unlimited approval to a spender wallet · Domain not verified by the allowlist · A claim operation hiding a transfer
- **Threat class:** Phishing · Unlimited approval
- **Why it matters:** Approval drainers are the most common wallet attack anywhere signatures are blind.
- **Verdict:** Blocked

#### 06 — LAUNCHPAD (Launch)
- **Tagline:** Approved token IDO
- **Description:** A polished launchpad with a countdown and tokenomics. The simulation reveals that the deployer still holds the token admin key and the LP is not locked.
- **Watch for:** Deployer retains the token admin key · Liquidity pool not locked · Token can be frozen after launch
- **Threat class:** Rug pull · No LP lock
- **Why it matters:** A retained admin key lets the deployer mint or freeze long after launch day.
- **Verdict:** Caution

### 2.4 "How It Works" (four steps, interactive)
1. **Connect a wallet** — Pick Baret or any EIP-6963 wallet from the picker.
2. **Trigger an action** — Press Swap, Mint, Stake, Claim or Buy. The site builds the transaction.
3. **Baret inspects** — Server-side simulation + nine detectors + your local policy run on the unsigned tx.
4. **Verdict** — Safe / Caution / Blocked, every finding in plain language. You sign with your eyes open, or you reject.

### 2.5 Detector Grid ("Under the hood")
Headline: "Nine detectors run on every signature." Description: "Every scenario trips a different subset. The popup only shows you the findings that matter. Each one explains in a single sentence why the transaction is suspicious." Three featured cards: Pre-sign Guard (server simulation + detectors), Authorization Ledger (every grant is a row with cap+expiry+progress bar), Post-sign Monitor (WebSocket subscribe, alert on anything you never signed). Alongside, a list/grid of detector labels (see the §1.3 marquee list).

### 2.6 Final CTA
Headline: "Pick a card. Watch the firewall fire." Description: "No slides, no mockups. Every scenario above runs a real transaction against a real analysis server and shows the verdict before signing."

---

## 3. Agents Page

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

### 4.3 Bottom CTA
Headline: "Would you rather see it in action?" Description: "The Showcase exercises every layer of the wallet in your browser." CTA: "Open the Showcase".

---

## 5. Install Page

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
- **Pre-sign simulation** — "Baret decodes and simulates every transaction before the popup asks you to sign."
- **x402 firewall** — "Baret caps HTTP 402 payments per hour/day and checks them against your allowlist."
- **On-chain revoke** — "Every site gets its own sub-key. Revoke it on-chain with a single tap."

### 5.5 Post-install CTA
Headline: "Take a lap through the Showcase." Description: "Six fake-but-real dApps trigger six different attack patterns. Baret catches every one of them live. You see the analysis before you sign." CTAs: "Open the Showcase", "Read the Docs".

---

## 6. Page–Doc Sync Rule

The content in this file must stay in sync with the real code: whenever a section is added to, removed from, or has its copy changed on a page, this file is updated first. The Docs page card list (§4.2) in particular must match the existing files of this doc set (`docs/*.md`) one to one — whenever a new document is added, both places (the card list + the real Docs page implementation) must be updated.
