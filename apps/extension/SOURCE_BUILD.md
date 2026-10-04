# Building Baret from this source package

This archive is the source of the Baret browser extension, taken from the root of a pnpm workspace. It holds the extension (`apps/extension`) and the workspace packages it is built from (`packages/content`, `guard`, `routes`, `ui`, `wallet-ui`, `web-ui`). The lockfile also lists workspace packages that are not part of the extension; pnpm skips them.

## Requirements

- Node.js 22.22.0 (the version in `.nvmrc`)
- pnpm 11.1.3 (the version in `package.json` under `packageManager`; `corepack enable` installs it)
- macOS, Linux or Windows; no other tools

## Steps

From the root of the unpacked archive:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @baret/extension build:firefox
```

The Firefox build lands in `apps/extension/.output/firefox-mv3/`. It is the content of the submitted package. `pnpm --filter @baret/extension zip:firefox` builds it and packs it as `apps/extension/.output/baretextension-<version>-firefox.zip`.

For Chrome, run `pnpm --filter @baret/extension build`; the output lands in `apps/extension/.output/chrome-mv3/`.

## What the build does

WXT (Vite under the hood) bundles and minifies the TypeScript and React sources, compiles Tailwind CSS, and copies `apps/extension/public/` (icons, pictures, fonts) as is. No code is downloaded or generated at runtime, and the manifest's content security policy allows only the extension's own scripts.

This rebuild was checked on 2026-10-04: a build from the unpacked source matched the submitted package file for file.
