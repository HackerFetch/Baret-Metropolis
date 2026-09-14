# Baret — Frontend Content Specification (Showcase / Marketing Site)

> **This file is about CONTENT only: what each page says, which sections it has, which text/messages/data are shown, and what the user can do.** Color, typography, spacing, animation, palette — none of that lives in this file and never will; those belong to `BRAND.md` (not yet written) and to the frontend team's own design decisions. A designer/developer reading this file should learn "what belongs on this page", not "how it should look".

Last updated: 2026-09-14 · Status: **Content specification, no design/implementation** · Source: Baret-Stellar's `apps/showcase` codebase — content adapted to Monad/EVM. Per user instruction, the site names are **preserved verbatim**: SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD (see `DECISIONS.md` D-010).

This covers every page `apps/showcase` owns: **Home**, **Showcase hub + 6 sites**, **Agents**, **Docs**, **Install**.

---

## 1. Home / Landing Page

**Purpose:** Answer "what does this do and why does it matter" in 60 seconds for someone who has never heard of the product. A professional, unpretentious tone that speaks in numbers.

### 1.1 Cinematic opener (optional, scroll-triggered)
A short video/animation sequence that advances as the page scrolls, showing the following lines in order (one per scroll step):
1. "Every wallet signs whatever the dApp shows it."
2. "One Confirm button. Then the chain decides."
3. "Baret reads first."
4. "Simulated. Decoded. 25+ detectors."
5. "Rolling caps. Per-site policy. On-chain guard."
6. "Safe / Caution / Blocked. Before your keys move."
7. Brand moment: "Baret. A firewall for your signature."

This section is optional/stretch — if there are no assets it is not rendered at all, and the page starts directly at the Hero.

### 1.2 Hero
- Live-status badge: "Live on Monad testnet"
- Headline: **"Read first. Then sign."**
- Subheadline: "Baret reads every Monad transaction before you sign it. It decodes the transaction, simulates what it will do, and gives you a plain-language verdict before your keys move: Safe / Caution / Blocked."
- Two CTAs: **"Open the Showcase"** (primary), **"Read the Docs"** (secondary)
- Trust badges (four short labels): "Simulated before signing" · "Plain-language verdict" · "Rolling spend caps" · "Alerts on drift"
- On the right: a pixel-for-pixel miniature of the real Sign Request popup (the marketing mockup and the real wallet screen share the same component) — showing an example of a blocked transaction (e.g. an unlimited approval request from the origin "evil-drainer.xyz" + the verdict "Blocked by your policy").

### 1.3 Detector marquee
A scrolling/static strip listing the detector names (example labels — the real list must stay in sync with `ARCHITECTURE.md` §6):
"Wallet drainer" · "Unlimited approval" · "Hidden contract call" · "Admin key handoff" · "Fee abuse vs simulated baseline" · "Look-alike asset" · "Memo omission" · "Rug-pull pattern" · "Agent drift" · "Allowance overflow" · "Facilitator impostor" · "Unknown contract" · "LP unlock" · "Compliance gate" · "Phishing payload" · "Silent re-sign"

### 1.4 Three Columns (The Product)
Headline: "Three layers, one signature." Description: "Baret runs three checks before your keys move. Each one stands on its own. Together, they close the gap that drainers, stale approvals and silent agents walk through today."

1. **Pre-sign Guard** — "Baret decodes and simulates every transaction on the server, then runs 25+ risk detectors. The popup explains every finding in a single sentence." Sub-points: Server simulation · 25+ risk detectors · Policy engine gate.
2. **Authorization Ledger** — "Every approval becomes a row with a cap, a clock and a live progress bar. No more unlimited approvals you forgot about." Sub-points: Rolling caps · One-click revoke · Pause/resume. (Live demo value: "acme-dapp.xyz daily cap: 62/100 USDC")
3. **Post-sign Monitor** — "Baret watches your account and your smart wallet over a WebSocket. If something you never signed moves, you get an instant browser notification." Sub-points: WebSocket subscribe · Drift detection · Cold-start backfill.

### 1.5 The "x402 Gap" Section (The Wedge)
Headline: "x402 is stateless. Baret isn't." Description: "x402 is the agentic-payment protocol now live on Monad. By design it is a **stateless** challenge-pay-settle handshake. Every payment is a freshly signed transfer. The protocol itself has no allowance object, no revoke endpoint, no spend cap. Baret is not the protocol — it is a **stateful control layer** that sits on top and adds the caps x402 deliberately left out."

A comparison (x402 alone vs x402 + Baret) along a four-step track (402 Challenge → Sign → Pay → Settle): in plain x402, every step forgets the one before it; with Baret, the ledger underneath is the one thing that remembers across every call.

Three concrete gap/answer pairs:
1. **Silent agent drift** — An agent re-signs a micro-payment every minute; with no allowance object in the protocol, nothing shows the running total. → Baret's answer: hourly/daily rolling per-merchant caps; every signature decrements a real number, and once the cap is hit the next one is blocked.
2. **Look-alike asset swap** — A merchant offers a token labeled "USDC" from the wrong issuer; the spec only checks that the asset field matches, not which issuer is the real one. → Baret's answer: a wallet-side asset allowlist seeded with the network's canonical USDC; unknown contracts require an explicit override before signing.
3. **Authorization key compromise** — If the signing key leaks, x402 has no per-merchant scope to limit the damage. → Baret's answer: a per-merchant scoped sub-key revoked on-chain with a single click; spend caps are enforced by the extension today, a bounded on-chain allowance is on the roadmap.

