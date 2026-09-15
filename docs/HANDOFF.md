# Handoff

You are picking up frontend work on Baret. Read this, then `CLAUDE.md`, then the file the task actually touches. Everything here is current as of 2026-09-15.

---

## Before you do anything

Follow every rule in `CLAUDE.md`. It is not advisory. In particular:

1. **Identify who you are working with.** `git config user.name`. Meriç is the frontend developer and the tester. Ezgin (GitHub `Aeztrest`) owns the backend, the contracts, the indexer and the sponsor integrations. Do not write in Ezgin's areas. If you need something from him, add a task to `tasks/FOR_EZGIN.md` instead of building it yourself.
2. **Read `tasks/FOR_MERIC.md` and summarise what is open** before starting the day's request.
3. **Speak Turkish to the user. Write English into every file.** There is no Turkish anywhere in the repository and it stays that way. A linter enforces it for copy.
4. **Never merge the `frontend` pull request.** Commit to the branch freely. Merge only when Meriç says so in plain words. This has been asked for explicitly.
5. **Monad only.** Testnet 10143, mainnet 143. No other chain name appears in any file. No `Premon`, `Blackthorn`, `stellar-thorn`, or `DELTAG_` prefix.

---

## Where the project is

The planning documents in `docs/` were written first and are the contract for everything else. The frontend is scaffolded and the design system exists. No backend and no contracts exist yet.

| | State |
|---|---|
| Branch | `frontend`, 10 commits ahead of `main`, open as PR #1 |
| Copy | 44 files in `packages/content`, one per page, complete |
| Design system | 37 components in `packages/ui`, complete enough to build screens |
| Routes | 34 across three surfaces, with tests |
| Apps | Three scaffolded and building. Pages render their copy; most are not designed yet |
| Backend | Does not exist. `apps/server` is Ezgin's |
| Contracts | Do not exist |
| Tests | 35, all passing |

### What is actually built versus stubbed

Built and finished: the copy, the token system, the component library, the route registries, the route tests, the popup navigation state machine, the landing page.

Scaffolded but not designed: the other 43 pages. They render real copy through a plain frame. They need layout, not words.

Stubs with a `TODO`: `apps/extension/src/entrypoints/background.ts`, `provider.content.ts`, `relay.content/index.ts`. These are the wallet provider and the message bridge. They are frontend work and nobody is blocked on them.

---

## The four quality gates

Run all four before you commit. They are fast.

```bash
pnpm typecheck    # tsc -b across the workspace
pnpm test         # 35 tests
pnpm lint         # biome
pnpm lint:copy    # em dashes, banned words, long sentences, Turkish
```

There is no CI yet. Nothing runs these automatically. Adding a GitHub Actions workflow that does is a small, useful job if you are looking for one.

---

## Decisions already made, with their reasons

Do not relitigate these. If you think one is wrong, say so and let Meriç decide.

**TypeScript 6.0.3, not 7.** TypeScript 7 is the native Go compiler and is genuinely faster, but `typescript-eslint` caps its peer range below 6.1 because 7 does not expose a stable programmatic API until 7.1. `tsconfig.base.json` is already written TS 7 clean: no `baseUrl`, no `moduleResolution: node`, no `target: es5`. Moving later is a version bump.

**WXT, not CRXJS, for the extension.** CRXJS 2.7.1 has an open bug on Vite 8 where an MV3 service worker containing a dynamic import throws before any listener registers, which kills the background entirely. That is the shape of a wallet background. WXT also generates the Chrome service worker and the Firefox event page from one file and builds content scripts as synchronous IIFEs, which is what wins the `document_start` race.

**`manifestVersion: 3` is set explicitly in `wxt.config.ts`.** WXT defaults Firefox to Manifest V2. Removing that line silently ships an MV2 Firefox build.

**No `webextension-polyfill`.** The package was archived in July 2026 now that Chrome supports the `browser` namespace. Write `browser.*` directly.

**The popup has no router.** Navigation is a reducer in `apps/extension/src/entrypoints/popup/navigation.ts`. The rule it protects is that a pending signature owns the whole canvas: no tabs, no balance, no way out except approve, decline or timeout. A router puts that rule one stray link away from being broken. Its tests are the most important ones in the extension.

**The options page uses hash routing.** An extension page has no server to rewrite a deep path, so `options.html/rules` would 404 on reload. The popup deep-links into it, so this is load-bearing.

