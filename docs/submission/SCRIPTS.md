# Video scripts

The demo video, the pitch video and the sponsor clips, shot by shot: what is on screen, what is clicked, what is said. Written by Hale (H11) for Ezgin and Meriç to review (E8), and for whoever records (H13). The requirements quoted come from `docs/QA_AND_DELIVERY.md` §8.1.

## Rules for every video

- **The live product only.** The track asks for "the live working product, not slides or a code walkthrough". Every shot is a live URL or a real terminal on Monad testnet. No mock screens, no `?sample=` URLs.
- **Baret is the layer, never "a safer wallet".** Say "the check any wallet, dapp or agent calls before it signs". The Baret wallet is "a wallet that calls Baret before it signs": proof that the layer works, not the product.
- **No wallet is named until H3.** Until Hale's MetaMask rehearsal (H3) says what MetaMask shows, the spoken line is "a wallet with no pre-sign check". After H3, the line names MetaMask only with what H3 saw. If MetaMask warns, the claim is "it does not tell you what will change", never "it does not protect you". The lines marked **[H3]** below change then.
- **Only what passed.** A shot goes in only if its flow passed on the live URL (H10, H16). Lines marked **[gate]** wait on a named task; if that task is not done at recording, the shot is cut, not faked.
- **Before recording:** open `https://baret-monad-api.onrender.com/health` and write down the commit; open `/health/ready` and check `explain`, `review`, `reviewSends`, `policyDraft` true; load each page once so nothing is cold. Use a clean browser profile.
- **Use a funded Baret account.** A fresh account with no MON adds "Could not measure the loss" and "Below your MON floor" to the wallet window (four findings instead of the two real ones). Fund the Baret account with testnet MON before recording (H16, 2026-10-10).

---

## 1. Technical demo — at most 3:00

**The page asks:** at most 3 minutes, on YouTube, Loom or Vimeo, "must show the live working product". **The magic moment** (`docs/PROJECT_OVERVIEW.md` §7) is inside the first 30 seconds: "I almost lost my money, Baret stopped it."

**Setup:** browser A with the wallet with no pre-sign check (MetaMask), Monad testnet added, the account holding testnet MON. The Baret wallet created on `https://baret-wallet.vercel.app` in the same browser and funded with testnet MON. A terminal with the repository open.

| Time | On screen | Action | Spoken |
|---|---|---|---|
| 0:00–0:08 | `https://baret-metropolis.vercel.app/novaswap` | "Suspicious swap" already on. Show the card. | "This is a swap site on Monad testnet. It asks me to enable dUSDC trading. Looks normal." |
| 0:08–0:25 | NovaSwap, wallet prompts | "Get 100 test dUSDC" (done before the take, so the balance reads 100), then "Sign with your wallet". Sign both prompts. The card ends with "dUSDC in your wallet: 100 before, 0 after." | **[H3]** "I sign it the way I always do, with a wallet with no pre-sign check. Two prompts. Neither told me what would change. My hundred dUSDC are gone." |
| 0:25–0:50 | NovaSwap → the Baret wallet's window | Same card, "Check with Baret". The window opens: "from https://baret-metropolis.vercel.app", **Blocked**, the findings, no sign button. Scroll to "In plain words". Press Decline. NovaSwap reads "The Baret wallet refused it. Nothing was signed." | "Same site, same button, same request. This time the wallet asks Baret before it signs. Baret simulates the transaction: an unlimited allowance to a look-alike address that is on a blocklist. Blocked, and there is no sign button. Nothing was signed." |
| 0:50–1:10 | NovaSwap, Baret's panel | "Enable dUSDC trading" (the site's own button): the panel shows Live verdict Blocked, what changes, the findings. Switch "In plain words" to Turkish, then back. | "Any app can call the same check. KIMI writes the verdict in plain words, in the user's language. It explains the verdict; it cannot change it." |
| 1:10–1:40 | `https://baret-metropolis.vercel.app/agents`, "Watch an agent ask first" | Balanced. "Pay a listed merchant" → Check it as the agent → **Safe**. "Send to a flagged address" → **Blocked**. | "Agents are the harder case: an agent key signs whatever it is handed. Here the agent asks Baret first. A payment to a listed merchant inside its caps: Safe. A transfer to a flagged address: Blocked, and the agent never signs." |
| 1:40–1:55 | `/agents`, "A real agent, paying from a real vault" | Scroll to the block. Hover the payment, open it on the explorer. | "This is a real agent, a Dynamic server wallet, paying from a PaymentGuard vault with on-chain caps. Its payments are read live from our Envio indexer." |
| 1:55–2:15 | Terminal **[gate: E1, a vault Hale controls]** | `baret pay` inside the cap: confirmed. The same command over the per-payment cap: refused. | "The vault holds the budget on chain. Inside the cap, the agent pays. Over it, it is refused, by Baret before signing and by the contract if anything gets past." |
| 2:15–2:40 | `https://baret-metropolis.vercel.app/review` | "Injected intent" → Run the review. Let the plan and the five tool calls stream; stop on **Veto** and "Nothing was signed or sent." | "And for a second opinion, Qwen reviews the agent's payment: it writes a plan, calls four read-only tools and can only veto. Someone planted an instruction in the intent. Qwen catches it, and nothing is sent." |
| 2:40–2:52 | `/agents`, the quickstart's TypeScript tab | Show the `guardedSubmit` line. | "For a developer it is one call: wrap your signer, and Safe signs, Blocked does not. No answer means no signature." |
| 2:52–3:00 | `https://baret-metropolis.vercel.app` | Landing. | "Baret: the check every wallet, dapp and agent on Monad can call before it signs." |

