# Baret — Brand Spec (BK-001 · Rev 02)

> How Baret looks, sounds and feels on every surface: extension popup and options, standalone Mera wallet, showcase site and its six dApps, docs, store listing, demo video. This file is **binding**: a visual or verbal change on any surface requires a PR that updates this file first. Tokens in `packages/ui/src/tokens.css`, the mark in `packages/ui/src/brand/Mark.tsx` and the tag in `packages/ui/src/primitives/Tag.tsx` mirror this file; if they ever disagree, the code is what ships and this file gets a follow-up PR.

Last updated: 2026-09-15 · Status: **Rev 02, approved by Meriç** · Rendered kit: the "Baret Brand Kit" artifact · Resolves AK-8 in `DECISIONS.md`.

---

## 01 · Idea

**Lockout / Tagout.** On a real site, before anyone touches a machine, a lock goes on and a tag says who, why and until when. Baret does the same to a Monad transaction: it reads it, simulates it, and hangs a verdict on it before the key can turn. The name (a *baret* is the hard hat) puts us on the site; the tag is what we do there. We are deliberately not in the shield-and-padlock aisle where every wallet-security brand lives.

- **One line:** *The firewall for your signature on Monad.* README, store listing, first slide. Never longer.
- **Three words:** **Calm. Technical. Candid.** Every rule below is a specialization of these. When a rule and the words disagree, the words win.
- **Stance:** procedure over promise. We never say "you are safe". We say what we read, what we simulated, which rule fired, and what you can do. Then we stop.

**We are:** the inspector who read the drawing before the pour and tells you, in one sentence, what is wrong with it · quiet by default; the product speaks when something is wrong and says exactly one thing · of this network: Monad is the only chain in the copy, the code and the pictures.

**We are not:** "100x SAFE"; no fear, hype, rockets or glowing padlocks · a trading app, a launchpad, a multi-chain tool · a sponsor badge wall; an integration is load-bearing or it is not in the product.

---

## 02 · Mark

The mark is a hard hat reduced to three cuts: **dome, visor, brim**. The visor slit is the product (it looks before you sign). The chamfered brim ends are the system (every tag, button and plate carries the same cut corner). Two colors maximum, always flat, always vector.

**Geometry (64-unit grid):**
- Dome: 38 wide, 24 tall, shoulders at 3:2. Not a half circle; the flatter top makes it a helmet, not a sunrise. Path: `M13 38C13 22.5 21 14 32 14s19 8.5 19 24Z`
- Visor: 22 × 4 cut in the background color, centered at y=29 (`x=21 y=27 w=22 h=4`). Never a stroke, always a cut.
- Brim: 52 wide, 8 tall, ends chamfered 3 units (`M6 41h52l3 3.5-3 4.5H6l-3-4.5Z`). Wider than the dome by 7 on each side.
- Gap between dome and brim: 3 units. Reads as air, not stroke.

**Lockup:** mark + 14 px + wordmark in Big Shoulders Stencil Display 900, all caps, tracking +4%. Mark height = cap height. Minimum full lockup 96 px wide; mark alone 20 px. Clear space = 24 units on the 64 grid on every side. Never separate mark and wordmark in headers, splash screens or share cards; mark alone is fine as toolbar icon and favicon.

**Color variants:** orange on concrete (default) · orange on graphite (dark) · ink on orange (icon, sticker) · ink on chalk (print, mono).

**Never:** recolor beyond orange, ink, chalk · gradients, bevels, shadows, outlines, glows · rotate, skew, add a face or a checkmark · place on a photo without a chalk or graphite plate · round the brim's ends · raster.

---

## 03 · Tag (signature device)

A safety tag: a card with a punched eyelet, a chamfered corner so it does not snag, and a colored edge that reads from across the site. Baret's verdicts, pills, buttons, section markers and callouts are all tags. The tag makes a Baret screen recognizable at thumbnail size before the logo is visible.

**Anatomy:** edge 4 px carrying the state color · eyelet ring 10 px at 55% opacity (decorative but mandatory) · chamfer top-right 9–10 px · paper Manila `#F3EFE4` light / `#2A2620` dark · text Big Shoulders Display 800, uppercase, +6% tracking.

**States:** Safe (green) · Caution (amber) · Blocked (red) · Can't reach Baret (ink, neutral) · Watching (teal) · Monad (violet, network only) · Brand (orange paper, ink edge).

**Where:** verdict block of every sign request · allowance status on merchant cards · section markers on showcase and docs · network pill · "Rev" stamp · buttons (primary and ghost buttons are tags without an eyelet).

---

## 04 · Color

