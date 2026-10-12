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

**Setup:** browser A with the wallet with no pre-sign check (MetaMask), Monad testnet added, the account holding testnet MON. The Baret extension installed in the same browser, set up and funded (checked end to end on 2026-10-10: the attack Blocked with no sign button, the honest swap confirmed). The Baret web wallet created on `https://wallet.usebaret.com` and funded, for the fallback shot. The 🐛 P1 in `tasks/FOR_MERIC.md` is fixed (#77, live on the showcase since 2026-10-11): with the extension connected, the line under "Sign with your wallet" now reads "Sends this request to the Baret extension, which checks it with Baret before it signs."; the connect dialog lists it as "Baret extension", distinct from the web wallet's "Baret" row. A terminal with the repository open.

| Time | On screen | Action | Spoken |
|---|---|---|---|
| 0:00–0:08 | `https://usebaret.com/novaswap` | "Suspicious swap" already on. Show the card. | "This is a swap site on Monad testnet. It asks me to enable dUSDC trading. Looks normal." |
| 0:08–0:25 | NovaSwap, wallet prompts | "Get 100 test dUSDC" (done before the take, so the balance reads 100), then "Sign with your wallet". Sign both prompts. The card ends with "dUSDC in your wallet: 100 before, 0 after." | **[H3]** "I sign it the way I always do, with a wallet with no pre-sign check. Two prompts. Neither told me what would change. My hundred dUSDC are gone." |
| 0:25–0:50 | NovaSwap → the Baret extension's window | Switch the connected wallet to the Baret extension (Connect wallet → "Baret extension" under "Wallets in this browser"). Press the **same** "Sign with your wallet". The extension's window: **Blocked**, the two findings, "In plain words", no sign button, "This wallet does not sign a blocked request." Decline. NovaSwap reads "You declined in Baret. Nothing more was sent." | "Same site, same button, same request. This time the wallet is one that asks Baret before it signs. Baret simulates it: an unlimited allowance to a look-alike address that is on a blocklist. Blocked, and there is no sign button. Nothing was signed." |
| (fallback) | the Baret web wallet's window | If the extension shot is not clean: "Check with Baret" instead, the web wallet's window (passkey), Blocked, Decline → "The Baret wallet refused it. Nothing was signed." | Same line. |
| 0:50–1:10 | NovaSwap, Baret's panel | "Enable dUSDC trading" (the site's own button): the panel shows Live verdict Blocked, what changes, the findings. Switch "In plain words" to Turkish, then back. | "Any app can call the same check. KIMI writes the verdict in plain words, in the user's language. It explains the verdict; it cannot change it." |
| 1:10–1:40 | `https://usebaret.com/agents`, "Watch an agent ask first" | Balanced. "Pay a listed merchant" → Check it as the agent → **Safe**. "Send to a flagged address" → **Blocked**. | "Agents are the harder case: an agent key signs whatever it is handed. Here the agent asks Baret first. A payment to a listed merchant inside its caps: Safe. A transfer to a flagged address: Blocked, and the agent never signs." |
| 1:40–1:55 | `/agents`, "A real agent, paying from a real vault" | Scroll to the block. Hover the payment, open it on the explorer. | "This is a real agent, a Dynamic server wallet, paying from a PaymentGuard vault with on-chain caps. Its payments are read live from our Envio indexer." |
| 1:55–2:15 | Terminal | Hale's vault `0xA19A33288E9d1E3F5A0761a5b0fb7e5199c00E3C` (1 USDC in, the merchant capped at 0.25 per payment, 0.50 per hour, 1.00 per day; set up 2026-10-10). `baret pay --vault … --merchant 0x1365…ff49 --amount 100000` → `"decision": "safe"` and a hash. The same with `--amount 400000` → `"decision": "blocked"`, `"signed": false`. Env: `BARET_AGENT_PRIVATE_KEY=$HALE_DEMO_AGENT_KEY` from Hale's `.env`. Mind the hourly cap: two takes of 0.10 inside an hour are fine, a third 0.25 is not. | "The vault holds the budget on chain. Inside the cap, the agent pays. Over it, Baret simulates the payment, sees the contract would refuse it, and the agent never signs." The finding names the cap since 2026-10-11 (#101), so say "over the cap per payment" over it |
| 2:15–2:40 | `https://usebaret.com/review` | "Injected intent" → Run the review. Let the plan and the four tool calls stream; stop on **Veto** and "Nothing was signed or sent." | "And for a second opinion, Qwen reviews the agent's payment: it writes a plan, calls four read-only tools and can only veto. Someone planted an instruction in the intent. Qwen catches it, and nothing is sent." |
| 2:40–2:52 | `/agents`, the quickstart's TypeScript tab | Show the `guardedSubmit` line. | "For a developer it is one call: wrap your signer, and Safe signs, Blocked does not. No answer means no signature." |
| 2:52–3:00 | `https://usebaret.com` | Landing. | "Baret: the check every wallet, dapp and agent on Monad can call before it signs." |

**If the 1:55 shot is cut**: give its 20 seconds to the `/agents` playground's "Pay aUSDC to a wallet with no credential" (Blocked, the asset only moves between verified wallets), spoken: "The same check enforces identity: this asset only moves between verified wallets."

The "Overpayment" scenario is safe to show since M11 (verified live 2026-10-10: the veto names only the amount).

---

## 2. Pitch — at most 2:00

**The page asks:** at most 2 minutes, "introducing the team, the problem being solved, and why you're building it". It has to answer the two heaviest criteria: **Founder & Market Readiness (25%)**, who adopts this primitive and why they would not build their own, and **Traction & Path Forward (20%)**, evidence of developer interest and a specific plan for more integrations after the event.

Faces on camera for the first and last part; the middle can be over screen captures from the demo.

| Time | Who / on screen | Spoken |
|---|---|---|
| 0:00–0:15 | The three of us | "We are Baret. Ezgin builds the engine and the contracts, Meriç builds everything you see, Hale tests it and ships it. Between us, this is the sixth version of Baret." |
| 0:15–0:40 | Over the NovaSwap drain | "The problem: people and now agents sign transactions they cannot read. A wallet shows a function name and a hex blob. One unlimited allowance to the wrong address and the money is gone. An AI agent is worse: its key signs whatever it is handed." |
| 0:40–1:05 | Over the Baret panel and the wallet window | "Baret is the layer that runs before the signature. One call: we simulate the transaction on Monad, run it through our detectors, a reputation registry that Chainlink CRE fills from ScamSniffer, Cleanverse identity and Nansen labels (Nansen is on since 2026-10-11, E2), and apply the user's own policy. Safe, Caution or Blocked, with the reasons. If any check cannot finish, the answer is Blocked." |
| 1:05–1:30 | Over `/agents` and the quickstart | "Who uses it: **[E8: confirm the named adopters]** wallets that want a pre-sign check without building a simulation and threat-data stack; dapps that want to show users what a request does; and agent frameworks, where Baret plus the PaymentGuard vault give an agent a budget, a policy and a kill switch. Why not build it yourself: the simulation, the 25 policy rules, the on-chain registry and the vault are already live on Monad testnet, behind one HTTP call or a TypeScript SDK." |
| 1:30–1:50 | The three of us | **[gate: H9 part 2]** "During the hackathon, **[team]** called Baret from **[their app]** before signing." The SDK is on npm today (`@baret/guard` and `@baret/agent-kit` 0.1.1, 2026-10-12). After the event: the MetaMask Agent Wallet plugin we already built as the first wallet integration, and PaymentGuard on Monad mainnet." |
| 1:50–2:00 | The three of us | "Every wallet, dapp and agent on Monad should be able to ask before it signs. Baret is that question." |

**If H9 part 2 has no evidence by recording:** drop the "During the hackathon" sentence; never imply an integration that did not happen.

---

## 3. Sponsor clips

Only the Cleanverse and CRE clips are required. The optional ones are made only if the flow passed H10 and there is time after the demo and the pitch.

### 3.1 Cleanverse — required, at most 5:00

**The page asks:** a demo video "showing the mandatory CVI/CVA integrations where wallet-bound CVI credentials are verified before executing any CVA transfer or settlement". **The use case to name:** Travel Rule-compliant agent payments.

| Shot | On screen | Spoken |
|---|---|---|
| 1 | `docs/CONTRACTS.md` 4.3 → `CompliantPaymentGuard` on the explorer, its source: the BVUSD guard `0xFB70F98f6dd3A84c03B36fa2eea4C5f5De9c18Af` (the one that settled; source verified on Monad's Sourcify on 2026-10-12) and, if there is time, the aUSDC guard `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c` (verified on Monad's Sourcify) | "An agent pays merchants from a vault. Under the Travel Rule, both sides of a payment must be identified. Here the credential check sits inside the contract, before the transfer: no credential, no movement." |
| 2 | Explorer "Read contract": `verified(0xC448042edaC1899B023cAa0E9dA5E4a8833de873)` → verified, tier 5; `verified(0x1365566191bAA9872A64AcDce963751d5343ff49)` → not verified | "This merchant holds a Cleanverse A-Pass. This one does not." |
| 3 | `/agents` playground, "Pay aUSDC to a verified wallet" → Safe; "Pay aUSDC to a wallet with no credential" → Blocked, "this asset only moves between verified wallets" | "Before the agent signs, Baret reads the same credentials on chain and names the party without one." |
| 4 (E6 met, D-048) | The agent's payment to the verified merchant settling, the `Settled` event naming both credentials | "With a credential on both sides, the payment settles and the event records both." |
| 5 (E6 met) | The same payment to the unverified merchant, refused by the contract | "Without one, the contract refuses it, whatever the agent signs." |

**E6 is done (2026-10-11, D-048):** a payment settled, in `BVUSD` (Baret's own test Cleanverse Verified Asset, `0xCd829D44Dced8B47Ab0E4B08F1527cD2734E8ed2`) through the guard at `0xFB70F98f6dd3A84c03B36fa2eea4C5f5De9c18Af`: `0x2dd872a292e9d4e1d8b274081206e2bb70e37937621d728eeb9375eaa9cfaa6b`. Shot 1 shows that guard, shots 4 and 5 that transaction and the blocked `baret pay`; say "a compliant asset we issued through Cleanverse", never aUSDC. The commands are in `docs/CONTRACTS.md` 4.3.

**If E6 is not done at recording (kept for the record):** shots 1–3 only, and the submission text says the settlement waits on test aUSDC from Cleanverse; never show a settlement that did not happen.

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
| **Mera Many Keys** | Main shot, the sealed-settings round trip (D-039, the non-account work TEXTS section 5 names): save the rules and a merchant name, clear the site's storage (or a fresh profile with the same passkey), "Bring them back here", then "Your rules and merchant names are back, from copy number {n}." Second shot: the agent key created (one passkey prompt, salt `baret.agent.v1:<index>`), "Show the agent key", the same address again after the wipe. "Nothing is stored; both keys are minted from the passkey each time." | H10 (3), the cross-device test |
| **Envio** | `indexer/` config, schema and handlers in the repo; the wallet's Activity and `/agents` "A real agent, paying from a real vault" showing the same payments, each opening on the explorer. | H10 |
| **Dynamic** | `/agents`: the Dynamic server wallet named, authorised on the vault, its payment live from the indexer; `baret pay` from it in a terminal. | H10 |
| **Nansen** | A transfer to a Nansen-labelled address showing the label on the sign request. | Nansen is on since 2026-10-11 (E2). The clip still needs an address Nansen labels on Monad mainnet; none is named in the docs yet, so pick one before recording or drop the clip |
| **Alchemy** | `/health/ready` (`rpc` and `separateTraceRpc`), the server's RPC config in `docs/DEPLOYMENT.md`; the wallet window says "Simulated on Monad before anything is signed" since 2026-10-12, so do not read it as Alchemy evidence. Thin; text only unless there is time. | met |

---

## Review

| Reviewer | What to check | State |
|---|---|---|
| Ezgin (E8) | The adopters and the post-event plan in the pitch; the CRE and Cleanverse clips; nothing claimed that is not live | open |
| Meriç | The on-screen words match the sites; the KIMI and Qwen shots | done 2026-10-10: every on-screen string is in the live copy; five notes under H11 in `tasks/FOR_HALE.md` |
| Hale (H3) | The **[H3]** lines, after the MetaMask rehearsal | open |