### 1.6 Stats Strip
Four figures: "25+" Risk detectors · "6" Threat scenarios · "3" Layers of defense · "1" Contract on Monad testnet.

### 1.7 Showcase Strip
Headline: "Six fake-but-real dApps." Description: "Connect a wallet and click a button. Baret catches the threat live. No slides, no mockups." Six site cards (name, category tag, "Catches: X" line) + "Open the Showcase" link. The cards are the condensed version of §2 on the Showcase hub.

### 1.8 Comparison Section
Headline: "Same signature, two wallets." Description: "No wallet is being bashed here. This is what changes when a pre-sign check sits between the app and your keys." A four-row side-by-side comparison:

| | A standard Monad wallet | Baret |
|---|---|---|
| Before signing | A contract address and a Confirm button. The chain decides the rest. | A decoded transaction, a simulation, and a verdict: Safe/Caution/Blocked. |
| Unlimited approvals | Granted once, lives until you remember to revoke it. | Every approval is a row with a cap and a clock. Pausing/revoking is one click. |
| Agent payments | An agent can re-sign micro-payments all day with no ceiling. | Hourly and daily per-site caps, checked at signing time and again on-chain. |
| After signing | You find out what happened from a block explorer. | Baret watches your account and alerts you if something you never signed moves. |

### 1.9 Security and Privacy Section
Headline: "What runs where." Description: "You are trusting Baret with the moment right before your keys move, so here is exactly what we do with it."

Four cards:
1. **Analysis runs on a server** — "The wallet sends the unsigned transaction to the analysis server for decoding and simulation. The server sees that unsigned transaction. It never sees your keys."
2. **Nothing is signed without you** — "The verdict comes back before the popup asks you anything. Nothing is signed until you approve it. When Baret says Blocked, it refuses to sign."
3. **Keys stay on your device** — "Your keys are stored encrypted on your device. They are never sent to the analysis server or anywhere else."
4. **Simulation is a preflight** — "Verdicts reflect simulated state, not a guarantee. Gas, expiry and network conditions can make real execution deviate from the simulation."

Footnote: "No audit yet. The code is open. Read it." + "View source" link (GitHub).

### 1.10 FAQ
The fair questions people ask before trusting a wallet with the sign button:
- "What happens if the analysis server goes down?" → "Baret tells you the transaction was not checked and leaves the decision to you. It never fabricates a verdict, and it never signs on your behalf."
- "Does it work alongside other wallets?" → "Yes. Baret registers as a standard EIP-6963 provider and shows up in the same wallet picker next to the ones you already use. You can install it without removing anything."
- "Is it free?" → "Yes. Baret is free and open source under the MIT license."
- "When mainnet?" → "Testnet today. Mainnet comes after store listings and more real-world testing. We would rather ship the firewall late than wrong."
- "What does Blocked actually do?" → "Baret refuses to sign. You can override it, but that is a separate, deliberate step, and it is logged so you can see it afterwards."
- "Where are my keys?" → "Encrypted on your device. They are never sent anywhere — not to the analysis server, not to us."

### 1.11 Final CTA
Headline: "Sign with your eyes open." Description: "Open the Showcase, connect a wallet, and watch Baret refuse a wallet drainer in real time." Two CTAs: "Open the Showcase", "Install the wallet". Footnote: "Free and open source, MIT licensed. On Monad testnet today. Store review pending."

---

## 2. Showcase Hub Page

**Purpose:** "The proving ground." Six fake-but-real dApps, each wired to a different attack pattern.

### 2.1 Hero
Headline: **"Six dApps. Six threats. One signature you never made."** Description: "Every site below looks production-ready and behaves like the real thing. Connect a wallet, press a button, and watch Baret catch the attack in plain language — before your keys ever sign." CTAs: "See the scenarios", "Install the wallet", "Read the Docs". A live "ticker" line rotates through different threat types in turn: "wallet drainers", "unlimited approvals", "rug-pull patterns", "silent agent drift", "look-alike assets", "hidden contract calls".

### 2.2 Stats Strip
"6" Demo dApps · "3" Threat classes · "25+" Risk detectors · "1" Contract on Monad testnet.

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
- **Description:** A "Cyber Phantoms" mint page. Behind the artwork sits a hidden authorization change that empties every asset in your wallet.
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
3. **Baret inspects** — Server-side simulation + 25+ detectors + your local policy run on the unsigned tx.
4. **Verdict** — Safe / Caution / Blocked, every finding in plain language. You sign with your eyes open, or you reject.

### 2.5 Detector Grid ("Under the hood")
Headline: "25+ detectors fire on every signature." Description: "Every scenario trips a different subset. The popup only shows you the findings that matter. Each one explains in a single sentence why the transaction is suspicious." Three featured cards: Pre-sign Guard (server simulation + detectors), Authorization Ledger (every grant is a row with cap+expiry+progress bar), Post-sign Monitor (WebSocket subscribe, alert on anything you never signed). Alongside, a list/grid of detector labels (see the §1.3 marquee list).

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
| Brand | Brand identity, tone, design tokens | `BRAND.md` (not yet written) |

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
