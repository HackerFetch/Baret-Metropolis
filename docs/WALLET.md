# Baret — Wallet Specification

> Every surface, every screen, every flow of the wallet. This document is **binding**: adding a new screen requires updating this file first, then implementing it. Color/typography will come from `BRAND.md`. See `ARCHITECTURE.md` for the overall architecture, `CONTRACTS.md` for contract details, and `X402_FACILITATOR.md` for x402 mechanics.

Last updated: 2026-09-14 · Status: **Specification phase, no implementation** · Source: Baret-Stellar's `docs/wallet-spec.md` — adapted to Monad/EVM (Soroban→EVM, trustline→ERC-20 approval, XLM→MON, Horizon→Monad RPC, Friendbot→Monad faucet).

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
