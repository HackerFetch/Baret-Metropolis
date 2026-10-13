# Baret workflows (Chainlink CRE)

One Chainlink Runtime Environment project with one workflow, `reputation-oracle`. It is the part of Baret that brings threat intelligence on-chain: the analysis server reads `ReputationRegistry` before every signature, and this workflow is what fills it.

## What the workflow does

On a cron schedule, in this order:

1. **Fetch** an external threat feed over HTTP on every node (ScamSniffer's public address blacklist, a JSON array). The DON takes the answer only when the nodes agree on it.
2. **Select** the window of the feed this run is responsible for. The workflow keeps no state: time walks it through the sorted feed, one window per rotation, and around again.
3. **Read** the chain: `ReputationOracleReceiver.pending(candidates)` returns the candidates the registry does not know yet and that are not on the protected list. An entry is written once and an existing one is never overwritten by the feed.
4. **Write** a signed report, `abi.encode(address[], uint8[], string[])`, through the CRE forwarder to the receiver, which passes it to `ReputationRegistry.onReport`.

Nothing is written when the feed cannot be read, is not a JSON array, or has too many malformed entries (fail-closed: a blocklist is extended only on data every node agrees on).

| File | Role |
|---|---|
| `project.yaml` | Targets and the Monad RPC (from `MONAD_TESTNET_RPC_URL`) |
| `reputation-oracle/main.ts` | Trigger, handler and the capability calls |
| `reputation-oracle/src/feed.ts` | Config check, feed parsing, window selection, ABI encoding (unit tested) |
| `reputation-oracle/config.*.json` | Schedule, feed URL, receiver, gas limit, window size, severity and reason code |
| `simulate.sh` | Runs the simulator; guards the receiver around a broadcast |

## Why there is a receiver contract

A CRE forwarder only delivers to a contract that answers ERC-165 for `IReceiver`, and it delivers the reports of every workflow on the network. `ReputationOracleReceiver` (`contracts/src`) answers ERC-165, accepts reports only from the forwarder and only from workflows owned by one address, refuses any report that names a protected contract, and is the registry's `forwarder`. Addresses: `docs/CONTRACTS.md` section 3.4.

## Running it

Needs the CRE CLI (`cre login`), Bun 1.2.21 or later, and Foundry's `cast` for a broadcast.

```bash
pnpm install
cp workflows/.env.example workflows/.env   # then fill it in; never committed

# Dry run: real feed, real chain read, no transaction
./workflows/simulate.sh

# One real write on Monad testnet
./workflows/simulate.sh --broadcast
```

The simulator delivers through the network's mock forwarder, which checks no signatures, so anyone can send a report through it. The receiver therefore listens to the real forwarder; `simulate.sh --broadcast` points it at the mock one only for the length of the run and restores the real forwarder and the workflow-owner check afterwards, also when the run fails.

Unit tests: `pnpm exec vitest run --project reputation-oracle`. Contract tests: `forge test --match-contract ReputationOracleReceiver`.

## Deploying to a DON

Not done, and not planned before the deadline: deployment needs deploy access on the Chainlink account, which Chainlink grants after a mutual NDA and commercial terms (their answer of 2026-10-12, below). When access is granted, link the workflow owner key, deploy the `production-settings` target, and keep `workflowOwner` on the receiver equal to that key's address.

## Recorded run (2026-10-07, Monad testnet)

`./workflows/simulate.sh --broadcast`, CRE CLI v1.37.0, SDK 1.23.0:

```
[SIMULATION] Running trigger trigger=cron-trigger@1.0.0
[USER LOG] Threat feed: 2530 addresses, window 167/253 holds 10
[USER LOG] Registry does not know 10 of 10
[USER LOG] Wrote 10 entries as SCAMSNIFFER_BLACKLIST, severity 3: 0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8

✓ Workflow Simulation Result:
{ "checked": 10, "feedEntries": 2530, "txHash": "0xa1b9…59e8", "window": "167/253", "written": 10 }
```

The transaction ([explorer](https://testnet.monadexplorer.com/tx/0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8), block 68851519) went to the mock forwarder, which called the receiver, which wrote ten `ReputationFlagged` entries to the registry. Afterwards the live API answered `blocked` with `KNOWN_MALICIOUS_ADDRESS` (`reasonCode: SCAMSNIFFER_BLACKLIST`) for a transfer to the first of them, `0xa8f3762b03ae73cbbdb9173d3537c632628727a4`, and `safe` for the same transfer to an address that is not on the feed. The receiver was back on the production forwarder with the workflow-owner check on when the script ended.

## Second recorded run (2026-10-11, Monad testnet, Ezgin's second machine)

`./workflows/simulate.sh --broadcast`, CRE CLI v1.38.0, SDK 1.23.0, Bun 1.4.3, on Windows from Git Bash:

```
[SIMULATION] Running trigger trigger=cron-trigger@1.0.0
[USER LOG] Threat feed: 2530 addresses, window 87/253 holds 10
[USER LOG] Registry does not know 10 of 10
[USER LOG] Wrote 10 entries as SCAMSNIFFER_BLACKLIST, severity 3: 0xe65521c7ea9a2fd7f5ae686ff8ffda6def6222c3794bfbe224bf3784b36c7c09

✓ Workflow Simulation Result:
{ "checked": 10, "feedEntries": 2530, "txHash": "0xe655…7c09", "window": "87/253", "written": 10 }
```

The transaction ([explorer](https://testnet.monadexplorer.com/tx/0xe65521c7ea9a2fd7f5ae686ff8ffda6def6222c3794bfbe224bf3784b36c7c09), block 70195240) went through the mock forwarder to the receiver and wrote ten entries to the registry. Afterwards the live API answered `blocked` with `KNOWN_MALICIOUS_ADDRESS` (`reasonCode: SCAMSNIFFER_BLACKLIST`) for a transfer to the first of them, `0x57862f4c20fd3450bf63381235b1d36095daf364`, and `safe` for the same transfer to a wallet that is not on the feed; `GET /v1/audit/reputation/0x57862f4c20fd3450bf63381235b1d36095daf364` names this transaction. The receiver was back on the production forwarder with the workflow-owner check on when the script ended (read from the chain).

## The run in the video (2026-10-13, Monad testnet)

`./workflows/simulate.sh --broadcast`, CRE CLI v1.38.0, Bun 1.4.3, on Windows from Git Bash, screen recorded by Ezgin for the Chainlink submission (`docs/submission/SCRIPTS.md` 3.2).

The transaction ([explorer](https://testnet.monadexplorer.com/tx/0x5d72012bb7bed6dbbe6ade3dd40d3a4243137b2482dc1205b4cbbd5f39fb1175), block 70574558) went through the mock forwarder to the receiver and wrote ten `ReputationFlagged` entries to the registry. Afterwards the live API answered `blocked` with `KNOWN_MALICIOUS_ADDRESS` (`reasonCode: SCAMSNIFFER_BLACKLIST`) for a transfer to the first of them, `0x17504785059123e758f1cd2bfa00ab45b613f9e5`, and `safe` for the same transfer to `0x1365566191bAA9872A64AcDce963751d5343ff49`, which is not on the feed. The receiver was back on the production forwarder with the workflow-owner check on when the script ended (read from the chain). An earlier run of the same morning wrote ten more: `0x7953f3b76827e0c0cabfd35ee59b0386b0e7533032f11063fc712191ac308ea0` (block 70565887).

A run inside the same ten minutes as the last one looks at the same window of the feed (`rotationSeconds: 600`), finds nothing the registry does not know and sends no transaction.

Deployment to a DON is still not done: `cre whoami` on this account shows "Deploy Access: Not enabled" on 2026-10-11. Access was requested that day with `cre account access`. Chainlink answered on 2026-10-12: local simulation is open to everyone, and deploying to testnet or mainnet goes through a mutual NDA and commercial terms. Decided by Ezgin the same day: the hackathon entry is the simulation, and deployment is taken up after the event.
