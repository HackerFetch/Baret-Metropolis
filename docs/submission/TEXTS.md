# Submission texts, one per prize

Ready to paste into the platform's form fields. Each entry has three parts: what the form asks (from `docs/QA_AND_DELIVERY.md` §8.1), the text itself, and the gates that must be true before it is submitted. Written by Hale (H14) on 2026-10-10 from what was checked live that day (API commit `16f5448`); Ezgin checks the facts (E8).

**The copies to paste (2026-10-13):** every text below sits in a plain-text block: no code marks, no quote marks, links written out in full, transactions on `testnet.monadscan.com`. Copy the block's contents as they are. The main track's three long fields (at most 8,000 characters each) are in section 1.

Rule for every entry: a prize whose feature is not working on the live URL at the freeze is not entered, and the reason goes into `docs/BOUNTIES_AND_TRACKS.md`. A **[gate]** line names what must be true first; an entry with an open gate on Monday is not submitted.

Common links, used below:

- Repository: <https://github.com/HackerFetch/Baret-Metropolis>
- Live: <https://usebaret.com> (demo sites, `/agents`, `/review`, `/install`), <https://wallet.usebaret.com>, API <https://baret-monad-api.onrender.com>
- Access instructions for judges: the README's "Access instructions for judges"

---

## 1. Main track: Trust, Identity & AI Infrastructure

**The form asks:** the project logo (`docs/submission/baret-mark-1024.png` for a square box; `baret-logo-1024.png` is the wordmark), the public repository, a technical demo video (max 3 min), a pitch video (max 2 min), a live link with access instructions.

**Short description (1,409 characters; for a short field, or as the summary):**

```text
Baret is a pre-sign check for Monad that wallets, dapps and AI agents call before they sign. One call (POST /v1/analyze, or the @baret/guard SDK) simulates the transaction on Monad with debug_traceCall, runs nine detectors over the trace (allowances, permits, unknown and risky contracts, borrowed code, loss against balance, x402 payment shape, an on-chain reputation registry, Cleanverse identity, Nansen labels) and applies the signer's own policy of 25 rules. The answer is Safe, Caution or Blocked, with reasons. It fails closed: a check that cannot finish blocks.

For agents, Baret adds PaymentGuard, an on-chain vault with per-merchant caps per payment, hour and day and an owner's kill switch, and @baret/agent-kit, a signer that cannot sign past the verdict. A Qwen 3.8 Max reviewer can veto an agent payment that does not match its intent, and KIMI explains every verdict in plain words without being able to change it.

Three applications on the layer show it end to end: a passkey wallet (Mera), a browser extension wallet that refuses a Blocked request in its own window, and six demo sites, each with an honest version and an attack. The reputation registry is filled from ScamSniffer's blacklist by a Chainlink CRE workflow; vault activity is indexed by Envio.

Everything is live on Monad testnet. Our verify:demo script sends all twenty demo scenarios to the live API and agrees on 20 of 20.
```

**The form's three long fields (each at most 8,000 characters, plain text; written 2026-10-13):**

*Problem, solution and why it is useful* (6,531 characters):