Materials, one signal, and the network. The ground is poured concrete, not white and not cream. Cards are chalk. Type is ink. The single signal is **International Orange** (aerospace safety standard, `#FF4F00`), one notch redder than a generic orange so it reads as equipment. Monad violet appears only where a screen states a fact about the network.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--concrete` (bg) | `#E6E6E1` | `#17181B` graphite | Page ground |
| `--concrete-2` (bg-2) | `#D9D9D2` | `#121316` | Alternating sections, wells |
| `--chalk` (surface) | `#F8F8F5` | `#1F2024` | Cards, sheets, popup |
| `--ink` (fg) | `#121316` | `#EDEDE8` | Type, mark on orange, plates |
| `--orange` | `#FF4F00` | `#FF5A0F` | The one signal: CTA, mark, tag edge, focus ring |
| `--orange-2` | `#E44600` | `#FF6D2B` | Hover on orange fills |
| `--manila` | `#F3EFE4` | `#2A2620` | Tag paper only |
| `--violet` | `#836EF9` | `#9C8BFB` | Network facts only. Never CTA, never ground |
| `--ok` | `#0F8A5F` | `#34C48C` | Safe, confirmed, under cap |
| `--warn` | `#C27400` | `#F0A030` | Caution, advisory, expiry soon |
| `--bad` | `#D3210A` | `#FF5A3D` | Blocked, drift, cap exceeded |
| `--live` | `#0B7A8C` | `#3BC0D4` | Watching pulse, agent activity |

Text on ink: 72% secondary, 52% muted, 34% faint. Rules: 14% dividers, 28% active. Paper grain overlay at ~6% alpha on the ground (SVG feTurbulence), multiply in light, screen in dark.

**Ratio 90 / 8 / 2:** ninety percent concrete, chalk and ink; eight percent orange (one CTA, the mark, one edge); two percent state or violet. Two orange buttons on one screen means one too many.

**Anti-rules:** no gradients of any kind, not even a glow; depth comes from grain and rule lines · no red for routine destructive actions · no green buttons · ink on orange, never white on orange (white fails at 2.9:1, ink passes at 7.9:1).

---

## 05 · Type

| Role | Face | Settings | Use |
|---|---|---|---|
| Wordmark, hero number | **Big Shoulders Stencil Display** | 900, caps, +4%, ≥ 40 px | The name; the single most important number or word on a screen |
| Headlines, verdicts | **Big Shoulders Display** | 700–900, caps, line 0.95, ≥ 18 px | Section titles, verdict words, card titles, tag text |
| Body | **Instrument Sans** | 400 / 500 / 600, 14–16 px, line 1.5 | UI text, docs, marketing paragraphs |
| Data | **JetBrains Mono** | 400 / 500, 12–14 px, `tnum` | Addresses, hashes, amounts, JSON, countdowns, labels |
| Labels | JetBrains Mono | 11 px, +8%, uppercase, faint | Eyebrows, section labels, doc codes |

Google Fonts in dev, self-hosted woff2 in production, Latin Extended subset.

**Scale:** display-2xl 64 / 0.9 / stencil 900 · display-xl 44 / 1.0 / 800 · display-l 32 / 1.0 / 800 · display-m 24 / 1.05 / 700 · text-l 16 / 1.5 / 500 · text-m 14 / 1.5 / 400 · text-s 12 / 1.45 · label 11 mono +8%.

**Rule:** one screen, one stencil. The most important number or word is set in Stencil at display-xl or larger; nothing else on that screen may use it.

---

## 06 · Grid, corners, layout

- **Rhythm:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. No 5, 7, 10, 18.
- **Corners:** square everywhere (cards, inputs, panels, 1 px rule). Chamfer only on tags (10 px) and buttons (8 px). The only circles are eyelets, dots and the dome.
- **Surfaces:** popup 360 × 600, bottom tab bar, no chrome during a sign request · options 240 px sidebar + 1024 content, 80 px background grid · showcase 1180 max, one stencil number, one focused card 480–560 · standalone wallet uses popup components on a full-page grid.
- **Canonical card:** label + state tag on one line · one stencil number · one orange meter · one plain sentence · actions on a rule. Every wallet view, showcase card and analysis report is a specialization of this.

---

## 07 · Imagery

**One world:** Metropolis as a live construction site on the Monad grid. The city glows violet; the equipment is orange; everything else is concrete, steel, plywood, manila and wire. **No text in any image, ever.** The prompt notebook (local, gitignored) is written against this section.

