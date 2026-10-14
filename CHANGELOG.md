# Changelog

All notable changes to the npm packages [`@baret/guard`](https://www.npmjs.com/package/@baret/guard), [`@baret/llm`](https://www.npmjs.com/package/@baret/llm) and [`@baret/agent-kit`](https://www.npmjs.com/package/@baret/agent-kit) are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The three packages are released together at the same version, because `@baret/agent-kit` pins the other two at its own version. Changes to the API, the apps and the contracts are not listed here; they are in [`docs/DECISIONS.md`](docs/DECISIONS.md) and the git history. How a release is made: [`docs/runbooks/release.md`](docs/runbooks/release.md).

## [Unreleased]

### 0.1.4, raised in the repository on 2026-10-14, not on npm yet

- `@baret/guard`: the response schema knows `LOOKALIKE_ADDRESS` and `APPROVAL_TO_WALLET`, the two findings the engine gained on 2026-10-13 (`4452457`) after 0.1.3 went out. On 0.1.3 an answer that carries either code throws `GuardUnreachableError` ("unexpected body"): the caller refuses, which is safe, but the reason is lost.
- `@baret/agent-kit`: carries the reviewer's changes of 2026-10-14.
- Seen through [`examples/agent-blind-signing`](examples/agent-blind-signing): the NovaSwap attack and the agents' collection handover come back as no answer on 0.1.3 and as Blocked with their findings on a packed 0.1.4. Publishing steps: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Planned

From the rest of Venue's report ([`docs/submission/TEXTS.md`](docs/submission/TEXTS.md)): structured error codes with retry hints, a viem example and a multi-party example. Not built yet.

## [0.1.3] - 2026-10-13

Published by Ezgin from the tarballs of `main` at `e558492` (commit `6890484`). Answers two points of the report from the first outside integration: an independent developer wired `@baret/guard` 0.1.2 into the signing path of Venue, an order book for Cleanverse Verified Assets on Monad testnet ([their report](https://github.com/brutaldevvin/venue/blob/feat/baret-guard/docs/baret/INTEGRATION.md)).

### Added

- `@baret/guard`: `verdictRefusal(verdict, { chainId })`, which answers `"expired"`, `"wrong_chain"` or `null`. It refuses a verdict whose `expiresAt` has passed (or is not a date) or whose `meta.chainId` names another chain. Call it right before signing.
- `@baret/guard`: `GuardUnreachableError.body`, what the server said on a non-2xx answer (Baret's own `{ error, message }`, text when it is not JSON, `null` when empty).
- `@baret/guard` README: "What the SDK leaves to you", the caller's duties reported by Venue.

### Changed

- `@baret/guard` README: full links where 0.1.2 pointed at repository paths.
- `@baret/llm`, `@baret/agent-kit`: no change of their own; released at 0.1.3 to keep the three versions together.

### Checked

After the publish, a clean `npm install @baret/agent-kit` in an empty folder took all three packages at 0.1.3 and ran against the live API: the README call answered `blocked` / `KNOWN_MALICIOUS_ADDRESS`; `verdictRefusal` answered `null` for chain 10143, `wrong_chain` for 143 and `expired` ten minutes later; a zero-address sender threw with status 400 and the server's body; `npx baret policy list` printed the templates ([`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), "Publishing the SDK to npm").

## [0.1.2] - 2026-10-12

Published by Ezgin; carries the fixes from the tester run.

### Added

- `@baret/guard`: the response schema knows the `CALL_TO_ADDRESS_WITHOUT_CODE` finding and ERC-721 rows in `estimatedChanges`.
- `@baret/agent-kit`: `baret --help`. A wrong command exits with code 2.

### Changed

- `@baret/agent-kit`: installs without `tsx`, and Dynamic is an optional peer dependency (about 75 MB installed).

### Checked

Before the publish, from the three tarballs in an empty folder: the README call answered `blocked` with `KNOWN_MALICIOUS_ADDRESS` from the live API, `npx baret --help` exited 0 and a wrong command exited 2. After the publish, the same evening, `npm install @baret/agent-kit` took 0.1.2 of all three from the registry and the same checks ran.

## [0.1.1] - 2026-10-12

Published from `main` at `e565a78` (commit `03303a0`).

### Added

- `@baret/llm`: a README.
- `@baret/agent-kit`: the `baret` CLI names a vault's revert instead of printing raw revert data.

### Fixed

- READMEs of all three packages: how to install from npm. The 0.1.0 READMEs still said "not published", and the README on an npm page can only be changed by a new version.

## [0.1.0] - 2026-10-11

First publish, from `main` at `d35094a`, by the npm account that owns the `baret` organisation. A `0.0.0-stage` version a minute older also exists in each package.

### Added

- `@baret/guard`: `TransactionGuard.evaluate`, the client that asks the Baret API for a Safe / Caution / Blocked verdict before signing.
- `@baret/llm`: one OpenAI-compatible client used for KIMI and Qwen.
- `@baret/agent-kit`: a guarded agent wallet for PaymentGuard vaults, a Dynamic signer and the `baret` CLI.
- Built JavaScript with type declarations in `dist/`; `prepack` runs the build so a tarball cannot ship without it.

[0.1.3]: https://www.npmjs.com/package/@baret/guard/v/0.1.3
[0.1.2]: https://www.npmjs.com/package/@baret/guard/v/0.1.2
[0.1.1]: https://www.npmjs.com/package/@baret/guard/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/@baret/guard/v/0.1.0