```text
THE PROBLEM

People and AI agents sign transactions they cannot read. A wallet shows a contract address, a function name and a wall of hex; the site says "Enable trading" and the signature behind it is an unlimited allowance to an address that looks like the real one. The loss happens at the moment of signing, and everything that could have warned the signer (what the call really does, who the counterparty is, whether the address is already known as a drainer) exists only after the fact, in an explorer.

Agents make this worse. An agent that can pay has a key, and a key signs whatever the model decides to sign. A prompt injection, a wrong merchant address or a price that changed between the plan and the payment all end in the same place: a valid signature on the wrong transaction. Asking the same model to check itself does not help, because the model that made the mistake is the one being asked.

So the check cannot live inside the wallet's display, and it cannot live inside the agent. It has to sit outside both, run before the signature exists, and answer in a form that a person can read and a program can obey.

THE SOLUTION

Baret is a pre-sign check for Monad. Before a wallet, a dapp or an AI agent signs a transaction, it sends the unsigned transaction to Baret and gets back one of three answers: Safe, Caution or Blocked, with the reasons. It is a layer that other applications call, not a wallet. One HTTP call (POST /v1/analyze) or the TypeScript SDK (@baret/guard on npm) is the whole integration.

HOW IT WORKS

1. Simulate. Baret traces the call on Monad (debug_traceCall). The trace gives every balance change, allowance and contract the transaction touches, for every account involved, not only the signer.

2. Detect. Nine detectors read the trace: unlimited and collection-wide allowances, signed permits, unknown and risky contracts, borrowed code (delegatecall), ownership handovers, loss against the balance, the shape of an x402 payment, an on-chain reputation registry, Cleanverse identity credentials and Nansen address labels.

3. Decide. The signer's own policy, 25 rules starting from a Strict, Balanced or Permissive template, turns the findings into one verdict. The rules belong to the signer, not to Baret.

4. Explain. KIMI writes the verdict in plain words under the findings, in English, Turkish or Chinese. It receives the verdict and cannot change it.

For agents there is a second line of defence that does not depend on the check at all. Money sits in a PaymentGuard vault on Monad: per-merchant caps per payment, per hour and per day, enforced by the contract, and a revoke the owner can pull at any time. The @baret/agent-kit signer refuses to sign a Blocked transaction, and a Qwen 3.8 Max reviewer reads the vault, the merchant and the amount with four read-only tools and can veto a payment that does not match what the agent was asked to do. It can only veto; it cannot approve something the check blocked.

The data behind the verdict arrives through sponsor technology doing real work. A Chainlink CRE workflow fetches ScamSniffer's public blacklist and writes new addresses to Baret's ReputationRegistry on Monad (simulated with the CRE CLI, with real writes on testnet). Envio HyperIndex indexes every vault, payment and registry change. Cleanverse credentials are read on chain before a verified asset moves. Nansen's profiler gives the counterparty a trust level. Chain reads go through Alchemy. The passkey wallet's whole account layer is Mera, and the demo agent is a Dynamic server wallet.

PROOF

Everything is live on Monad testnet (chain id 10143) and open to anyone with a browser.

- Live product: https://usebaret.com (six demo sites, each with an honest version and an attack, the agents playground and the Qwen reviewer), the passkey wallet at https://wallet.usebaret.com, and the API (its health page: https://baret-monad-api.onrender.com/health).
- Used outside the team: during the hackathon an independent developer, the author of Venue, an order book for Cleanverse Verified Assets on Monad testnet, wired @baret/guard into Venue's signing path from the npm package and its README alone. Their own approval transaction exposed a threshold fault in our unlimited-allowance rule. We fixed it the same day and they confirmed the same transaction is now Blocked. Commit: https://github.com/brutaldevvin/venue/commit/cf3371607ccccca80e099b9718a6a16f7c730803. Their report: https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md.
- Published SDK: @baret/guard, @baret/agent-kit and @baret/llm, version 0.1.3, on npm (https://www.npmjs.com/package/@baret/guard). Two of the points in Venue's report shipped in 0.1.3.
- Tests: 1,343 automated tests in 125 files, 85 Foundry tests on the contracts including fuzz and invariant tests, and a script that sends all twenty demo scenarios to the live API and agrees on 20 of 20.
- On chain: the contracts are verified on Monad's Sourcify, and the on-chain claims in the repository carry their transactions. For example, an agent payment from a Dynamic wallet through a vault: https://testnet.monadscan.com/tx/0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3.
- Repository: https://github.com/HackerFetch/Baret-Metropolis.

WHY IT IS DIFFERENT

The models never decide. KIMI explains a verdict it cannot change. Qwen can veto an agent's payment and can do nothing else. The verdict itself comes from a simulation and written rules, so the same transaction gets the same answer, and a model that is fooled can at worst refuse a good payment.

No data means no. Baret fails closed at every step: a simulation that cannot run, a detector that cannot answer or a data source the signer's rules depend on and that is down all end in Blocked. The SDK treats no answer from Baret the same way.

It is an open layer, not a product to be locked into. The policy is the signer's own. The reputation registry is a contract on Monad that anyone can read. A person's rules are stored encrypted with a key from their own passkey, in a contract on Monad, where Baret's server can neither read nor change them. The wallet, the extension and the demo sites in the repository are applications built on the layer to show it working; the layer is the submission.

It is built for agents as well as people. The same check serves a browser wallet, a dapp's own confirm screen and an agent's signer, and for agents the vault's on-chain caps hold even if every off-chain check is bypassed.
```

*Who the first users are and how we reach them* (6,148 characters). It answers the two heaviest criteria, Founder & Market Readiness (25%) and Traction & Path Forward (20%):