**shadcn's `accent` is not our accent.** In their palette `accent` is the quiet surface behind a hovered menu item. Ours is International Orange. The bridge in `tokens.css` maps orange to `primary` and `ring` only. If you map it to `accent`, every hover state turns orange and the 90/8/2 ratio the brand depends on is gone.

---

## Traps that have already bitten, or nearly did

**The radius scale.** A Tailwind v4 `@theme` block extends the defaults, it does not replace them. The named radius scale is pinned to zero in `tokens.css`. Do not remove those lines: shadcn's registry uses `rounded-lg` 45 times and `rounded-md` 29 times, and the whole product rounds silently.

**The dark variant.** Overriding the `dark` variant with a custom selector replaces `prefers-color-scheme` rather than adding to it. The block form with `@slot` in `tokens.css` covers both the explicit attribute and the unset-but-dark-OS case, which is where most viewers are. Do not simplify it back to a one-liner.

**Demo contracts must really exist on chain.** The five earlier versions of this product, reviewed in `docs/REFERENCE_REPOS.md`, all used fake contract addresses in their showcase. Because nothing was deployed, even the safe scenarios came back as simulation failures and the demo lied. Someone has to deploy the six demo contracts to Monad testnet.

**Dead codes and dead policy fields.** Those same repos defined between 11 and 18 finding codes or policy fields that no detector emitted and no engine read, while the UI kept rendering toggles for them. Every entry in `shared/findings.content.ts` must be emitted by a real detector, and every field in `shared/policy.content.ts` must be read by the engine. Meriç tests this.

**"25+ detectors" was never true** in any earlier version. Real counts were 8 to 22. If a number appears in the copy, it has to match the code.

---

## Where things live

```
docs/                    the specs. ARCHITECTURE, WALLET, FRONTEND, CONTRACTS,
                         BRAND, DECISIONS, REFERENCE_REPOS and the rest
packages/content/        every user-facing string, 44 files, one per page
packages/ui/             tokens, 23 re-skinned shadcn components, 13 of ours
packages/routes/         the route registry type and the checks
apps/showcase/           marketing site and the six threat demos, 12 routes
apps/wallet/             standalone passkey wallet, 11 routes
apps/extension/          WXT, Chrome and Firefox, popup plus 10 options routes
prompts/                 150 image prompts, gitignored, local only
baret-repos/             five earlier versions, gitignored, read-only reference
```

**Copy never lives in a component.** If you need a sentence, it belongs in `packages/content` and the component reads it. The linter checks the copy, not your JSX.

**Paths never live in a component either.** Every route is declared once in that surface's `routes.ts`. Links are built from the registry. A test asserts every href in the copy resolves.

---

## What to do next

In this order, unless Meriç says otherwise.

1. **The sign request screen.** It is the product, it renders on three surfaces, and its data shape is already specified in `docs/ARCHITECTURE.md` section 5: `{ safe, reasons, findingCodes, estimatedChanges, confidence, meta, suggestions }`. Build it against that shape with fixtures covering every finding code. Building it now surfaces gaps in the spec before Ezgin writes the server, which is the cheapest moment to find them. Write the exact shape you assumed into `tasks/FOR_EZGIN.md` so the two halves converge.
2. **The 30 screens that need no imagery.** The wallet's 10 and the extension's 20 are almost entirely interface: the rule editor with its 25 toggles, the permissions manager, the activity log, settings, the send and receive forms. None of them wait on the illustrations.
3. **The extension entrypoints.** The `window.ethereum` provider, the EIP-6963 announcement and the content-script bridge. Nobody is blocked on these and they are ours.
4. **CI.** Four gates, nothing runs them.
5. **The marketing pages.** These are the ones that want the illustrations, so they come after the assets land.

---

## Things that are known to be wrong right now

- The status table in `README.md` says planning is complete and coding has not started. That was true on 13 September and is not true now. Fix it when you touch the README.
- `docs/ROADMAP.md` still shows week 0 with nothing ticked.
- `docs/FRONTEND.md` claims "25+ detectors" and one contract. `docs/ARCHITECTURE.md` lists nine detector modules. These have to agree before either number is shown to a judge.
- The showcase names are settled as SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB and LAUNCHPAD by decision D-010, but `ARCHITECTURE.md` section 8.4 and `ROADMAP.md` week 2 still talk about choosing new Monad-themed names.

None of these are hard. They are listed because a new session reading the documents will otherwise believe them.
