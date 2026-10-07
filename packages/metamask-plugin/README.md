# Baret for the MetaMask Agent Wallet

A plugin for the [MetaMask Agent Wallet](https://docs.metamask.io/agent-wallet/) CLI (`mm`). It gives an agent one habit: ask Baret before proposing a transaction on Monad, and never propose one Baret blocks.

Baret simulates the transaction, runs it through its risk detectors and the chosen rules, and answers `safe`, `caution` or `blocked` with the findings behind the answer. The plugin turns that into two commands.

| Command | What it does | Capabilities |
|---|---|---|
| `mm baret check <to>` | Checks a transaction from the active wallet. Sends nothing. | `wallet-read` |
| `mm baret send <to>` | Checks, then hands the transaction to the wallet only when the check lets it through. | `wallet-read`, `wallet-submit` |

Flags for both: `--value <wei>`, `--data <hex>`, `--chain-id 10143|143` (default `10143`, Monad testnet), `--policy strict|balanced|permissive` (default `balanced`), `--api <url>` (or `BARET_API_URL`). `send` also takes `--accept-caution` and `--wait`.

## What happens to each answer

| Baret says | `mm baret send` |
|---|---|
| `safe` | Proposes the transaction through `walletExecutor`. MetaMask's own policy, limits and approval still apply. |
| `caution` | Fails with `BARET_CAUTION`. A Caution is a finding for a person to read; `--accept-caution` sends it. |
| `blocked` | Fails with `BARET_BLOCKED` and the finding codes. The wallet is never called, with or without `--accept-caution`. |
| no answer, a non-2xx status, an answer of the wrong shape, an expired verdict | Fails with `BARET_NO_VERDICT`. The wallet is never called (fail-closed). |

The plugin cannot loosen anything: it has no access to the session, the recovery phrase or the wallet's policy, and a transaction it passes is still judged by MetaMask. It only removes proposals before they reach the wallet.

## Install

Plugins are a beta feature of the CLI and off by default.

```bash
npm install -g @metamask/agent-wallet@latest
mm login && mm init

mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true   # for a local tarball

pnpm install
pnpm --filter @baret/metamask-plugin pack:plugin        # prints the tarball path
mm plugins install "file:<the path it printed>"          # shows the consent screen
```

Install the tarball, not this folder. A folder install is a link, and the commands would then load the workspace's copy of `@metamask/agent-wallet` beside the CLI's own; with two copies in one process every `mm` command fails (`window.addEventListener is not a function`).

Remove it with `mm plugins uninstall @baret/metamask-plugin`.

## Use

```bash
# A plain transfer of 0.01 MON on Monad testnet
mm baret check 0x1365566191bAA9872A64AcDce963751d5343ff49 --value 10000000000000000 --json

# The same, sent if Baret lets it through
mm baret send 0x1365566191bAA9872A64AcDce963751d5343ff49 --value 10000000000000000 --wait

# An address from the on-chain reputation registry: refused before the wallet sees it
mm baret send 0xa8f3762b03ae73cbbdb9173d3537c632628727a4 --value 10000000000000000
```

## Layout

| File | Role |
|---|---|
| `src/guard.ts` | The request, the answer check, the gate and `guardedSend`. No MetaMask import; unit tested |
| `src/inputs.ts` | The shared flags and how they become a proposal |
| `src/commands/baret/*.ts` | The two `PluginCommand` classes |
| `package.json#mm` | The manifest: per-command capabilities, data access and target chains (Monad only) |

The plugin has no runtime dependencies; it talks to Baret with `fetch` and checks the answer by hand. Tests: `pnpm exec vitest run --project metamask-plugin`.