```text
WHO ADOPTS BARET FIRST

Baret is for any product on Monad whose flow ends in a signature. Four groups, in the order we expect them:

1. Dapps that hold or move user funds, starting with the one that already integrated. Venue, an order book for Cleanverse Verified Assets on Monad testnet, built by an independent developer, put @baret/guard in front of every signature in its signing path during the hackathon. Dapps like it (order books, launchpads, yield and claim pages) adopt Baret to show users what a request will do before the wallet opens, and to refuse to send a request that their own front end should never have produced.

2. Builders of agents that pay. An agent with a key needs three things before anyone will fund it: a budget, a policy and a kill switch. Baret gives all three: the PaymentGuard vault with per-merchant caps enforced on chain, the pre-sign check on every payment, and the owner's revoke. The @baret/agent-kit package wraps the agent's signer so that a Blocked payment cannot be signed, works with a Dynamic server wallet and ships a CLI; the quickstart has MCP samples. Teams building x402 payment flows on Monad are the nearest of these: Baret already checks the shape of an x402 payment.

3. Wallet teams on Monad. A wallet cannot be trusted to understand what it signs unless it simulates, and a simulation alone is not a verdict. A wallet adds Baret as the step between "the site asked" and "the sign button appears". We built two wallets on the layer ourselves, a passkey wallet and a browser extension wallet, to prove that the integration fits a real signing window, and a plugin for the MetaMask Agent Wallet that puts the same gate in front of it.

4. Compliance-bound payment flows. Where a Cleanverse Verified Asset moves, both parties must hold a verified identity. Baret checks the credentials before signing and the CompliantPaymentGuard contract enforces the same on chain. Venue trades exactly these assets.

WHY THEY CHOOSE BARET OVER BUILDING THEIR OWN

Building this in-house means building five things, not one: a transaction simulation and a parser for its trace; a set of detectors that is kept up to date as attacks change; a threat-data pipeline (an on-chain reputation registry fed by a Chainlink CRE workflow from ScamSniffer's blacklist, Nansen labels, Cleanverse credentials); a policy engine with rules the end user can change; and the tests that make any of it trustworthy (1,343 automated tests today, plus 85 Foundry tests on the contracts). None of it is the team's product. With Baret it is one HTTP call with no key, or four lines with the SDK.

Three further reasons came out of the first integration:

- It is fast to adopt. Venue's developer integrated from the npm package and its README alone, in one session, without talking to us first.
- It gets better with every integrator. Venue's own approval transaction showed a gap in our unlimited-allowance rule. We fixed it the same day, and every other caller got the fix without changing a line. A team that rolls its own finds each of these gaps alone.
- It does not capture them. The verdict is deterministic and comes with its reasons and its data sources; the policy belongs to the signer; the registry is a public contract on Monad; the SDK fails closed, so a team never ships a path where a missing answer means "sign".

EVIDENCE SO FAR

- The Venue integration, during the hackathon. Commit: https://github.com/brutaldevvin/venue/commit/cf3371607ccccca80e099b9718a6a16f7c730803. The developer's report, with nine points of feedback: https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md. In their words: "We integrated Baret into Venue's transaction-signing flow in one session with Codex assistance. Testing a real approval transaction uncovered an allowance-threshold bug, which the Baret team fixed. We then verified that the same transaction was correctly blocked."
- Three packages published on npm at version 0.1.3: https://www.npmjs.com/package/@baret/guard, https://www.npmjs.com/package/@baret/agent-kit, https://www.npmjs.com/package/@baret/llm. Version 0.1.3 was cut from Venue's feedback: a helper that tells an integrator when a verdict is expired or for the wrong chain, and the API's own error message carried on the SDK's error.
- A public API that answers without a key, and quickstarts where every snippet was run against the live API: https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/guard/README.md and https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/agent-kit/README.md.
- A working quickstart page for agent builders with HTTP, TypeScript, CLI and MCP samples: https://usebaret.com/agents.

HOW WE REACH THEM, AFTER THE JUDGING

The plan is concrete because most of it is already built and waiting on a step outside our hands.

1. Wallets, through the MetaMask Agent Wallet plugin. The plugin is built and shown on testnet: it is a gate in front of the wallet that asks Baret before the agent's wallet signs. After the event it becomes our first wallet integration and the reference we show to other wallet teams on Monad.

2. Everyday users, through the Chrome Web Store. The Baret extension wallet is submitted to the Chrome Web Store and in review. Once it is public, the install is two clicks instead of a zip, and every site a user opens becomes a place where Baret's verdict is seen. That is also our distribution to dapp teams: their users arrive already checked.

3. Agent builders, through the x402 payment check. We take the x402 check and the vault to the teams building paying agents on Monad, with the agents playground as the thing they can try in a minute.

4. Dapps, through Venue's remaining feedback. Three points of the report are not built yet: structured error codes with retry hints, a viem example and a multi-party example. They are the next SDK release, and each one removes a step for the next dapp that integrates the way Venue did.

What we measure is simple: the number of projects that call the check in their signing path, and the number of findings their real transactions teach us, as Venue's did.
```

*Steps to try the product* (5,435 characters; only the judges see it):

