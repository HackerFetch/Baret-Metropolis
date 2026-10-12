# Baret — Privacy Policy

Last updated: 2026-10-12 · Applies to: the Baret browser extension (Chrome, Brave, Edge, Firefox) and the Baret analysis server at `https://baret-monad-api.onrender.com`.

Baret is a Monad wallet that reads a transaction before you sign it. This page says what leaves your device when it does that, who receives it, and what never leaves. The same facts are in the extension under Settings → Privacy.

## What never leaves your device

- Your private key and your twelve-word recovery phrase. They are encrypted with your passphrase and kept in the browser's extension storage.
- Your passphrase.
- Your activity log, your list of connected sites and your permissions. They are kept in the browser's extension storage and can be exported or cleared in Settings.

Baret has no account, no sign-up and no email address. It collects no usage data and has no analytics or advertising code.

## What is sent, and when

**When a site asks you to sign something**, the extension sends the Baret server:

- the unsigned transaction or message the site asked for,
- your wallet address,
- the address of the site that asked (its origin, for example `https://example.com`),
- the rules you have set in Baret.

The server simulates the request on Monad, checks it against your rules and returns a verdict (`Safe`, `Caution` or `Blocked`) with its reasons. Nothing is sent for pages that do not ask your wallet for anything: the extension runs on every page only so that it can receive a sign request from any site.

**When you ask for a verdict in plain language**, the server passes that verdict (the findings, the addresses involved and the amounts) to a language model to write the explanation.

**When the wallet shows balances or allowances, or sends a transaction you signed**, the extension talks to a Monad node (`https://testnet-rpc.monad.xyz` by default). The node sees the address it is asked about and the signed transactions you send. A transaction on Monad is public and stays public.

## Who else sees it

To answer a check the server asks other services, and each sees only what its part needs:

| Service | What it sees | Why |
|---|---|---|
| Alchemy (Monad RPC) | The unsigned transaction and your address | To simulate the transaction |
| Nansen | The addresses in the transaction | Wallet reputation |
| Cleanverse | The addresses in the transaction | Compliance status of an address |
| Moonshot AI (Kimi) and Qwen | A verdict you asked to have explained | To write the explanation |
| Render | Requests to the server, with the IP address they came from | It hosts the server |

None of them receives your key, your recovery phrase or your passphrase.

## What the server keeps

- Recent verdicts are held in the server's memory so that one can be explained when you ask. They are not written to a database and are gone when the server restarts.
- The server writes ordinary request logs (time, path, status, IP address). They are used to keep the service running and to limit abuse.
- The server keeps no profile of you and does not link requests to a person.

## What Baret does not do

- It does not sell your data or share it for advertising, and does not use it for anything other than checking the request you were asked to sign.
- It does not use your data to decide creditworthiness or for lending.
- It does not read page content, browsing history, forms or passwords. The only thing it takes from a page is the sign request the page sends to the wallet.

## Your choices

- Settings → Privacy → **Export your data** saves your activity, permissions, rules and sites to a file on your device.
- Settings → Privacy → **Clear activity** deletes the log on your device.
- Removing the extension deletes everything it stored in the browser. Keep your recovery phrase if you want the account back.

## Changes and contact

A change to this policy is made in this file, and its history is public in the repository. Questions: open an issue at <https://github.com/HackerFetch/Baret-Metropolis/issues>.
