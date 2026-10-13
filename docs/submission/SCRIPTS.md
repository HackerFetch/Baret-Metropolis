# Video scripts

Every submission video, scene by scene: what is on screen, what is clicked, and the spoken text. Rewritten on 2026-10-14 after a check of every shot against the live product (commit 04245fc, then 7d61ee3 and 886bb82). Meriç records, voices and uploads all of them; the screen part is recorded silently with the demo-video pipeline (scripted Playwright capture, then a 1920x1080 60 fps composite with camera moves), and the voice goes on top. The requirements quoted come from `docs/QA_AND_DELIVERY.md` §8.1.

## Rules for every video

- **The live product only.** Every scene is a live URL or a real command on Monad testnet. A terminal scene replays the real output of the real command, run just before the take. No mock screens, no `?sample=` URLs.
- **Baret is the layer, never "a safer wallet".** The Baret wallet is "a wallet that calls Baret before it signs".
- **No wallet is named in speech** in the comparison: say "a wallet with no check before signing". The NovaSwap box "Same request, two paths" names MetaMask on screen; that is a design choice and stays.
- **Format:** 1920x1080, 16:9, 60 fps; page zoom 110-125% for hand takes; the address bar or the URL shows usebaret.com. English voice-over and an English SRT file.
- **Nothing secret on screen:** no key, no `.env`, no personal data. The terminal prompt is `$ `.
- **Explorer:** show each on-chain step on the explorer; every link in a description goes to `https://testnet.monadscan.com`. The showcase links Monadscan since 7d61ee3; the extension still links monadexplorer, which redirects to monadvision, so no extension explorer link is clicked on camera.
- **Before any take:** open `https://baret-monad-api.onrender.com/health/ready` and wait for `"status":"ready"` (explain, review, reviewSends, sealed, indexer, nansen true). Load usebaret.com and wallet.usebaret.com once. Repeat after 10 quiet minutes.
- **Funded accounts:** a Baret wallet with no MON shows two extra findings ("Could not measure the loss", "Below your MON floor"). Fund it first.
- **Limits:** from one machine, at most 6 `/v1/review` and 20 `/v1/explain` calls a minute. Nansen labels: 25 a day, reset 03:00 GMT+3 and on every API deploy; past that the server answers from first-funder, which still reads "new".
- **Upload:** YouTube, unlisted or public. Title `Baret — <Video> | Monad Metropolis`. Description: chapters (each sponsor's moment) and links (live site, repo, transactions on Monadscan). A 1280x720 thumbnail. Open the link in a logged-out window after upload.

---

## 1. Technical demo — at most 3:00

**The page asks:** at most 3 minutes, "must show the live working product". The magic moment (NovaSwap blocked, with KIMI's plain words) lands inside the first 30 seconds, so the Baret path comes first and the wallet with no check comes second.

**Setup:** a Baret web wallet on wallet.usebaret.com, funded with testnet MON. A second wallet with no pre-sign check (MetaMask by hand, or an injected test wallet in a scripted take), funded with MON and holding 100 dUSDC from NovaSwap's "Get 100 test dUSDC" (a real `faucet()` call on dUSDC `0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc`). "Suspicious swap" on. For the terminal scene: `packages/agent-kit`, Meriç's demo vault (below).

| # | On screen and action |
|---|---|
| 1 | `usebaret.com/novaswap`, "Suspicious swap" on: "On. The card sells dUSDC, and its button asks for an unlimited allowance to a look-alike router. This is the attack version." The card: "Enable dUSDC trading", swap 20 dUSDC. |
| 2 | Connected wallet: "Baret web wallet". Press "Sign with your wallet". The wallet window: "The wallet is locked" → "Unlock with your passkey" (cut the prompt). "Verdict: Blocked", "Blocked by your rules", "Block unlimited allowances and 2 more rules stopped this request. Nothing was signed.", findings "Unlimited allowance", "This address is on a blocklist", "This address copies another one". Scroll to "In plain words" (KIMI, about 9 s after the unlock; cut the wait). Only "Decline", with "This wallet does not sign a blocked request." Decline. NovaSwap: "The Baret wallet checked it with Baret and refused to sign. Nothing was sent." |
| 3 | The Baret extension's sign window on the same request: "Blocked by your rules", only "Decline". NovaSwap after Decline: "You declined in Baret extension. Nothing more was sent." If the extension take is not clean: usebaret.com/install with the extension card. |
| 4 | Connect wallet → the wallet with no check. The line under the button: "Sends this request straight to your wallet, with no Baret check." Press the same "Sign with your wallet", confirm both prompts. The card: "The attack went through", "dUSDC in your wallet: 100 before, 0 after." |
| 5 | The site's own "Enable dUSDC trading": Baret's panel, "Verdict: Blocked", "Expected Blocked · Live Blocked · Matches", what changes, findings. "In plain words": Language → Turkish (about 12 s to write; cut), then English. |
| 6 | `usebaret.com/agents`, "Watch an agent ask first.", Balanced. "Pay a listed merchant" → "Check it as the agent" → "Safe. Allowed. Your agent signs and sends." "Send to a flagged address" → "Blocked", "This address is on a blocklist … or is flagged by Nansen." "Pay aUSDC to a wallet with no credential" → "Blocked", point at "No verified identity". |
| 7 | `/agents`, "A real agent, paying from a real vault.": "This agent is a Dynamic server wallet … read live from the Envio indexer." The row "0.25 USDC", merchant 0x1365…ff49. Open it: `https://testnet.monadscan.com/tx/0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3`. |
| 8 | Terminal in `packages/agent-kit` (commands below). Inside the cap → `"decision": "safe"` and a hash; over the cap → `"decision": "blocked"`, `"signed": false`, "The amount is over this merchant's cap per payment." |
| 9 | `usebaret.com/review`, "Injected intent" → run. Plan and tool calls stream; "Reviewed by Qwen (qwen3.8-max)", "Veto", "The payment's intent carries instructions to the reviewer…", "Nothing was signed or sent." The number of tool calls varies; say "read-only tools". |
| 10 | `usebaret.com/partners` (the sponsor logos), or `/agents` "How it works". |
| 11 | `/agents` quickstart: click "TypeScript" (HTTP API is selected on load); the `agent.guardedSubmit({` line. |
| 12 | `usebaret.com`: the opener plays by itself; optionally one scroll to "Check it first. Then sign." |

**Scene 8 commands** (Meriç's vault; Hale's vault `0xA19A…0E3C` only lets agent `0xC082…9C4b` pay, and that key is not on this machine). Vault `0x46F159DA1aD40A78526d35ea1Adb8531aDa52158`, dUSDC, merchant `0x1365566191bAA9872A64AcDce963751d5343ff49` capped at 1.00 per payment, 2.00 per hour, 5.00 per day; agent `0x227ba9d7B649988C48662Ac42360727bA971647E` (its key is loaded from `packages/agent-kit/.env`, never shown). `--ref` is required and must change on every retake; the empty `QWEN_API_KEY=` keeps the reviewer out of this scene. Check the room first with `cast call 0x46F1… 'available(address)(uint256)' 0x1365… --rpc-url https://testnet-rpc.monad.xyz` (keep it at 100000 or more), and leave time after any other transaction from the agent (the /review honest run uses the same agent).

```sh
cd packages/agent-kit
QWEN_API_KEY= pnpm --silent baret pay --vault 0x46F159DA1aD40A78526d35ea1Adb8531aDa52158 --merchant 0x1365566191bAA9872A64AcDce963751d5343ff49 --amount 100000 --ref demo-inv-001
QWEN_API_KEY= pnpm --silent baret pay --vault 0x46F159DA1aD40A78526d35ea1Adb8531aDa52158 --merchant 0x1365566191bAA9872A64AcDce963751d5343ff49 --amount 1500000 --ref demo-inv-002
```

**Spoken** (one paragraph per scene; scenes 1-12):

```text
This is a swap site on Monad testnet. It asks me to turn on dUSDC trading. It looks normal.

I press sign. My wallet is the Baret passkey wallet, built on Mera. It asks Baret first. Baret runs the transaction without sending it and finds an unlimited allowance to a fake address on a blocklist. Blocked. KIMI explains it in plain words, and there is no sign button.

Baret also comes as a browser extension, with the same check.

Now the same button, with a wallet that has no check before signing. Two prompts. Neither tells me what will change. My hundred dUSDC are gone.

Any app can call the same check. KIMI can explain it in the user's language, like Turkish. It explains the verdict. It cannot change it.

Agents have the same problem: an agent key signs whatever it gets. Here the agent asks Baret first. A payment to a known shop, inside its limits: safe. A transfer to a flagged address: blocked. A payment to a wallet with no Cleanverse identity: blocked.

This is a real agent. It is a Dynamic server wallet that pays from a vault with limits on chain. We read its payments live from our Envio indexer.

The vault keeps the budget on chain. Inside the limit, the agent pays. Over the limit, Baret sees that the vault would refuse it, and the agent never signs.

For a second opinion, Qwen reviews the payment. It makes a plan, uses read-only tools, and can only say no. Someone hid an order inside the payment note. The review says no. Nothing is sent.

Under the hood: Alchemy reads the chain, Chainlink keeps the blocklist fresh, Nansen rates wallets, and Cleanverse checks identity.

For a developer, it is one call. Wrap your signer. Safe signs. Blocked does not. No answer means no signature.

Baret. The check that every wallet, app and agent on Monad can call before it signs.
```

---

## 2. Pitch — at most 2:00

**The page asks:** at most 2 minutes, "introducing the team, the problem being solved, and why you're building it"; it answers **Founder & Market Readiness (25%)** and **Traction & Path Forward (20%)**. Order: team → problem → solution → why Monad → proof (Venue) → plan.

Meriç narrates and is on camera for the first and last paragraph; Ezgin and Hale are named in the third person (their photos with a caption while their names are spoken). Never say "the three of us". The middle paragraphs run over footage from the demo: the NovaSwap drain (problem), the Baret panel and the wallet window (solution), a transaction on testnet.monadscan.com (why Monad), `/agents` and the quickstart (who needs it), README "Used outside the team" or the Venue commit (proof).

Facts behind the text: `@baret/guard`, `@baret/llm` and `@baret/agent-kit` are 0.1.3 on npm (2026-10-13); two points of Venue's report shipped in 0.1.3 (TEXTS.md section 1); Venue is an independent developer's project, never "another team", and Baret never stopped a live attack on Venue; the MetaMask Agent Wallet plugin is built and tested, not published; the Chrome Web Store listing is pending review and is not mentioned; Monad's finality is 800 ms (`docs/PROJECT_OVERVIEW.md`); everything stays on testnet, the plan names no mainnet step (Ezgin, 2026-10-13). If a take runs over 2:00, drop "Our SDK is on npm today." first.

```text
We are Baret. Ezgin develops the engine and the contracts. I am Meriç. I build everything you see. Hale tests it and ships it. This is the sixth version of Baret.

The problem is blind signing. People approve what they cannot read, and one wrong approval can empty a wallet. Now agents pay on their own too, and an agent key signs whatever it gets.

Baret runs before the signature. One call runs the transaction on Monad without sending it, checks a Chainlink-fed blocklist, Cleanverse identity and Nansen labels, and applies the user's own rules: Safe, Caution or Blocked, with the reasons. If a check cannot finish, Baret blocks.

Why Monad? Blocks are final in under a second. A bad signature is final before anyone can react, so the check has to come first.

Wallet teams add Baret instead of building their own. Apps show users what a request will do. Agent builders get a budget, rules and a kill switch.

During the hackathon, the independent developer of Venue, a market for compliant assets on Monad, put Baret in front of every signature. Their test found a gap in one of our rules, and we fixed it the same day. Our SDK is on npm today.

Next, the MetaMask Agent Wallet plugin we built becomes our first wallet integration, and our browser extension brings the same check to everyday users.

People and agents will keep signing what they cannot read. Baret stops them before it costs them.
```

---

## 3. Sponsor clips

### 3.1 Cleanverse — required, at most 5:00

**The page asks:** a demo video "showing the mandatory CVI/CVA integrations where wallet-bound CVI credentials are verified before executing any CVA transfer or settlement". **The use case:** Travel Rule-compliant agent payments. Both settlements are shown, BVUSD and aUSDC, each with its own guard and transaction.

Checked on chain on 2026-10-14: both guards have the same source and owner `0x5aE1…8197`, agent `0x3067…C353` (the Dynamic wallet), minTier 1. `verified(0xC448…e873)` returns `true 5`, `verified(0x1365…ff49)` returns `false 0`. Monadscan has **not** verified either guard (no Read Contract, the Settled log shows as a raw topic); both are verified on Monad's Sourcify, so the source and Read Contract show on testnet.monadvision.com in a real browser. Until Ezgin verifies them on Monadscan, scenes 1-2 use monadvision or the terminal; every link in the description stays Monadscan.

| # | On screen and action |
|---|---|
| 1 | The `CompliantPaymentGuard` source (monadvision Contract tab, or `contracts/src/CompliantPaymentGuard.sol` lines 206-237: identity before value), then the two guards on Monadscan: `0xFB70F98f6dd3A84c03B36fa2eea4C5f5De9c18Af` (BVUSD) and `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c` (aUSDC). |
| 2 | `cast call 0x6E867b840f11cC1d9c6e16d1f76D737199bc907c 'verified(address)(bool,uint256,uint8)' 0xC448042edaC1899B023cAa0E9dA5E4a8833de873 --rpc-url https://testnet-rpc.monad.xyz` → `true 5 0`; the same with `0x1365566191bAA9872A64AcDce963751d5343ff49` → `false 0 0`. Do not read the third number aloud. |
| 3 | `usebaret.com/agents` playground, Balanced: "Pay aUSDC to a verified wallet" → Safe; "Pay aUSDC to a wallet with no credential" → Blocked; point at "No verified identity … this asset only moves between verified wallets." (The playground's wallet is `0x5AE9…2C93`, not the one in scene 2.) |
| 4 | `https://testnet.monadscan.com/tx/0x2dd872a292e9d4e1d8b274081206e2bb70e37937621d728eeb9375eaa9cfaa6b`: Success, from the agent, to the BVUSD guard, 0.25 "( BVUSD )" to `0xC448…e873`; Logs: the Settled log (payer tier 0x19 = 25, payee tier 5). |
| 5 | `https://testnet.monadscan.com/tx/0x2052c1b9c6de8352fb7d69f9fd558e2a45552e8993371eadc00adb6b32a23942` (block 70738086, through the live API): Success, to the aUSDC guard, 0.25 "Access USDC ( aUSDC )". The first aUSDC run, `0xd93efca3ee70e3e0fb7ab74a31026eebc99f00f04d7935b10104278915c66293`, goes in the description. |
| 6 | Terminal in `packages/agent-kit`: `../../node_modules/.bin/tsx src/cli.ts review --from 0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353 --vault 0x6E867b840f11cC1d9c6e16d1f76D737199bc907c --merchant 0x1365566191bAA9872A64AcDce963751d5343ff49 --amount 250000 --ref cam-2 --intent "Pay the merchant 0.25 aUSDC for the order"` → `"decision": "blocked"`, `"signed": false`, `NotVerified`, `COMPLIANCE_NO_CREDENTIAL` (watch-only: it cannot sign). Then the contract's own refusal: `cast call --from 0x3067…C353 0x6E86…907c 'pay(address,uint256,bytes32)' 0x1365… 250000 <ref>` reverts `NotVerified(0x1365…, 0)`. |
| 7 | `usebaret.com`. |

```text
This is Baret with Cleanverse. The use case is Travel Rule payments made by AI agents. An agent pays shops for its owner, and under the Travel Rule both sides of a payment must be known. So we put the identity check inside the contract, before any money moves. This is our Compliant Payment Guard. It runs twice on Monad testnet: one for aUSDC, Cleanverse's Access USDC, and one for BVUSD, a compliant test asset we issued through Cleanverse.

First, who has a credential. We ask the guard. This shop holds an active Cleanverse A-Pass, at tier five. This one has no credential at all.

Now the agent tries to pay. Before it signs anything, Baret runs the payment and reads the same credentials on chain. To the verified wallet: safe. To a wallet with no credential: blocked. Baret tells the agent which side has no credential, and nothing is signed.

Here is a real payment in BVUSD, through its own guard. The agent paid a quarter of a dollar to the verified shop. The Settled event records both credentials and their tiers. It records the credential, never personal data.

And here is a second real payment, in aUSDC, through the aUSDC guard. This one went through Baret's live API: checked as safe, signed by the agent's Dynamic wallet, and settled with the same event.

Now the same payment to the shop with no credential. Baret blocks it before signing and gives the reason: no verified identity. And even if an agent signed it anyway, the contract itself refuses it. No credential, no movement. This works for both assets.

Baret and Cleanverse: Travel Rule payments for agents on Monad, with identity checked before every transfer.
```

### 3.2 Chainlink CRE — required, at most 2:00

**Recorded and cut** (Hale; the source is `23921b28c32e4259af64f0bcdf19f25e.mov` in Meriç's repo root, ignored by git). 1:16.7, 1280x718, 30 fps, TTS voice-over and burned-in captions. All four shots are in: the workflow code (0:00), the CRE CLI simulation with `--broadcast` (0:10), transaction `0x5d72012bb7bed6dbbe6ade3dd40d3a4243137b2482dc1205b4cbbd5f39fb1175` on the explorer (0:32), and the live check: blocked `KNOWN_MALICIOUS_ADDRESS` / `SCAMSNIFFER_BLACKLIST`, then an unlisted address safe (0:48). Checked on chain and on the live API on 2026-10-14. No re-shoot. Optional: upscale to 1080p (`ffmpeg -vf "scale=1920:1077:flags=lanczos,pad=1920:1080:0:1:black" -c:v libx264 -crf 18 -c:a copy`), and trim 0:32.2-0:38 where an earlier transaction (`0x81b1…1b00`) shows behind the terminal. The explorer on screen is monadvision; the description links Monadscan.

**Title:** `Baret — Chainlink CRE Workflow | Monad Metropolis`. **Chapters:** 0:00 The workflow · 0:10 CRE CLI simulation, 10 new entries written · 0:32 The transaction on Monad testnet · 0:48 Live Baret API: blocked, then an unlisted address passes. **Links:** usebaret.com; the repo and `workflows/reputation-oracle`; the transaction, the registry `0x7491Cb218A7b184ac50F9c2bfbd54C2a67Bfa411`, the receiver `0x7105Fb53bA2a9d96c4587280F2696438Aca51d9d` and the blocked address `0x17504785059123e758f1cd2bfa00ab45b613f9e5`, all on testnet.monadscan.com.

**SRT** (`baret-chainlink-cre.en.srt`, the words of the voice-over):

```text
1
00:00:00,000 --> 00:00:04,000
AI agents can move your money. But can they spot a scam?

2
00:00:04,640 --> 00:00:07,760
Meet Baret, a safety check before you sign.

3
00:00:07,760 --> 00:00:13,040
With Chainlink CRE, several nodes must agree on the update before new addresses enter

4
00:00:13,040 --> 00:00:17,280
Baret's blocklist. Let's follow one update from start to finish.

5
00:00:17,280 --> 00:00:21,920
Public scam data, a signed report and a real transaction on Monad.

6
00:00:21,920 --> 00:00:25,840
The source holds over 2,500 reported scam addresses.

7
00:00:25,840 --> 00:00:29,040
Baret checks this batch against its own on-chain list.

8
00:00:29,920 --> 00:00:35,600
10 entries are new to Baret, ready to become part of its next transfer check.

9
00:00:36,160 --> 00:00:41,600
Those 10 addresses go into one signed report. Here's the Monad transaction.

10
00:00:42,800 --> 00:00:48,080
Confirmed, 10 entries written on chain. Now let's test the result.

11
00:00:48,080 --> 00:00:51,920
Can Baret use this fresh data before the transfer is signed?

12
00:00:52,880 --> 00:00:56,400
We check one of the newly added addresses: blocked.

13
00:00:56,400 --> 00:01:01,360
Baret detects the match and stops the transfer before signing.

14
00:01:01,360 --> 00:01:04,560
And an unlisted address returns safe.

15
00:01:04,560 --> 00:01:10,720
No blocklist match, so it passes this check, though that alone doesn't prove it's risk-free.

16
00:01:10,720 --> 00:01:15,040
From public scam reports to checks before signing. That's Baret.
```

### 3.3 Optional clips (60-90 s each, one sponsor each)

Each spoken text below is 136-160 words: 62-80 s at 120-130 words a minute. Only Dynamic and Envio can borrow footage from the main demo (scene 7); the others need their own takes.

**Dynamic.** Scenes: `/agents` "A real agent, paying from a real vault" (agent `0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353`, vault `0x0A82671420114E47c672D5e8e23017DdCE850A35`) · the row "0.25 USDC" · the Monadscan transaction `0x06a81dda…4ab3` (from the Dynamic wallet to the vault, 0.25 USDC to the merchant) · the quickstart TypeScript tab.

```text
This is a real AI agent on Monad testnet. Its wallet is a Dynamic server wallet. The key is split in two parts: one part stays with Dynamic, and the other stays on the machine where the agent runs. Neither side can sign alone.

The agent does not hold the money. It is the signer of a payment vault. The vault holds the budget, and the owner sets the rules: which shops the agent can pay, and how much per payment, per hour and per day. The contract enforces those limits, not the agent.

Here is one of its payments on the explorer. The Dynamic wallet calls the vault, and the vault pays the shop a quarter of a dollar in test USDC. The owner can remove this key at any time.

And before the Dynamic wallet signs anything, it asks Baret. Safe is signed. Blocked never reaches the key. If Baret cannot answer, nothing is signed.
```

**Envio.** Scenes: `/agents` live block, "Every payment below is real, read live from the Envio indexer." · `wallet.usebaret.com/x402`, "x402 Console" → "Baret network": "Live", "Updated N s ago", "Reads again every 5 seconds.", "Latest across Baret" · "View on Monadscan" on one row · optionally `indexer/schema.graphql` on GitHub. (Not the History page: a new account has no vault, so it has nothing from the indexer.)

```text
Baret needs a memory of what agents did. That memory is Envio HyperIndex.

On our agents page, this list of payments is read live from our Envio indexer. Every row is a real payment from a real vault on Monad testnet.

The Baret wallet reads the same indexer. This console checks it again every five seconds. Here you see the latest activity across Baret: vault payments, and every change to Baret's blocklist, including the entries that our Chainlink workflow writes on chain.

Each row is a real transaction. One click opens it on the explorer.

The indexer follows every vault that our factory creates, so there is no list of addresses to keep up to date. When a new user opens a vault, its payments simply appear.

The Qwen reviewer uses it too. Before it approves a payment, it reads how much that shop was already paid in the last hour and the last day.
```

**Mera UX.** Scenes: `wallet.usebaret.com/onboarding`, "No recovery phrase. Your passkey is the key." · tap 1 "Create my wallet", passkey, "Your wallet is ready" · (funded off camera) the sidebar "Signing without a prompt until …" · tap 2 "Send", address and amount, tap 3 "Check and review" (Safe), tap 4 "Sign and send", confirmed, open on Monadscan · delete the site's data, the onboarding screen again · "Open with my passkey": the same address and balance; the send on the Monadscan address page (a plain MON send does not come back in Activity: only vault events come from the indexer). Move between pages with the sidebar; a reload locks the wallet.

```text
This is the Baret wallet. It has no account system of its own. Mera is the whole account layer. There is no seed phrase to write down, no extension to install and no email to confirm.

One tap and one passkey, and the account is ready on Monad. The passkey stays on the device, protected by your fingerprint or your face.

Signing works in a Mera session. The sidebar shows how long it lasts. After fifteen minutes, the wallet locks itself and says so.

Now I send a payment. Send. Check and review: Baret checks it before the sign button even appears, and it is safe. Sign and send. That is four taps, from a new account to a confirmed payment.

Now I delete everything this site saved in the browser.

I open the wallet again with the same passkey. Same account, same balance, and the payment is on Monad. Nothing was stored. The account comes back from the passkey.
```

**Mera: One Passkey, Many Keys.** Scenes: Settings, "Your rules on every device" · Policies Balanced → Strict; "Save an encrypted copy", passkey, "Saved. Encrypted copy number N is on Monad."; the SealedStore `0xC094af68bE1039f70E1362C2f326542BB2DC21BB` on Monadscan with its newest write from the relayer `0x076705F1…8eAf` (no MON needed from the user) · delete the site's data, "Open with my passkey", Settings → "Bring them back here" → "Your rules and merchant names are back, from copy number N.", Policies shows Strict · Agents: an agent key created before the take (needs a funded account with a vault, about 0.2 MON), "Show the agent key", passkey: **blur the key in the edit**, show only the matching agent address. A second browser profile with the same passkey needs a syncing passkey on real devices; the scripted take uses the site-data wipe, which TEXTS section 5 allows.

```text
One passkey in the Baret wallet makes three keys that are not linked to each other. Only one of them is the account.

The first key is the account itself. The second key is for agents: each agent gets its own key, so an agent never learns anything about the account. The third key only encrypts. It never signs a transaction.

Here I change my rules to Strict and save an encrypted copy. The third key encrypts my rules on this device. Baret's server pays to store the copy on Monad, but it cannot read it or change it.

Now I clear this browser and open the wallet with the same passkey. I bring my rules back. They are decrypted only here, and Strict is back.

The agent key works the same way. It matches the agent on the vault, and it comes back after the wipe.

Nothing is stored. Every key is made from the passkey, each time.
```

**Nansen.** Scenes: `/agents` playground, Balanced, "Pay aUSDC to a verified wallet" → Safe · Strict, the same action → Blocked: "Below your trust level", "Nansen rates 0xC448…e873 as new. Your rules need established or higher." · "Show what the agent and Baret said": `NANSEN_TRUST_BELOW_MINIMUM`. No Nansen-labelled address is known and no screen prints a label, so the label shot is dropped. One or two rehearsals at most (the daily label budget).

```text
Agents often pay wallets they have never seen before. Baret uses Nansen to judge them.

Here an agent pays a wallet that Baret has never seen. The payment is small, and the wallet has a valid identity. On the Balanced setting, the payment goes through.

Now the same user switches to Strict. Strict asks for more trust before money moves. I run the same payment again. This time, Baret asks Nansen about the other side first. Nansen has no history for this wallet, so it rates it as new. The user's rule needs an established wallet or better. So the answer is Blocked, and the agent never signs.

Baret shows the reason in plain words: below your trust level. The user can confirm the wallet another way, or lower the rule.

And if Nansen does not answer at all, the check counts as failed, and the answer is Blocked. Baret fails closed.
```

**Alchemy.** Scenes: `/agents` "How it works", "…reading the chain over Alchemy's Monad RPC." · a terminal running the quickstart's HTTP API call piped to `jq '.sources'`: `{"name": "alchemy", "status": "ok"}`, then nansen and reputation-registry ok. ("alchemy: ok" exists only in the API answer; no screen prints it. The wallet's "Simulated on Monad before anything is signed" is not Alchemy evidence.)

```text
Every Baret verdict starts with reading the chain. Baret reads Monad through Alchemy.

Before a transaction is signed, Baret needs facts: the balances before and after, the code of the contract, the blocklist, and the limits of the vault. Alchemy's Monad RPC gives Baret these facts, fast, for every single check.

Every answer from Baret lists the sources it used, and whether each one worked. Here is a live check from the terminal, the same call any developer can make. Alchemy: ok. Nansen: ok. The reputation registry: ok.

This list matters. If a source cannot answer, Baret does not guess. The check does not pass, and the answer is Blocked.

So when a wallet, an app or an agent asks Baret before it signs, the answer is built on fresh data from Monad, read through Alchemy.
```

**Teaser** (at most 30 s, not judged; 16:9 and 9:16): cut from the demo footage. The first 2 seconds show the drain or the Blocked verdict; text layers; usebaret.com at the end.

```text
On screen:
One signature can empty a wallet.
Baret checks it first.
Blocked. Before you sign.
For wallets, apps and AI agents.
usebaret.com

Voice (optional):
One signature can empty a wallet. Baret checks every transaction before you sign. Blocked, with the reason in plain words. For wallets, apps and AI agents on Monad. usebaret.com.
```

---

## Review

| Reviewer | What to check | State |
|---|---|---|
| Ezgin | Verify both `CompliantPaymentGuard` deployments on Monadscan (no transaction; unlocks Read Contract and the decoded Settled log for the Cleanverse clip); the pitch facts | open |
| Meriç | Records, voices and uploads every video | all scripts checked against the live product on 2026-10-14 (eight areas, each verified twice) |