```text
No account and no login are needed. Everything runs on Monad testnet (chain id 10143). The demo sites and the reviewer work with no wallet at all.

BEFORE YOU START

The API sleeps when idle. The first request after a quiet spell can take up to a minute. Open https://baret-monad-api.onrender.com/health once and wait for the answer; after that every check takes a few seconds.

1. THE TWO-MINUTE PATH (no wallet)

- Open https://usebaret.com/novaswap. It is a fake swap site.
- Turn on "Suspicious swap" and press "Enable dUSDC trading".
- Baret's panel opens with the live verdict for that exact request: Blocked. The site asks for an unlimited dUSDC allowance to a look-alike address that is on Baret's reputation registry. Under the findings, "In plain words" explains it in English, Turkish or Chinese (KIMI).
- Turn "Suspicious swap" off and press the button again: the honest swap is Safe.

The five other demo sites (OrbitYield, PixelDrop, ClaimHub, LaunchPad and Scrybe) each have an honest version and an attack: https://usebaret.com/showcase.

2. AGENTS (no wallet)

- Open https://usebaret.com/agents. In the playground, pick one of the eight payments an agent might make and see Baret's answer before the agent signs. "Pay aUSDC to a verified wallet" is Safe; "Pay aUSDC to a wallet with no credential" is Blocked (Cleanverse).
- Below it, "A real agent, paying from a real vault" shows a Dynamic server wallet's payments from its PaymentGuard vault, read live from the Envio indexer.
- The registry lookup on the same page answers for any address. Try the addresses at the end of this text.
- Open https://usebaret.com/review. Three payments an agent was asked to make: Qwen 3.8 Max plans, calls four read-only tools and can veto. The honest one is sent on testnet and its transaction is shown.

3. THE PASSKEY WALLET

- Open https://wallet.usebaret.com and press "Create my wallet". It is one passkey prompt, with no seed phrase and no email.
- The wallet needs a passkey provider that supports the WebAuthn PRF extension, for example Chrome with Google Password Manager or Safari with iCloud Keychain. If the provider lacks PRF, the wallet says so on that screen.
- Every signed transaction pays a small fee in testnet MON, free from the Monad faucet: https://faucet.monad.xyz. The demo sites' own "Get 100 test dUSDC" button gives the demo token.
- On https://usebaret.com/novaswap choose "Connect wallet" and pick the Baret wallet (it opens in its own window), turn on the attack and press "Sign with your wallet": the wallet's window shows Blocked and has no sign button.
- The stateless test: clear the site's storage for wallet.usebaret.com (or open a fresh browser profile with the same passkey provider) and press "Open with my passkey". The same account comes back from the passkey. Under Settings, "Bring them back here" restores the rules from their encrypted copy on Monad.
- A passkey belongs to the domain it was made on, so use wallet.usebaret.com and not another address of the same site.

4. THE BROWSER EXTENSION WALLET

- The extension is submitted to the Chrome Web Store and in review, so for now it installs from a zip. Open https://usebaret.com/install and download the zip.
- Unzip it, open chrome://extensions, turn on Developer mode and choose "Load unpacked", then pick the unzipped folder.
- Set a passphrase and write down the twelve words, then send the new address a little testnet MON from https://faucet.monad.xyz.
- On https://usebaret.com/novaswap choose "Connect wallet", then "Baret extension" under "Wallets in this browser". Turn on the attack and press "Sign with your wallet": the extension's window shows Blocked and has no sign button. With the attack off the same button is Safe and can be signed.

5. THE API AND THE SDK

- One HTTP call, no key: POST https://baret-monad-api.onrender.com/v1/analyze with a network, a policy template and an unsigned transaction. A ready-to-paste command is in the repository's README under "Call it from your app": https://github.com/HackerFetch/Baret-Metropolis#call-it-from-your-app.
- From TypeScript: npm install @baret/guard, then the four lines in https://github.com/HackerFetch/Baret-Metropolis/blob/main/packages/guard/README.md.
- Readiness of every integration (Monad RPC, Envio, Nansen, Cleanverse, the models): https://baret-monad-api.onrender.com/health/ready.

ADDRESSES TO TRY IN ANY CHECK

- 0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888: NovaSwap's look-alike drainer, on the reputation registry. Blocked.
- 0xa8f3762b03ae73cbbdb9173d3537c632628727a4: written to the registry from ScamSniffer's blacklist by the Chainlink CRE workflow. Blocked.
- 0xC448042edaC1899B023cAa0E9dA5E4a8833de873: holds a Cleanverse A-Pass (verified, tier 5). An aUSDC payment to it is Safe.
- 0x1365566191bAA9872A64AcDce963751d5343ff49: no Cleanverse credential. An aUSDC payment to it is Blocked.

WHAT IS NOT LIVE, SAID PLAINLY

- The Chainlink CRE workflow is simulated with the CRE CLI, with real writes on Monad testnet. It is not deployed to a DON.
- A plain-text message (personal_sign) is not checked: there is nothing to simulate, so the wallets show the text and sign on the user's press.
- Everything is on Monad testnet.

Transactions in our texts link to https://testnet.monadscan.com. Full instructions are in the README, "Access instructions for judges": https://github.com/HackerFetch/Baret-Metropolis#access-instructions-for-judges.
```

