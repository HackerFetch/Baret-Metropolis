# Handoff: Ezgin's second machine (npm, Cleanverse, Chainlink)

Written 2026-10-11 by the agent on Ezgin's first machine, for the agent that picks up on another computer. Read `CLAUDE.md` first, as always, then this file. It says what a new session cannot find in the repository: how Ezgin works, what the first machine had that this one may not, where the three tasks stopped and what "done" means for each. No secret is in this file; none may be added to it.

`docs/HANDOFF.md` is a different thing (Meriç's local notes, never committed). Do not confuse the two.

## 1. Working with Ezgin (the first machine's memory, which does not travel)

- **Chat in Turkish, plain words.** When Ezgin has to do something by hand, give numbered clicks and say what they should see after each. Everything in the repository stays English.
- **No AI credit in commits or pull requests.** No `Co-Authored-By`, no "Generated with" line: commits read as Ezgin's own. This is Ezgin's standing rule and it overrides the line in `CLAUDE.md`.
- **Nothing goes to mainnet.** Ezgin ruled it out. Keep mainnet out of plans, pitch and submission texts.
- **Ezgin merges.** Branch from fresh `main`, code and docs together, `pnpm check`, commit, push, open the pull request with `gh`, and say it is ready. Never merge yourself. Push only as part of a pull request.
- **Do the whole list.** When Ezgin says "do everything you can", do all of it and stop only for what needs Ezgin's own hands (an account, a dashboard, a payment). Say once what is blocked and move on.
- **Do not press with the freeze.** The platform closes Wed 14 Oct 2026, 06:59 (GMT+3). Plan against that, give the full recommendation and let Ezgin cut.
- **The extension is a real wallet**, never "a sample" or "a wrapper around another wallet".
- **Verify on the live system.** Unit tests are not proof when something can be run against Monad testnet or the live API: run it and report what came back. After a merge, wait until `https://baret-monad-api.onrender.com/health` shows the merged commit. Render sometimes needs **Manual Deploy → Deploy latest commit**.
- **Secrets:** never print a key or a token, never paste one into chat, never commit one. Read them into commands with `$(cat file)`.
- Sending transactions on Monad testnet from Ezgin's test wallets is allowed. A permission prompt may still ask; if a broadcast is refused, ask Ezgin to say so in chat.

## 2. Where the project stands

`main` at `45e0e50` (pull requests #58 to #94 merged). Live: API `https://baret-monad-api.onrender.com` (Render, Starter plan), showcase `https://baret-metropolis.vercel.app`, wallet `https://baret-wallet.vercel.app`. Vercel builds `main` only.

Built and verified live on 2026-10-11: the analysis engine (20 of 20 demo scenarios), typed-data reading, MCP (`POST /mcp`), sealed settings, Nansen in `labels` mode, x402 settled for real (`GET /demo/paywall`, D-046), "Sign with your wallet" on all six demo sites, the wallet window signing typed messages, the extension as a real wallet with its lists (D-047). The one list of what is and is not real: `docs/SYSTEM_GAPS.md`. Every endpoint: `docs/API_REFERENCE.md`. Decisions with their reasons: `docs/DECISIONS.md` (latest D-047). The plan for all three people: `docs/ROADMAP.md`, "Final week — the board".

Open on Ezgin's line besides the three tasks below: a tidy of `tasks/FOR_EZGIN.md` (old items never ticked), the edge middleware for G-17 (after the recording; measured hops are in `docs/SYSTEM_GAPS.md`), and Ezgin's own account steps (E1, E7, E8 in `tasks/FOR_EZGIN.md`).

### 2.1 State on 2026-10-13, evening (read this before section 2's older lines)

`main` at `f621ccc` (pull requests up to #119). The live API runs the D-049 fix and has 14 known contracts. Latest decision: D-049. The sites are `https://usebaret.com` and `https://wallet.usebaret.com`.

Done on the first machine on 2026-10-13, do not repeat:

- **Cleanverse, aUSDC.** Cleanverse's operator minted 20 aUSDC to the deploy wallet. Through the live API the Dynamic agent paid 0.25 aUSDC to the verified merchant through the aUSDC guard `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c` (`0x2052c1b9c6de8352fb7d69f9fd558e2a45552e8993371eadc00adb6b32a23942`), and the payment to the wallet with no credential was Blocked before signing. `docs/CONTRACTS.md` 4.3. aUSDC may be named for the aUSDC transactions only; BVUSD is never called aUSDC.
- **The first outside integration.** An independent developer (`brutaldevvin`, not a hackathon participant) wired `@baret/guard` into their project Venue. Links, quote and wording rules: README "Used outside the team", `docs/submission/TEXTS.md` section 1. H9 part 2 is met.
- **D-049.** Their approval of 2^255 - 1 was read as bounded; "unlimited" now starts at the largest uint96. Checked live.
- **G-17** (edge middleware and the rate limit behind the sites) is closed.

Open, and yours on this machine:

1. **Publish the SDK again (0.1.3).** `packages/guard/README.md` gained "What the SDK leaves to you" and full links in place of repository paths; npm still shows 0.1.2's README. Same steps as section 4.
   - 2026-10-13, second machine: the versions are raised to 0.1.3 on branch `sdk-0.1.3`, which also carries item 4's code, so 0.1.3 is no longer README only. Left: Ezgin merges, runs `npm login` and the three `npm publish` commands (`docs/DEPLOYMENT.md`), then a clean install is checked against the live API.
2. **Two things to write into the repository once Ezgin gives them:** the links of the published KIMI and Qwen articles (`docs/submission/TEXTS.md` sections 10 and 11, then tick H12), and the campus group's name (section 12, H2). Ezgin says all three profiles name the group; that the group is on the onboarded list is not checked.
   - 2026-10-13, second machine: done. Both links are in `docs/submission/TEXTS.md` sections 10 and 11 and H12 is ticked; the group is 42 İstanbul Blockchain Community (section 12). Still not checked: that the group is on the onboarded list.
3. **Ezgin's own steps:** H3 (the MetaMask rehearsal), the Chainlink form once Hale returns the clip, E17 (the Chrome Web Store URL when Google publishes), and two confirmations never answered: is Hale on the platform team (E1), and did `~/.baret` reach this machine (E7)? Tick each on a yes.
   - 2026-10-13, second machine: both confirmations are a yes (Hale is on the platform team; `~/.baret` is on this machine and Ezgin keeps a backup on a private disk), so E1 and E7 are ticked. 0.1.3 is merged (#121); publishing it is Ezgin's step. H3 and the other tests come after that, by Ezgin's word.
4. **Not built, from Venue's report** (`https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md`): a helper in `@baret/guard` that refuses an expired verdict or one for another chain; error bodies kept on a non-2xx answer. Documented as the caller's job for now.
   - 2026-10-13, second machine: built on branch `sdk-0.1.3`. `verdictRefusal(verdict, { chainId })` answers `"expired"`, `"wrong_chain"` or `null`, and `GuardUnreachableError.body` keeps what a non-2xx answer said (`packages/guard/src/guard.ts`, tests in `guard.test.ts`). `evaluate` and `AgentWallet` do not call the helper themselves. Not built from the same report: structured error codes and retry hints, a viem example, a multi-party example.

## 3. What this machine needs before any of the three tasks

1. The repository: `git clone https://github.com/HackerFetch/Baret-Metropolis`, then `pnpm install` (pnpm 11, Node 22.22 or newer). On a slow network: `pnpm install --fetch-timeout 300000 --network-concurrency 4`.
2. `gh auth status` must show Ezgin's account (`Aeztrest`), and `git config user.name` / `user.email` must be Ezgin's, or the agent will not know whom it works with.
3. Foundry (`cast`, `forge`) for anything on-chain: `curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`.
4. The folder `~/.baret/` from the first machine, copied by Ezgin over a private channel (never through the repository, never through chat). Mode 700, files 600. What each task needs from it:

| File | What it is | Needed for |
|---|---|---|
| `deployer.key`, `deployer.address` | The testnet deploy wallet `0x5aE13F1028144842f0384d09091067D6184F8197`: owner of the registry, its receiver and `CompliantPaymentGuard`; holds the A-Pass | Cleanverse, Chainlink |
| `dynamic.env`, `agent-wallet.json` | The Dynamic server wallet `0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353`, the agent of the guards | Cleanverse (`baret pay`) |
| `cleanverse.env` | `CLEANVERSE_APP_ID`, `CLEANVERSE_API_KEY` from the bounty page | Cleanverse, only if the authenticated API is used |
| `known-contracts.txt` | The value of `MONAD_TESTNET_KNOWN_CONTRACTS` on Render | Only when a contract is added to the list |
| `playground-agent.key` | A test wallet with MON and test USDC | Paying in checks (`verify:x402`) |

Without the folder, npm can still be done; Cleanverse and Chainlink cannot be finished.

Machine facts that cost time on the first one and may apply here: no `jq` or Docker was installed (use `gh --jq`, `node -e`); in zsh never name a variable `path`, and an unmatched glob aborts the line; `pkill -f` can kill the shell that runs it (kill by port instead); the public node `https://testnet-rpc.monad.xyz` allows 15 requests a second, so a local server pointed at it answers many checks fail-closed. Judge real behaviour against the live API.

## 4. Task A: publish the SDK to npm

**State:** `@baret/guard`, `@baret/llm` and `@baret/agent-kit` are ready (`docs/DEPLOYMENT.md`, "Publishing the SDK to npm"). In the workspace they resolve to TypeScript sources; a published copy is built JavaScript with types (`tsconfig.build.json`, `publishConfig`, `prepack`). The three tarballs were installed in an empty project and ran against the live API. Nothing is published. Since then agent-kit gained `payX402` and `baret x402` (D-046), which is in `main`.

**Only Ezgin can:** create the npm organisation `baret` (`https://www.npmjs.com/org/create`, the free plan allows public packages) and run `npm login` in a real terminal (in Claude Code: `! npm login`).

- 2026-10-12: 0.1.1 is published the same way (the READMEs on the npm pages now say how to install; `@baret/llm` has one). The next version: `docs/DEPLOYMENT.md`.

**Then the agent:**
1. `npm whoami` and `npm org ls baret` to confirm the login and the organisation.
2. If `@baret` is taken, stop and ask Ezgin for the new scope before publishing anything: the scope then changes in every `package.json` and import of the three packages.
3. From fresh `main`, in this order (agent-kit depends on the other two): `pnpm --filter @baret/guard publish`, `pnpm --filter @baret/llm publish`, `pnpm --filter @baret/agent-kit publish`. A one-time password is Ezgin's to type.
4. Prove it: in an empty folder outside the repository, `npm install @baret/agent-kit`, run the smallest call from `packages/guard/README.md` against the live API and `npx baret policy list`.
5. One pull request: remove the "not published" sentences in `packages/guard/README.md`, `packages/agent-kit/README.md` and the `/agents` page (`packages/content/src/showcase/agents.content.ts`, a file of Meriç's: change only those sentences and leave a note in `tasks/FOR_MERIC.md`), update `docs/DEPLOYMENT.md`, tick the task in `tasks/FOR_EZGIN.md`, and tell Hale in `tasks/FOR_HALE.md` that the install line is real.

**Done means:** `npm view @baret/agent-kit version` answers, and a clean install runs against the live API.

- 2026-10-11, from the second machine: done. The three are on npm as 0.1.0 (account `buildonbaret`, owner of the organisation `baret`), built from `main` at `d35094a`. `npm view @baret/agent-kit version` answers `0.1.0`; a clean `npm install @baret/agent-kit` ran the smallest call against the live API (`blocked`, `KNOWN_MALICIOUS_ADDRESS`) and `npx baret policy list`. Ezgin ran the three `npm publish` commands by hand on the tarballs from `pnpm pack`. The second machine is Windows: `~/.baret/` is not at that path there, and the notes for the next version are in `docs/DEPLOYMENT.md`.

## 5. Task B: Cleanverse, one real settlement

> **Done on the first machine, 2026-10-11 (D-048). Do not repeat it.** aUSDC could not be had (the sandbox's faucet and deposit routes fail), so a CVA of our own was issued through `POST /atoken/launch` (`BVUSD`, `0xCd829D44Dced8B47Ab0E4B08F1527cD2734E8ed2`), a second guard deployed for it (`0xFB70F98f6dd3A84c03B36fa2eea4C5f5De9c18Af`), and both payments run: settled `0x2dd872a292e9d4e1d8b274081206e2bb70e37937621d728eeb9375eaa9cfaa6b`, and blocked before signing. What is left is Ezgin's step on Render (two addresses on `MONAD_TESTNET_KNOWN_CONTRACTS`) and one run against the live API. **2026-10-13:** aUSDC arrived (Cleanverse's operator minted 20 to the deploy wallet) and 0.25 aUSDC settled through the aUSDC guard, `0xd93efca3ee70e3e0fb7ab74a31026eebc99f00f04d7935b10104278915c66293`. Do not repeat that either. The rest of this section is the history.

**The prize asks** for identity verification "structurally coupled to asset movement": the credential (CVI, the A-Pass) checked before any transfer of the compliant asset (CVA, here aUSDC), a real compliance use case and a video of up to five minutes. Full text: `docs/QA_AND_DELIVERY.md` §8.1.

**What exists** (D-034, `docs/CONTRACTS.md` §4.3, gap G-07):
- On Monad testnet: A-Pass `0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9`, policy `0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd`, aUSDC `0xaC0893567D43C3E7e6e35a72803df05416C1f20D` (6 decimals, wraps the test USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3`).
- `CompliantPaymentGuard` at `0x6E867b840f11cC1d9c6e16d1f76D737199bc907c`: owner the deploy wallet, agent the Dynamic wallet. Its `pay` refuses a merchant with no credential. Fork-tested against the real contracts; it is on the server's known-contracts list.
- The deploy wallet holds an A-Pass (tier 25, active) and approved the guard for 5 aUSDC.
- The server blocks a transfer to a wallet without a credential and names the party (2 of the 20 `verify:demo` scenarios).

**The one thing missing: aUSDC.** The deploy wallet holds none. Every mint on the chain comes from Cleanverse's operator `0xbd8428761efb5384c4945d16de56817caa6903df` (through `depositToCore`); the public sandbox routes `register_data` and `query_deposit_address` on `https://uatapi.cleanverse.com/api/skills` answered "Internal server error" on every chain; deposits appear to come only from registered institutions. The three guides on the bounty page describe issuing a CVA of our own, which needs registration through the authenticated API (`uatapi.cleanverse.com/api/cooperate/...`, a request body encrypted with AES, headers `api-id` and `X-Request-ID`) whose format is in documentation behind an invitation code (`docs.cleanverse.com`). **Do not guess or brute-force that format or the credentials**: it was refused on the first machine, rightly.

**Ways forward, best first:**
1. Ezgin asks the sponsor for 20 test aUSDC to `0x5aE13F1028144842f0384d09091067D6184F8197` (Discord `https://discord.gg/f7rEpawH`, Telegram `https://t.me/TheCleanverseGroup`), or for the invitation code to the documentation.
2. If Ezgin has the documentation or an example request on this machine, read it and follow it exactly.
3. Check again whether the sandbox deposit routes answer now: `curl -s https://uatapi.cleanverse.com/api/skills/query_chain_config`, then `POST /query_deposit_address`. If they do, deposit test USDC as they describe.

**Once the wallet holds aUSDC:**
1. `cast call 0xaC0893567D43C3E7e6e35a72803df05416C1f20D "balanceOf(address)(uint256)" 0x5aE13F1028144842f0384d09091067D6184F8197 --rpc-url https://testnet-rpc.monad.xyz`
2. Fund the guard as `docs/CONTRACTS.md` §4.3 describes (the allowance is already there).
3. With the Dynamic agent (`set -a; . ~/.baret/dynamic.env; set +a`): `pnpm --filter @baret/agent-kit baret pay --vault 0x6E867b840f11cC1d9c6e16d1f76D737199bc907c --merchant 0xC448042edaC1899B023cAa0E9dA5E4a8833de873 --amount 250000 --ref demo-1`. That merchant is verified: the payment must settle.
4. The same to `0x1365566191bAA9872A64AcDce963751d5343ff49` (no credential): Baret must block it before signing and name the party; on the chain it would revert with `NotVerified`.
5. Record both hashes in `docs/CONTRACTS.md` §4.3, close G-07 in `docs/SYSTEM_GAPS.md`, tick E6 in `tasks/FOR_EZGIN.md`, and tell Hale in `tasks/FOR_HALE.md`: this pair is the Cleanverse part of the video.

**If no aUSDC can be had:** the prize is entered with what is real, and it is said plainly: the server's check before signing, the deployed guard and its fork test. Never claim a settlement that did not happen.

A trap from the first machine: `verify:demo --from` must be a wallet **without** an A-Pass, or the "no credential" scenario answers Safe, correctly, and the script prints 19 of 20. Use `0x5AE98770795957F9a376083afcb775672FbD2C93`, not the deploy wallet.

## 6. Task C: Chainlink CRE, the reputation oracle on a DON

**What exists** (`workflows/README.md`, `docs/CONTRACTS.md`): the workflow `workflows/reputation-oracle` reads a threat feed and writes reports to the `ReputationRegistry` through a receiver contract. It runs in the CRE simulator against Monad testnet (`workflows/simulate.sh`, and `--broadcast` wrote real reports through the mock forwarder; the first is in `docs/CONTRACTS.md`). Forwarders on Monad testnet: the real one `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`, the simulator's mock `0xB9F79d863261869B234c481D1f9A7af84AeAd192`. The receiver listens to the real forwarder; `simulate.sh --broadcast` points it at the mock one only for the length of a run and puts it back, also on failure.

**What is missing:** deployment to a DON. It needs CRE Early Access on Ezgin's Chainlink account. On the first machine `cre` was logged in and `cre account access` showed deploy access not enabled.

**On this machine:**
1. Install the CRE CLI (`docs.chain.link/cre`; it lands in `~/.cre/bin`, so `export PATH="$HOME/.cre/bin:$PATH"`) and Bun. Ezgin runs `cre login` in a real terminal.
2. `cre account access`. Without deploy access, stop here: only Chainlink grants it, and Ezgin asks through the form the command points to or the hackathon's Chainlink channel. The prize's own line allows a simulation ("even a simulation recording can be acceptable"), so the entry stands on the simulator run and its on-chain report.
3. With access: link the workflow owner key (the deploy wallet), deploy the `production-settings` target (`workflows/reputation-oracle/config.production.json`, `workflow.yaml`), keep `workflowOwner` on the receiver equal to that key's address, and leave the receiver on the real forwarder.
4. Prove it: one report written by the DON (a transaction through the real forwarder that changes a registry entry), then `POST /mcp` `address_reputation` or a `/v1/analyze` on that address showing the flag.
5. Record the workflow id and the transaction in `workflows/README.md` and `docs/CONTRACTS.md`, update the Chainlink row in `docs/BOUNTIES_AND_TRACKS.md` and the board, and tell Hale.

- 2026-10-11, from the second machine: the CRE CLI (v1.38.0) and Bun are installed and `cre login` is done. `cre whoami` shows "Deploy Access: Not enabled", so step 2 is where it stops. Ezgin asked for access with `cre account access` the same day. The simulator runs here, dry and with `--broadcast`: transaction `0xe65521c7ea9a2fd7f5ae686ff8ffda6def6222c3794bfbe224bf3784b36c7c09` (block 70195240) wrote ten entries, the live API blocks a transfer to the first of them, and the receiver is back on the real forwarder (`workflows/README.md`, "Second recorded run").
- 2026-10-12: Chainlink wrote back. Simulation is open; deploying on testnet or mainnet needs a mutual NDA and a call about commercial terms. Ezgin decided: the entry is the simulation, nothing is signed before the deadline, deployment is for after the event. Task C ends here; steps 3 to 5 are not done.

**To run the simulator here:** `MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz workflows/simulate.sh`; for `--broadcast` also `CRE_ETH_PRIVATE_KEY="$(cat ~/.baret/deployer.key)"`.

- 2026-10-12, Chrome Web Store: the listing's answers (`docs/STORE_LISTING.md`) and the privacy policy (`docs/PRIVACY.md`) are written, and the unused `notifications` permission is out of the manifest. Ezgin submits the form by hand; E17 stays open until Google publishes.
- 2026-10-12, later: Ezgin submitted the extension. The dashboard reads "Pending review" and warned of an in-depth review (broad host permissions), so the listing may not be public by the deadline. Texts say "submitted for review".
- 2026-10-12, before judging: six contracts added to the receiver's protected list (`0x6a52aa7afdca8ab299f2ad0f768e76d259a2b7a945e3da431dbe70765e1c3e14`), the demo agent topped up to 11.42 MON, the tester run's server changes checked on the live API. 0.1.2 of the three npm packages is built (tarballs in `~/baret-npm-0.1.2/`); Ezgin publishes.

## 7. When a task ends

Each task ends with: the proof (a command and what it printed, a transaction hash), the docs named above changed in the same pull request, the task ticked in `tasks/FOR_EZGIN.md` with a one-line result, its line on the board in `docs/ROADMAP.md` updated, and a note for whoever is now unblocked. Add a dated line under the task in this file too, so the first machine's agent finds it.
