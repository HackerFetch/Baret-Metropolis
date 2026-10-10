# Submission texts, one per prize

Ready to paste into the platform's form fields. Each entry has three parts: what the form asks (from `docs/QA_AND_DELIVERY.md` §8.1), the text itself, and the gates that must be true before it is submitted. Written by Hale (H14) on 2026-10-10 from what was checked live that day (API commit `16f5448`); Ezgin checks the facts (E8).

Rule for every entry: a prize whose feature is not working on the live URL at the freeze is not entered, and the reason goes into `docs/BOUNTIES_AND_TRACKS.md`. A **[gate]** line names what must be true first; an entry with an open gate on Monday is not submitted.

Common links, used below:

- Repository: <https://github.com/HackerFetch/Baret-Metropolis>
- Live: <https://baret-metropolis.vercel.app> (demo sites, `/agents`, `/review`, `/install`), <https://baret-wallet.vercel.app>, API <https://baret-monad-api.onrender.com>
- Access instructions for judges: the README's "Access instructions for judges"

---

## 1. Main track: Trust, Identity & AI Infrastructure

**The form asks:** the project logo (`docs/submission/baret-logo-1024.png`), the public repository, a technical demo video (max 3 min), a pitch video (max 2 min), a live link with access instructions.

**Text (project description):**

> Baret is a pre-sign check for Monad that wallets, dapps and AI agents call before they sign. One call (`POST /v1/analyze`, or the `@baret/guard` SDK) simulates the transaction on Monad with `debug_traceCall`, runs nine detectors over the trace (allowances, permits, unknown and risky contracts, borrowed code, loss against balance, x402 payment shape, an on-chain reputation registry, Cleanverse identity, Nansen labels) and applies the signer's own policy of 25 rules. The answer is Safe, Caution or Blocked, with reasons. It fails closed: a check that cannot finish blocks.
>
> For agents, Baret adds PaymentGuard, an on-chain vault with per-merchant caps per payment, hour and day and an owner's kill switch, and `@baret/agent-kit`, a signer that cannot sign past the verdict. A Qwen 3.8 Max reviewer can veto an agent payment that does not match its intent, and KIMI explains every verdict in plain words without being able to change it.
>
> Three applications on the layer show it end to end: a passkey wallet (Mera), a browser extension that refuses a Blocked request in its own window, and six demo sites, each with an honest version and an attack. The reputation registry is filled from ScamSniffer's blacklist by a Chainlink CRE workflow; vault activity is indexed by Envio.
>
> Everything is live on Monad testnet. `verify:demo` sends all twenty demo scenarios to the live API and agrees on 20 of 20.

**Live link field:** <https://baret-metropolis.vercel.app>, with: "No login needed. Start at /novaswap: turn on 'Suspicious swap' and press 'Enable dUSDC trading'. Full instructions, including the wallet and the extension: README, 'Access instructions for judges'."

**[gate]** the two videos recorded and uploaded (H13); the traction sentence of the pitch only if H9 (2) has evidence.

---

## 2. Best use of Nansen

**The form asks:** how the project integrates the Nansen API, MCP or CLI; an optional demo video (max 2 min).

**Text:**

> Nansen is one of the detectors behind Baret's pre-sign verdict. Before a transaction is signed, Baret looks up the addresses it touches in Nansen's profiler: `/api/v1/profiler/address/labels` for the counterparty's labels, or `/api/v1/profiler/address/first-funder` for who funded it first (`apps/server/src/sources/nansen.ts`, `NANSEN_MODE`). The labels become a trust level and three findings (`apps/server/src/risk/detectors/reputation.ts`): a label tied to scams or exploits makes `KNOWN_MALICIOUS_ADDRESS` fire, a fresh wallet and a whale counterparty are reported, and the user's rule `minNansenTrustLevel` blocks a counterparty below the level they chose (`NANSEN_TRUST_BELOW_MINIMUM`). Lookups are cached and fail closed: when the user's rules need Nansen and it does not answer, the check counts as failed and the verdict is Blocked.

**[gate] — not entered as things stand.** Nansen is off on the live API (`/health/ready` shows `nansen: false`; no credits, E2). Enter only if E2 lands before the freeze **and** H10 (4) sees a label on a live sign request; otherwise write "❌ Dropped: no credits, not live" in `docs/BOUNTIES_AND_TRACKS.md`.

---

## 3. Best Use of Dynamic

**The form asks:** how the project integrates the Dynamic SDK; an optional demo video (max 2 min).

**Text:**

