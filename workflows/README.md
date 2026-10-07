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

Not done: deployment needs CRE Early Access (`cre account access`). When access is granted, link the workflow owner key, deploy the `production-settings` target, and keep `workflowOwner` on the receiver equal to that key's address.