**Live link field:** <https://usebaret.com>, with: "No login needed. Start at /novaswap: turn on 'Suspicious swap' and press 'Enable dUSDC trading'. Full instructions, including the wallet and the extension: README, 'Access instructions for judges'."

**Traction (for the description or the pitch; H9 part 2 met on 2026-10-13):**

> During the hackathon an independent developer, the author of Venue, an order book for Cleanverse Verified Assets on Monad testnet, integrated `@baret/guard` into Venue's signing path from the npm package and its README alone (https://github.com/brutaldevvin/venue/commit/cf3371607ccccca80e099b9718a6a16f7c730803). Their own approval transaction exposed a threshold fault in Baret's unlimited-allowance rule; it was fixed the same day and they confirmed the same transaction is now Blocked. Their report: https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md.
>
> "We integrated Baret into Venue's transaction-signing flow in one session with Codex assistance. Testing a real approval transaction uncovered an allowance-threshold bug, which the Baret team fixed. We then verified that the same transaction was correctly blocked." — brutaldevvin, Venue

Say "the developer of Venue" or "brutaldevvin", never "a Metropolis team" or "another team": Venue is not entered in the hackathon (its developer said so on 2026-10-13). The page asks for "any evidence of developer interest"; another hackathon team is its example, not a condition. Their checks were verdicts on real calls, nothing was signed or sent: never say Baret stopped a live attack on Venue.

**[gate]** the two videos recorded and uploaded (H13).

---

## 2. Best use of Nansen

**The form asks:** how the project integrates the Nansen API, MCP or CLI; an optional demo video (max 2 min).

**Text:**

```text
Nansen is one of the detectors behind Baret's pre-sign verdict. Before a transaction is signed, Baret looks up the addresses it touches in Nansen's profiler: /api/v1/profiler/address/labels for the counterparty's labels (25 lookups a day on our plan), and past that budget /api/v1/profiler/address/first-funder for who funded it first. The code is in apps/server/src/sources/nansen.ts and apps/server/src/risk/detectors/reputation.ts.

The segment becomes a trust level and three findings: a label tied to scams or exploits fires KNOWN_MALICIOUS_ADDRESS, a fresh wallet and a whale counterparty are reported, and the user's rule minNansenTrustLevel blocks a counterparty below the level they chose (NANSEN_TRUST_BELOW_MINIMUM). Nansen indexes Monad mainnet, so on testnet most wallets have no record: such a wallet gets the lowest trust level ("new"), which adds nothing under the Balanced or Permissive rules and blocks under Strict.

Lookups are cached for 24 hours and fail closed: when the user's rules need Nansen and it does not answer, the check counts as failed and the verdict is Blocked.

Live proof, checked on 2026-10-11: a transfer to an address Nansen has no record of, under the Strict rules, answers Blocked with the finding NANSEN_TRUST_BELOW_MINIMUM, and the answer lists nansen among its sources with status ok (POST https://baret-monad-api.onrender.com/v1/analyze). Our script that sends all twenty demo scenarios to the live API agrees on 20 of 20 with Nansen on.
```

**Entered. Live since 2026-10-11** (D-041, D-042; `NANSEN_API_KEY` and `NANSEN_MODE=labels` on Render, E2). Checked live by Hale the same day. Labels (not only first-funder data) show for an address Nansen has on Monad mainnet; the daily budget is 25 label lookups, falling back to first-funder after that.

---

## 3. Best Use of Dynamic

**The form asks:** how the project integrates the Dynamic SDK; an optional demo video (max 2 min).

**Text:**

