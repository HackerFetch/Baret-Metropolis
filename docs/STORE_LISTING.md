# Chrome Web Store listing

> The answers for the Chrome Web Store form of the Baret extension, ready to paste. The store account is Ezgin's. The form is filled by hand in the [developer dashboard](https://chrome.google.com/webstore/devconsole); this file is what goes into it, so the listing and the product say the same thing.

Last updated: 2026-10-12 · Status: **written, not submitted yet**

## The package

Upload `baret-chrome.zip` from the [`extension-latest` release](https://github.com/HackerFetch/Baret-Metropolis/releases/tag/extension-latest). CI builds it from `main` with host access to the deployed API and the Monad node only. Manifest V3, version `0.1.0`. A later upload needs a higher `version` in `apps/extension/package.json`.

The manifest asks for `storage` and `alarms` only. `notifications` was declared and never called, and the store rejects a permission that is not used, so it was removed on 2026-10-12. Add it back in the same change that first shows a notification.

## Store listing tab

| Field | Value |
|---|---|
| Title | From the manifest: `Baret` |
| Summary | From the manifest: `Reads every Monad transaction before you sign it. Simulates it, checks it against your rules, and tells you what it found.` |
| Category | Developer Tools |
| Language | English |
| Store icon | `icon/128.png` from the zip |
| Screenshots | 1280 × 800, taken from the built extension on the live system: a blocked request, a safe request, the wallet, the overview |
| Small promo tile | 440 × 280 |
| Homepage URL | `https://usebaret.com` |
| Support URL | `https://github.com/HackerFetch/Baret-Metropolis/issues` |

**Description:**

```
Baret is a Monad wallet with a transaction firewall. It reads every transaction before you sign it.

When a site asks for your signature, Baret simulates the transaction on Monad, checks it against your rules and shows a verdict with its reasons: Safe, Caution or Blocked. The verdict comes before the sign button. A blocked request has no sign button.

What it does
- Simulates each transaction before you sign it.
- Checks 25 rules you can change: unlimited allowances, unknown contracts, reported addresses and more.
- Starts from one of three rule sets: Strict, Balanced or Permissive.
- Keeps a log of every verdict, including the requests you declined.
- Shows the allowances you have given.
- When a check cannot be finished, the answer is Blocked.

What it does not do
- Your key and recovery phrase never leave this device.
- It signs nothing you did not approve.
- It adds no fee to your transactions.
- It works on Monad only. This version runs on Monad testnet.

The analysis runs on Baret's server: the unsigned transaction, your address and the asking site are sent there for each check. The privacy policy names every party that sees data.

The code is open: https://github.com/HackerFetch/Baret-Metropolis
```

## Privacy tab

**Single purpose:**

```
Baret is a wallet for the Monad blockchain that checks a transaction before the user signs it. It receives sign requests from web pages, simulates each one, checks it against the user's rules and shows a Safe, Caution or Blocked verdict before the user can sign.
```

**Permission justifications:**

`storage`:

```
Stores the user's encrypted wallet key, their rules, their list of connected sites and the log of past verdicts in the browser.
```

`alarms`:

```
Locks the wallet automatically after the idle time the user chose in Settings, even when the popup is closed.
```

Host permission:

```
Two fixed hosts. baret-monad-api.onrender.com is Baret's own analysis server: the unsigned transaction is sent there to be simulated and checked before the user signs. testnet-rpc.monad.xyz is the Monad node the wallet reads balances from and sends signed transactions to. The content scripts match all sites because any site can ask a wallet to sign: they inject the standard wallet provider (EIP-1193, EIP-6963) and relay sign requests to the extension. They do not read page content.
```

Remote code: choose **No, I am not using remote code**. All JavaScript is in the package; the manifest's policy is `script-src 'self' 'wasm-unsafe-eval'`.

**Data usage.** Tick these two and nothing else:

- **Financial and payment information**: the transactions the user is asked to sign, and the wallet address.
- **Web history**: only the origin of the site that sent a sign request, sent with that request.

Not collected: personally identifiable information, health, authentication information (the passphrase and the key stay on the device), personal communications, location, user activity, website content.

Tick all three certifications: no sale to third parties, no use unrelated to the single purpose, no use for creditworthiness or lending.

**Privacy policy URL:** `https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/PRIVACY.md` ([`PRIVACY.md`](PRIVACY.md))

## Distribution tab

Free · Public · All regions.

## Test instructions tab

No login is needed. Paste:

```
No account or credentials are needed. The extension runs on Monad testnet only.
1. Open the extension's setup page, choose a passphrase and write down the recovery phrase.
2. Get testnet MON from https://faucet.monad.xyz for the address shown.
3. Open https://usebaret.com/novaswap and connect Baret. A normal transfer shows Safe and can be signed.
4. An unlimited token allowance to a reported address shows Blocked and has no sign button.
```

## After Google publishes it

A wallet whose content scripts run on every site gets the longer review: expect days, not hours. Once the listing is public, do E17 (`tasks/FOR_EZGIN.md`): set `VITE_BARET_EXTENSION_CHROMIUM_STORE_URL` on the showcase Vercel project and redeploy. Until then `/install` keeps offering the zip, and that stays true.
