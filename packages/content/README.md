# @baret/content

Every user-facing string in Baret lives here. One file per page. No markup, no styling, no logic, no data fetching.

## Why a package and not strings in components

Three surfaces render the same words: the extension popup, the standalone wallet, and the marketing mockup on the landing page. When the verdict wording changes it has to change once. Keeping copy in one package also lets us lint it (see below) and lets a non-engineer edit a sentence without opening a component.

## Layout

```
src/
├── types.ts                       shared shapes: Action, Block, Feature, Faq, Step, EmptyState
├── shared/                        used by more than one app
│   ├── common.content.ts          nav, footer, buttons, verdict words, network names, generic errors
│   ├── findings.content.ts        one entry per risk finding code: title, plain sentence, why it matters
│   └── policy.content.ts          one entry per policy field, plus the three template descriptions
├── showcase/                      apps/showcase, 11 pages
│   ├── home.content.ts            landing page
│   ├── hub.content.ts             the showcase index
│   ├── scrybe.content.ts          six fake dApps, one file each
│   ├── novaswap.content.ts
│   ├── pixeldrop.content.ts
│   ├── orbityield.content.ts
│   ├── claimhub.content.ts
│   ├── launchpad.content.ts
│   ├── agents.content.ts          the SDK and CLI page
│   ├── docs.content.ts            the docs index
│   └── install.content.ts
├── wallet/                        apps/wallet, 10 pages
│   ├── onboarding.content.ts      home, send, receive, history, policies,
│   ├── home.content.ts            settings, connect, sign, delegation
│   └── ...
└── extension/                     apps/extension, 20 screens
    ├── popup/                     12 screens
    └── options/                   8 pages
```

44 content files in total: 3 shared, 11 showcase, 10 wallet, 12 popup, 8 options.

| Area | Files | Pages covered |
|---|---|---|
| `shared/` | 3 | Nav, footer, verdicts, errors; one entry per risk finding code; one entry per policy field |
| `showcase/` | 11 | Home, hub, six threat sites, agents, docs, install |
| `wallet/` | 10 | Onboarding, home, send, receive, history, policies, settings, connect, sign, agent delegation |
| `extension/popup/` | 12 | Uninitialized, locked, home, activity, permissions, settings, send, receive, accounts, alerts, sign request, connect |
| `extension/options/` | 8 | Onboarding, home, activity, permissions, rules, agent payments, sites, settings |

The sign request and the connect approval appear on three surfaces. The body of
each lives in `wallet/`, and the extension files hold only what exists because
it is an extension: the request queue, message signing, and the x402 variant.

## Conventions

- One file per page, named `<page>.content.ts`.
- Each file exports one const named after the page, plus its inferred type:
  ```ts
  export const home = { ... } as const;
  export type HomeContent = typeof home;
  ```
- `as const` everywhere, so a typo in a key is a build error at the call site.
- Keys describe the slot, not the words: `hero.title`, not `hero.readFirstThenSign`.
- Never put a component, a class name, an icon name or a URL path in here. A `href` is allowed when the link is part of the copy.
- Every screen that can be empty has an `empty`. Every screen that can fail has an `errors`.
- Numbers that appear in copy live here as strings so the writer controls the formatting.

## Writing rules

From `docs/BRAND.md` section 09. The linter enforces the mechanical ones.

- Say what happened. Say what the reader can do. Stop.
- Second person. Active voice. Present tense.
- One idea per sentence. Under 30 words, usually under 15.
- No em dashes, no en dashes, no ellipsis characters, no curly quotes.
- No banned words: revolutionary, seamless, empower, leverage, robust, unlock the power, peace of mind, and the rest of the list in `scripts/lint-copy.mjs`.
- Never say "safe" as a promise. Say what was checked.
- Errors name the rule that fired and the option the reader has.
- Empty states are reassuring and actionable, never apologetic.
- English only. The repo has no Turkish in any file.

## Checks

```bash
pnpm --filter @baret/content typecheck    # tsc --noEmit
pnpm --filter @baret/content lint:copy    # em dashes, banned words, long sentences, Turkish
```

Run both before committing copy.