```text
Baret's agents hold Dynamic server wallets. The agent in our demo is a Dynamic MPC wallet (@dynamic-labs-wallet/node-evm; the code is in packages/agent-kit/src/dynamic.ts): its key is split between Dynamic and the machine the agent runs on, and every signature needs both. That wallet is authorised as the agent signer of a PaymentGuard vault on Monad. The vault's owner is a person on a Mera passkey wallet who can revoke it at any time.

This is the "agent wallets + delegated access" combination: the Dynamic wallet can pay only listed merchants, inside per-payment, hourly and daily caps the contract enforces, and Baret checks every payment before the Dynamic wallet signs it (guardedSubmit in the SDK, or baret pay from the CLI).

Judges can see it on https://usebaret.com/agents, under "A real agent, paying from a real vault": the agent 0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353, its vault 0x0A82671420114E47c672D5e8e23017DdCE850A35, and its payment read live from the Envio indexer: https://testnet.monadscan.com/tx/0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3.
```

**[gate]** none open; optional clip in `docs/submission/SCRIPTS.md` 3.3.

---

## 4. Best Mera-Powered UX on Monad

**The form asks:** how the project integrates Mera as the entire account layer; an optional demo video (max 2 min) focused on the UX.

**Text:**

```text
The Baret wallet (https://wallet.usebaret.com) has no account layer of its own: Mera is the whole of it. "Create my wallet" is one passkey ceremony, with no seed phrase, extension or email. Signing runs in a Mera session that the sidebar states ("Signing without a prompt until ..."); after 15 minutes the wallet locks itself and says so. Every request, the wallet's own vault calls included, goes through Baret's check before the sign button exists, and a Blocked request has none.

The stateless test: clear the site's storage or open a fresh profile, press "Open with my passkey", and the same account comes back from the passkey. The agents' vault, merchants and history then come back from the chain and the Envio indexer, and the rules come back from an encrypted copy on Monad (see our Many Keys entry).

Measured on a fork, not yet on a phone: four taps from the landing page to a confirmed send, plus the faucet.
```

**[gate]** H10 (3) on a real device: time the taps and seconds on the live URL and replace "measured on a fork" with that number; the stateless test with a real passkey provider. Until then the numbers above are M6's, and the text says "measured on a fork, not yet on a phone".

---

## 5. Mera: One Passkey, Many Keys

**The form asks:** how the project uses Mera in non-account work; an optional demo video (max 2 min).

**Text:**

```text
One passkey in the Baret wallet (https://wallet.usebaret.com) mints three unrelated keys, each from its own PRF salt, and only one of them is the account.

1. The account: Mera's own namespace.

2. Agent keys: sha256("baret.agent.v1:<index>"), one isolated identity per agent, handed to an agent without revealing anything about the account.

3. Sealed settings, the non-account work: a third namespace (baret.sealed.v1) derives an encryption key that never signs a transaction. It encrypts the user's rules and the names they gave their merchants, and the ciphertext is kept on Monad in a SealedStore contract (0xC094af68bE1039f70E1362C2f326542BB2DC21BB), filed under an id that is not the user's address. Baret's server relays the write and pays its gas, and it can neither read the copy nor change it. A copy written through the relay on 2026-10-10: https://testnet.monadscan.com/tx/0x719f9b6b19de3ac9ef3f5e25cea370c1a2ed23770412d051d857a7b36f86575d.

Nothing is persisted: the keys are re-derived from the passkey each time. On a new device or a fresh browser profile, "Bring them back here" asks the same passkey, decrypts the copy and restores the rules. A different passkey gets "This passkey has no encrypted copy yet."

How far it is tested: save, wipe the site's storage, restore with the same passkey, and a different passkey refused, all with a virtual passkey in a browser. The run on two physical devices with a syncing passkey has not been done by us yet.
```

**[gate]** the cross-device test on two real devices with a syncing passkey (Hale; a script cannot do it, see `docs/QA_LOG.md` session 3). Checked so far: save, wipe the site's storage, restore with the same passkey (Balanced → Strict), and a different passkey refused, with a virtual passkey on 2026-10-10. The text says so in its last paragraph; if the two-device run is done before the form is sent, replace that paragraph with its result. The transaction in the text is `verify:sealed`'s first write through the relay (block 69818977, D-039).

---

## 6. Best Integration of Cleanverse Verified Identity & Assets

**The form asks:** the compliance use case, described; a demo video (max 5 min) showing CVI credentials verified before any CVA transfer or settlement.

**Text:**