| Scene | Ground | Light | Palette | Content |
|---|---|---|---|---|
| **01 Night skyline** | Asphalt / graphite | Night, violet haze | Ink towers, violet windows and fog, one orange crane light | The city is Monad; the only warm light is ours |
| **02 Day site** | Concrete with grid | Flat daylight | Concrete, ink lines, manila, one orange edge | Scaffold, formwork, barricade, a blank tag on a wire |
| **03 Tag macro** | Graphite studio | Single soft key | Manila card, orange edge, steel wire | The hero object; a blank tag, eyelet, chamfer, wire |
| Blueprint (texture family) | Chalk / concrete | None | Ink lines, one orange dash | Backgrounds only, never a scene |

**Always:** no letters, digits, logos, signs, labels or UI; even the tag is blank · one scene per frame · isometric, straight-on or drone at human/drone eye height; never fisheye or tilt-shift · matte materials, grain welcome, gloss forbidden · palette locked to concrete, ink, orange, violet, manila · negative space where copy will sit, subject occupies one third.

**Never:** padlocks, shields, checkmarks, chains, coins, hooded figures, fingerprints · neon, cyberpunk, glassmorphism, chrome, lens flare, particles, holograms · faces (workers from behind, at distance, or as hat and silhouette) · other chains' colors or symbols · phones, monitors or any screen showing an interface · rounded glossy "3D icon" renders.

---

## 08 · Motion and icons

| Pattern | Duration | Curve |
|---|---|---|
| Surface enter | 160 ms | ease-out, 6 px rise |
| Tag hang (verdict appears) | 240 ms | ease-out, −3° → 0° rotate at the eyelet |
| Hero number count-up (first load) | 600 ms | cubic-bezier(.22, 1, .36, 1) |
| Live pulse | 1600 ms loop | opacity .4 → 1 → .4 |
| Sheet slide | 260 ms | cubic-bezier(.32, .72, 0, 1) |

No bounce, no overshoot, no loops except pulse and spinner, no marquee in the product; `prefers-reduced-motion` collapses everything to instant swaps.

**Icons:** Lucide, stroke 1.5 px, sizes 12 / 16 / 20 / 24, `currentColor`. No filled icons except the mark and state dots. Recurring: HardHat, Tag, ShieldOff (blocked), Activity, Send, Download, Key, Lock, Globe, AlertTriangle, ChevronRight.

---

## 09 · Voice

Say what happened. Say what you can do. Stop.

| Don't | Do |
|---|---|
| Error: insufficient balance | Not enough USDC. You need 0.4 more. |
| Transaction signed | Sent. Block 12,844,210. |
| Are you sure? | Sign this transfer of 1.2 MON? |
| Approve unlimited | Let this dApp spend up to 10 USDC. You can lower the cap any time. |
| WARNING ⚠️ | One amber tag and one plain sentence. |
| Blocked!!! | Blocked. Rule: unlimited approval to an unknown contract. |

**By surface:** empty states reassuring and actionable, never apologetic · confirmations plain past tense, no emoji · blocked neutral, never accusatory: the rule that fired, then the option · onboarding one hook, one CTA per step · marketing confident, no hype, numbers do the talking.

**Words we do not use:** revolutionary, seamless, unlock, empower, disruptive, LFG, wagmi, degen, 🚀, 100x, military-grade, bank-level. "Demo" is allowed on the showcase and banned inside the wallet.

---

## 10 · Applications

- **Sign request:** origin chip + network tag, action verb in display, verdict tag block (Safe / Caution / Blocked / Can't reach Baret), "What changes" rows in mono, countdown, Decline + primary. On Blocked the primary is disabled; override is a separate, deliberate, logged step. Same component in the popup, the standalone wallet and the landing hero.
- **Share image 1200 × 630:** concrete ground with 40 px grid, lockup centered, one orange bar on the bottom edge. Same for store listing and demo video end card.
- **Extension icon 16 / 32 / 48 / 128:** ink mark on a square orange plate, no rounding.
- **Section markers:** numbered tags replace icons; the active one is orange.

---

## 11 · Accessibility

Every text token meets WCAG AA on its surface; faint text only at ≤ 12 px · focus ring 2 px solid orange, 3 px offset, never removed · every action reachable via Tab / Enter / Space; modals trap focus, Esc dismisses · hit targets ≥ 32 × 32 px (36 in the popup) · every status tag has an `aria-label`; count-ups expose the final value.

---

## 12 · Implementation home

Tokens `packages/ui/src/tokens.css` · mark `packages/ui/src/brand/Mark.tsx` · tag `packages/ui/src/primitives/Tag.tsx` · primitives `packages/ui/src/primitives/` (Button, Tag, Card, Meter, Input, Dialog, Sheet) · showcase-only pieces `packages/showcase-ui` · generated imagery delivered to `apps/showcase/public/img/` and `apps/extension/public/img/` under the file names in the prompt notebook.

When in doubt, the sentence at the top outranks any rule below it: **Calm. Technical. Candid.**