**If the 1:55 shot is cut** (no vault of Hale's by recording): give its 20 seconds to the `/agents` playground's "Pay aUSDC to a wallet with no credential" (Blocked, the asset only moves between verified wallets), spoken: "The same check enforces identity: this asset only moves between verified wallets."

**Do not use** the "Overpayment" scenario on `/review` until the 🐛 P1 in `tasks/FOR_MERIC.md` is fixed: its live reason also claims a ref mismatch that is not there.

---

## 2. Pitch — at most 2:00

**The page asks:** at most 2 minutes, "introducing the team, the problem being solved, and why you're building it". It has to answer the two heaviest criteria: **Founder & Market Readiness (25%)**, who adopts this primitive and why they would not build their own, and **Traction & Path Forward (20%)**, evidence of developer interest and a specific plan for more integrations after the event.

Faces on camera for the first and last part; the middle can be over screen captures from the demo.

| Time | Who / on screen | Spoken |
|---|---|---|
| 0:00–0:15 | The three of us | "We are Baret. Ezgin builds the engine and the contracts, Meriç builds everything you see, Hale tests it and ships it. Between us, this is the sixth version of Baret." |
| 0:15–0:40 | Over the NovaSwap drain | "The problem: people and now agents sign transactions they cannot read. A wallet shows a function name and a hex blob. One unlimited allowance to the wrong address and the money is gone. An AI agent is worse: its key signs whatever it is handed." |
| 0:40–1:05 | Over the Baret panel and the wallet window | "Baret is the layer that runs before the signature. One call: we simulate the transaction on Monad, run it through our detectors, a reputation registry that Chainlink CRE fills from ScamSniffer, Cleanverse identity **[gate: E2 — say "and Nansen labels" only if Nansen is on]**, and apply the user's own policy. Safe, Caution or Blocked, with the reasons. If any check cannot finish, the answer is Blocked." |
| 1:05–1:30 | Over `/agents` and the quickstart | "Who uses it: **[E8: confirm the named adopters]** wallets that want a pre-sign check without building a simulation and threat-data stack; dapps that want to show users what a request does; and agent frameworks, where Baret plus the PaymentGuard vault give an agent a budget, a policy and a kill switch. Why not build it yourself: the simulation, the 25 policy rules, the on-chain registry and the vault are already live on Monad testnet, behind one HTTP call or a TypeScript SDK." |
| 1:30–1:50 | The three of us | **[gate: H9 part 2]** "During the hackathon, **[team]** called Baret from **[their app]** before signing." After the event: **[E8: confirm]** the SDK published to npm, the MetaMask Agent Wallet plugin we already built as the first wallet integration, and PaymentGuard on Monad mainnet." |
| 1:50–2:00 | The three of us | "Every wallet, dapp and agent on Monad should be able to ask before it signs. Baret is that question." |

**If H9 part 2 has no evidence by recording:** drop the "During the hackathon" sentence; never imply an integration that did not happen.

---

## 3. Sponsor clips

Only the Cleanverse and CRE clips are required. The optional ones are made only if the flow passed H10 and there is time after the demo and the pitch.

### 3.1 Cleanverse — required, at most 5:00

**The page asks:** a demo video "showing the mandatory CVI/CVA integrations where wallet-bound CVI credentials are verified before executing any CVA transfer or settlement". **The use case to name:** Travel Rule-compliant agent payments.

| Shot | On screen | Spoken |
|---|---|---|
| 1 | `docs/CONTRACTS.md` 4.3 → `CompliantPaymentGuard` `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c` on the explorer, its source | "An agent pays merchants from a vault. Under the Travel Rule, both sides of a payment must be identified. Here the credential check sits inside the contract, before the transfer: no credential, no movement." |
| 2 | Explorer "Read contract": `verified(0xc448042EdAC1899B023CaA0E9Da5e4a8833de873)` → verified, tier 5; `verified(0x1365566191bAA9872A64AcDce963751d5343ff49)` → not verified | "This merchant holds a Cleanverse A-Pass. This one does not." |
| 3 | `/agents` playground, "Pay aUSDC to a verified wallet" → Safe; "Pay aUSDC to a wallet with no credential" → Blocked, "this asset only moves between verified wallets" | "Before the agent signs, Baret reads the same credentials on chain and names the party without one." |
| 4 **[gate: E6, a live settlement]** | The agent's payment to the verified merchant settling, the `Settled` event naming both credentials | "With a credential on both sides, the payment settles and the event records both." |
| 5 **[gate: E6]** | The same payment to the unverified merchant, refused by the contract | "Without one, the contract refuses it, whatever the agent signs." |

**If E6 is not done at recording:** shots 1–3 only, and the submission text says the settlement waits on test aUSDC from Cleanverse; never show a settlement that did not happen.

### 3.2 Chainlink CRE — required, at most 2:00

**The page asks:** a demo video "showing a successful simulation (via the CRE CLI) or a live deployment on the CRE network".

| Shot | On screen | Spoken |
|---|---|---|
| 1 | `workflows/reputation-oracle/main.ts`, scrolled briefly | "Baret's reputation registry is filled by a CRE workflow: it fetches ScamSniffer's blacklist, reads which addresses the registry does not know yet, and writes them on chain." |
| 2 | Terminal: `./workflows/simulate.sh --broadcast` | Let it run: "Threat feed: … addresses", "Registry does not know …", "Wrote … entries as SCAMSNIFFER_BLACKLIST", the tx hash. |
| 3 | The tx on the explorer, the `ReputationFlagged` events | "One signed report, through the forwarder, into the registry." |
| 4 | `curl` `/v1/analyze`: a transfer to one of the addresses just written → `blocked`, `KNOWN_MALICIOUS_ADDRESS`; the same transfer to an address not on the feed → `safe` | "And the live API now blocks a transfer to an address it wrote. The workflow is how threat data reaches Baret before anyone signs." |

Needs the CRE CLI (`cre login`), Bun ≥ 1.2.21, `cast`, and `workflows/.env` (Ezgin). The recorded run of 2026-10-07 in `workflows/README.md` is the fallback for the submission text, not for the video.

### 3.3 Optional clips (at most 2:00 each)

| Clip | Shots | Gate |
|---|---|---|
| **Mera UX** | Landing → "Create my wallet" (one passkey prompt) → Home → Send → Check and review → Sign and send → confirmed, with a tap and second counter on screen. Then clear the site's storage, reload, "Open with my passkey": the same address, vault and history come back. The sidebar's "Signing without a prompt until …" and the 15-minute lock. | H10 (3) on a real device |
| **Mera Many Keys** | The wallet's agent key created (one passkey prompt, salt `baret.agent.v1:<index>`), "Show the agent key". A second browser profile or device with the same passkey: the same agent address and key. "Nothing is stored; the key is minted from the passkey each time." | H10 (3), the cross-device test |
| **Envio** | `indexer/` config, schema and handlers in the repo; the wallet's Activity and `/agents` "A real agent, paying from a real vault" showing the same payments, each opening on the explorer. | H10 |
| **Dynamic** | `/agents`: the Dynamic server wallet named, authorised on the vault, its payment live from the indexer; `baret pay` from it in a terminal. | H10 |
| **Nansen** | A transfer to a Nansen-labelled address showing the label on the sign request. | E2 (Nansen is off on the live API on 2026-10-10) |
| **Alchemy** | The wallet window's "Simulated over Alchemy RPC on Monad", `/health/ready`. Thin; text only unless there is time. | — |

---

## Review

| Reviewer | What to check | State |
|---|---|---|
| Ezgin (E8) | The adopters and the post-event plan in the pitch; the CRE and Cleanverse clips; nothing claimed that is not live | open |
| Meriç | The on-screen words match the sites; the KIMI and Qwen shots | done 2026-10-10: every on-screen string is in the live copy; five notes under H11 in `tasks/FOR_HALE.md` |
| Hale (H3) | The **[H3]** lines, after the MetaMask rehearsal | open |