```text
Use case: Travel Rule-compliant agent payments. An AI agent pays merchants in a Cleanverse Verified Asset, and both parties of every payment must hold a valid Cleanverse Verified Identity. We use two assets and always name them apart: aUSDC, and BVUSD, a Cleanverse Verified Asset that Baret issued through Cleanverse's API.

Identity is coupled to movement in two places.

Before signing: Baret's compliance detector reads both parties' A-Pass credentials on Monad for every transfer of a verified asset and blocks one where a party has none, naming that party ("this asset only moves between verified wallets").

In the contract: CompliantPaymentGuard checks that both parties hold an active credential of at least the owner's minimum tier before it moves anything, so an unverified merchant cannot be paid whatever the agent signs. It is deployed twice: for aUSDC at 0x6E867b840f11cC1d9c6e16d1f76D737199bc907c and for BVUSD at 0xFB70F98f6dd3A84c03B36fa2eea4C5f5De9c18Af.

Settled payments, each between two verified identities:

- aUSDC, checked by the live Baret API and then settled through the aUSDC guard on 2026-10-13: 0.25 aUSDC, block 70738086, https://testnet.monadscan.com/tx/0x2052c1b9c6de8352fb7d69f9fd558e2a45552e8993371eadc00adb6b32a23942. The same payment to a wallet with no credential was Blocked before signing.
- aUSDC, the first settlement the same day, after Cleanverse's operator minted aUSDC to the owner: 0.25 aUSDC, block 70582232, https://testnet.monadscan.com/tx/0xd93efca3ee70e3e0fb7ab74a31026eebc99f00f04d7935b10104278915c66293.
- BVUSD, through the BVUSD guard on 2026-10-11: 0.25 BVUSD, block 70195328, https://testnet.monadscan.com/tx/0x2dd872a292e9d4e1d8b274081206e2bb70e37937621d728eeb9375eaa9cfaa6b.

Judges can run the check on https://usebaret.com/agents: "Pay aUSDC to a verified wallet" (0xC448042edaC1899B023cAa0E9dA5E4a8833de873, tier 5) is Safe; "Pay aUSDC to a wallet with no credential" (0x1365566191bAA9872A64AcDce963751d5343ff49) is Blocked.
```