> Baret's agents hold Dynamic server wallets. The agent in our demo is a Dynamic MPC wallet (`@dynamic-labs-wallet/node-evm`, `packages/agent-kit/src/dynamic.ts`): its key is split between Dynamic and the machine the agent runs on, and every signature needs both. That wallet is authorised as the agent signer of a PaymentGuard vault on Monad. The vault's owner is a person on a Mera passkey wallet who can revoke it at any time. This is the "agent wallets + delegated access" combination: the Dynamic wallet can pay only listed merchants, inside per-payment, hourly and daily caps the contract enforces, and Baret checks every payment before the Dynamic wallet signs it (`guardedSubmit`, or `baret pay` from the CLI).
>
> Judges can see it on <https://baret-metropolis.vercel.app/agents>, "A real agent, paying from a real vault": the agent `0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353`, its vault `0x0A82671420114E47c672D5e8e23017DdCE850A35`, and its payment read live from the Envio indexer (tx `0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3`).

**[gate]** none open; optional clip in `docs/submission/SCRIPTS.md` 3.3.

---

## 4. Best Mera-Powered UX on Monad

**The form asks:** how the project integrates Mera as the entire account layer; an optional demo video (max 2 min) focused on the UX.

**Text:**

> The Baret wallet (<https://baret-wallet.vercel.app>) has no account layer of its own: Mera is the whole of it. "Create my wallet" is one passkey ceremony, with no seed phrase, extension or email. Signing runs in a Mera session that the sidebar states ("Signing without a prompt until …"); after 15 minutes the wallet locks itself and says so. Every request, the wallet's own vault calls included, goes through Baret's check before the sign button exists, and a Blocked request has none.
>
> The stateless test passes: clear the site's storage or open a fresh profile, press "Open with my passkey", and the same account comes back from the passkey. The agents' vault, merchants and history then come back from the chain and the Envio indexer, and the rules come back from an encrypted copy on Monad (see the Many Keys entry). Measured on a fork: four taps from the landing page to a confirmed send, plus the faucet.

**[gate]** H10 (3) on a real device: time the taps and seconds on the live URL and replace "measured on a fork" with that number; the stateless test with a real passkey provider. Until then the numbers above are M6's.

---

## 5. Mera: One Passkey, Many Keys

**The form asks:** how the project uses Mera in non-account work; an optional demo video (max 2 min).

**Text:**

> One passkey in the Baret wallet mints three unrelated keys, each from its own PRF salt, and only one of them is the account. (1) **The account:** Mera's own namespace. (2) **Agent keys:** `sha256("baret.agent.v1:<index>")`, one isolated identity per agent, handed to an agent without revealing anything about the account (D-032). (3) **Sealed settings:** a third namespace derives an encryption key that never signs a transaction. It encrypts the user's rules and the names they gave their merchants, and the ciphertext is kept on Monad in a `SealedStore` contract (`0xC094af68bE1039f70E1362C2f326542BB2DC21BB`), filed under an id that is not the user's address. Baret's server relays the write and pays its gas, and it can neither read the copy nor change it (D-039).
>
> Nothing is persisted: the keys are re-derived from the passkey each time. On a new device or a fresh browser profile, "Bring them back here" asks the same passkey, decrypts the copy and restores the rules. A different passkey gets "This passkey has no encrypted copy yet."

**[gate]** the cross-device test on two real devices with a syncing passkey (Hale; a script cannot do it, see `docs/QA_LOG.md` session 3). Checked so far: save, wipe the site's storage, restore with the same passkey (Balanced → Strict), and a different passkey refused, with a virtual passkey on 2026-10-10.

---

## 6. Best Integration of Cleanverse Verified Identity & Assets

**The form asks:** the compliance use case, described; a demo video (max 5 min) showing CVI credentials verified before any CVA transfer or settlement.

**Text:**

> Use case: Travel Rule-compliant agent payments. An AI agent pays merchants in aUSDC, a Cleanverse Verified Asset, and both parties of every payment must hold a valid Cleanverse Verified Identity. Identity is coupled to movement in two places. **Before signing:** Baret's compliance detector reads both parties' A-Pass credentials on Monad for every aUSDC transfer and blocks one where a party has none, naming that party ("this asset only moves between verified wallets"). **In the contract:** `CompliantPaymentGuard` (`0x6E867b840f11cC1d9c6e16d1f76D737199bc907c`) checks that both parties hold an active credential of at least the owner's minimum tier before it moves anything, so an unverified merchant cannot be paid whatever the agent signs.
>
> Judges can run it on <https://baret-metropolis.vercel.app/agents>: "Pay aUSDC to a verified wallet" (`0xc448042EdAC1899B023CaA0E9Da5e4a8833de873`, tier 5) is Safe; "Pay aUSDC to a wallet with no credential" (`0x1365566191bAA9872A64AcDce963751d5343ff49`) is Blocked.

**[gate]** the demo video (`docs/submission/SCRIPTS.md` 3.1). Shots 4 and 5 (a live settlement) only if E6 has settled one; otherwise the text and the video stop at the check and the contract's `canPay`, and never show a settlement.

---

## 7. Best Use of Envio

**The form asks:** how the project uses Envio; an optional demo video (max 2 min).

**Text:**

> Envio HyperIndex is Baret's memory of what agents did. The indexer (`indexer/`: `config.yaml`, `schema.graphql`, handlers) follows every PaymentGuard vault the factory deploys, without a list of addresses, and Baret's ReputationRegistry. It keeps six entities: `Vault` (deposited, withdrawn, paid, payment count, agent), `Merchant` (caps, paused, totals per vault), `Payment`, `VaultActivity` (every owner action), `ReputationEntry` and `ReputationChange` (the registry's history, including what the Chainlink CRE workflow writes). It is hosted on Envio and read through Baret's API (`/v1/audit/vault/:address`, `/owner/:address`, `/reputation/:address`, `/recent`).
>
> Three features run on it: the wallet's Activity and Home show a vault's payments; `/agents` lists the Dynamic agent's payments live; and the Qwen reviewer's `read_vault` tool reads the vault's merchants, caps and spend from it before it may approve a payment. A new vault shows up within seconds: one opened on 2026-10-10 had its agent, caps and first payment at `/v1/audit/vault/0xA19A33288E9d1E3F5A0761a5b0fb7e5199c00E3C` about 20 s after the transaction.

**[gate]** none open; optional clip in `docs/submission/SCRIPTS.md` 3.3.

---

## 8. Best Projects using Alchemy

**The form asks:** how the project integrates Alchemy; an optional demo video (max 2 min).

**Text:**

> Alchemy's Monad RPC is where Baret reads the chain for every verdict: balances before and after, contract code, the reputation registry, the Cleanverse credentials and the vaults' caps, batched, behind every `POST /v1/analyze`. The sign requests in the wallet and the extension say so on screen ("Simulated over Alchemy RPC on Monad"). The trace itself goes to Monad's public RPC, which serves `debug_traceCall` on testnet.

**[gate]** none. Thin by the page's own measure; entered as it is.

---

## 9. Best workflow with CRE (Chainlink)

**The form asks:** how the project uses CRE as an orchestration layer; a demo video (max 2 min) of a successful simulation or a live deployment.

**Text:**

> A CRE workflow (`workflows/reputation-oracle`) is how threat intelligence reaches Baret's verdict. On a cron trigger it fetches ScamSniffer's public address blacklist over HTTP on every node and takes it only when the nodes agree. It then reads `ReputationOracleReceiver.pending()` on Monad to find the addresses the registry does not know yet, and writes them as a signed report through the forwarder into Baret's `ReputationRegistry`. Every pre-sign check reads that registry. The workflow is stateless and fails closed: an unreadable or malformed feed writes nothing.
>
> Simulated with the CRE CLI with a real write on Monad testnet: ten addresses flagged in tx `0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8`. Afterwards the live API blocks a transfer to the first of them (`0xa8f3762b03ae73cbbdb9173d3537c632628727a4`, `KNOWN_MALICIOUS_ADDRESS`, reason `SCAMSNIFFER_BLACKLIST`, still Blocked on 2026-10-10) and passes the same transfer to an address not on the feed.

**[gate]** the demo video (`docs/submission/SCRIPTS.md` 3.2; needs Ezgin's `workflows/.env` and `cre login`).

---

## 10. Best Builds Powered by KIMI

**The form asks:** the published article's link.

**Text:** the link to `docs/articles/kimi.md` once published.

**[gate]** published by Hale; Meriç's fact check (`tasks/FOR_MERIC.md`). KIMI is live (H16).

---

## 11. Best Builds with Qwen 3.8 Max

**The form asks:** the published article's link. The main submission must be in Track 4.

**Text:** the link to `docs/articles/qwen.md` once published.

**[gate]** published by Hale; Meriç's fact check. Qwen is live (H16) and M11 is verified.

---

## 12. Best Community Team Project

**The form asks:** nothing beyond the profiles. "Team must indicate their campus group when completing their profile on the hackathon portal", and the group must be on the onboarded list.

**Text:** none. The answer to "Which community does your team represent?" is **[H2: the group's name]**.

**[gate]** H2: all three profiles name the group; needs platform access (E1 (1)).