**Settled 2026-10-11 (D-048) in BVUSD, and 2026-10-13 in aUSDC.** Two assets, two guards, two transactions: `0x2dd8...aa6b` is BVUSD (a CVA Baret issued through Cleanverse's API) and `0xd93efca3...` is aUSDC. The text may say aUSDC settled, for that transaction only; BVUSD is never called aUSDC. That run went through a local Baret server; later the same day, with aUSDC (`0xaC0893567D43C3E7e6e35a72803df05416C1f20D`) on Render's `MONAD_TESTNET_KNOWN_CONTRACTS` (14 addresses), the same pair ran through the live API: settled `0x2052c1b9c6de8352fb7d69f9fd558e2a45552e8993371eadc00adb6b32a23942` (block 70738086, ref `ausdc-live-1`), and the payment to the wallet with no credential Blocked before signing.

**[gate]** the demo video (`docs/submission/SCRIPTS.md` 3.1). Shots 4 and 5 show either settlement above (met), each named by its own asset.

---

## 7. Best Use of Envio

**The form asks:** how the project uses Envio; an optional demo video (max 2 min).

**Text:**

```text
Envio HyperIndex is Baret's memory of what agents did. The indexer follows every PaymentGuard vault the factory deploys, without a list of addresses, and Baret's ReputationRegistry. Its files are public:

- Config: https://github.com/HackerFetch/Baret-Metropolis/blob/main/indexer/config.yaml
- Schema: https://github.com/HackerFetch/Baret-Metropolis/blob/main/indexer/schema.graphql
- Handlers: https://github.com/HackerFetch/Baret-Metropolis/blob/main/indexer/src/handlers/PaymentGuardFactory.ts, https://github.com/HackerFetch/Baret-Metropolis/blob/main/indexer/src/handlers/PaymentGuard.ts, https://github.com/HackerFetch/Baret-Metropolis/blob/main/indexer/src/handlers/ReputationRegistry.ts

It keeps six entities: Vault (deposited, withdrawn, paid, payment count, agent), Merchant (caps, paused, totals per vault), Payment, VaultActivity (every owner action), ReputationEntry and ReputationChange (the registry's history, including what the Chainlink CRE workflow writes). It is hosted on Envio and read through Baret's API: /v1/audit/vault/:address, /v1/audit/owner/:address, /v1/audit/reputation/:address and /v1/audit/recent.

Three features run on it: the wallet's Activity and Home show a vault's payments; https://usebaret.com/agents lists the Dynamic agent's payments live; and the Qwen reviewer's read_vault tool reads the vault's merchants, caps and spend from it before it may approve a payment.

A new vault shows up within seconds: one opened on 2026-10-10 had its agent, caps and first payment in the indexer about 20 seconds after the transaction. See it at https://baret-monad-api.onrender.com/v1/audit/vault/0xA19A33288E9d1E3F5A0761a5b0fb7e5199c00E3C.
```

**[gate]** none open; optional clip in `docs/submission/SCRIPTS.md` 3.3.

---

## 8. Best Projects using Alchemy

**The form asks:** how the project integrates Alchemy; an optional demo video (max 2 min).

**Text:**

```text
Alchemy's Monad RPC is where Baret reads the chain for every verdict: balances before and after, contract code, the reputation registry, the Cleanverse credentials and the vaults' caps, batched, behind every POST /v1/analyze. Every live answer lists alchemy among its sources with status ok.

The trace itself (debug_traceCall, the simulation that records every internal call) goes to Monad's public RPC, which serves it on testnet; https://baret-monad-api.onrender.com/health/ready reports this as separateTraceRpc: true. We say it this way on purpose: the reads go through Alchemy, the trace does not, and the sign requests in our wallets say "Simulated on Monad before anything is signed".
```

**[gate]** none. Thin by the page's own measure; entered as it is. The sign requests once read "Simulated over Alchemy RPC"; corrected on 2026-10-12, since only the reads go through Alchemy. That note is for us and is not in the text.

---

## 9. Best workflow with CRE (Chainlink)

**The form asks:** how the project uses CRE as an orchestration layer; a demo video (max 2 min) of a successful simulation or a live deployment.

**Text:**

```text
A CRE workflow (workflows/reputation-oracle in our repository) is how threat intelligence reaches Baret's verdict. On a cron trigger it fetches ScamSniffer's public address blacklist over HTTP on every node and takes it only when the nodes agree. It then reads ReputationOracleReceiver.pending() on Monad to find the addresses the registry does not know yet, and writes them as a signed report through the forwarder into Baret's ReputationRegistry. Every pre-sign check reads that registry. The workflow is stateless and fails closed: an unreadable or malformed feed writes nothing.

It is simulated with the CRE CLI, with real writes on Monad testnet. It is not deployed to a DON.

The run the video shows (2026-10-13): ten addresses flagged in block 70574558, https://testnet.monadscan.com/tx/0x5d72012bb7bed6dbbe6ade3dd40d3a4243137b2482dc1205b4cbbd5f39fb1175. Afterwards the live Baret API blocks a transfer to the first of them, 0x17504785059123e758f1cd2bfa00ab45b613f9e5 (finding KNOWN_MALICIOUS_ADDRESS, reason SCAMSNIFFER_BLACKLIST), and passes the same transfer to an address that is not on the feed.

The first run (2026-10-10): ten addresses flagged in https://testnet.monadscan.com/tx/0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8; a transfer to the first of them, 0xa8f3762b03ae73cbbdb9173d3537c632628727a4, is still Blocked.

Workflow source: https://github.com/HackerFetch/Baret-Metropolis/tree/main/workflows/reputation-oracle.
```

**The run the video shows (2026-10-13):** tx `0x5d72012bb7bed6dbbe6ade3dd40d3a4243137b2482dc1205b4cbbd5f39fb1175` (block 70574558), ten entries; the live API blocks a transfer to the first of them, `0x17504785059123e758f1cd2bfa00ab45b613f9e5`. The text above names this run first (2026-10-13), so the evidence and the video are the same run.

**[gate]** the demo video: recorded by Ezgin on 2026-10-13 and sent to Hale; Hale edits it; Ezgin uploads it and fills in this form himself (2026-10-13).

---

## 10. Best Builds Powered by KIMI

**The form asks:** the published article's link.

**Text:** https://medium.com/@halesezin/the-model-that-is-not-allowed-to-decide-kimi-inside-a-transaction-firewall-on-monad-49e5c89db960 (published on Medium by Hale, 2026-10-13). Source: `docs/articles/kimi.md`.

**[gate]** none open: published by Hale on 2026-10-13, KIMI is live (H16).

---

## 11. Best Builds with Qwen 3.8 Max

**The form asks:** the published article's link. The main submission must be in Track 4.

**Text:** https://medium.com/@halesezin/an-agent-that-has-to-show-its-reading-before-it-can-approve-qwen-3-8-ce3a237bbfe7 (published on Medium by Hale, 2026-10-13). Source: `docs/articles/qwen.md`.

**[gate]** none open: published by Hale on 2026-10-13, Qwen is live (H16) and M11 is verified.

---

## 12. Best Community Team Project

**The form asks:** nothing beyond the profiles. "Team must indicate their campus group when completing their profile on the hackathon portal", and the group must be on the onboarded list.

**Text:** none. The answer to "Which community does your team represent?" is **42 İstanbul Blockchain Community** (from Ezgin, 2026-10-13).

**[gate]** H2: all three profiles name the group (done, Ezgin 2026-10-13); the group's name is written above; left: check on the platform that the group is on the onboarded list.
