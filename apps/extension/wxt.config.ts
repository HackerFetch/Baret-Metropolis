import { webUiFonts } from "@baret/web-ui/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

/**
 * Where the manifest's host_permissions points: the local server in dev, the
 * deployed one for a store or judge build, so a package never carries a wider
 * grant than it needs. Called inside `manifest` below, never at the top of
 * this file: WXT loads `.env` files (`.env.example` in this folder) only after
 * it has loaded this config, so a value from `.env.local` exists only by then.
 * A variable set in the shell, as CI does, works either way.
 */
function baretApiOrigin(): string {
  const env = import.meta.env as Record<string, string | undefined> | undefined;
  const url = env?.WXT_BARET_API_URL || process.env.WXT_BARET_API_URL || "http://localhost:8080";
  return new URL(url).origin;
}

/** The Monad RPC the wallet reads from and sends through; the public node by default. */
function monadRpcOrigin(): string {
  const env = import.meta.env as Record<string, string | undefined> | undefined;
  const url =
    env?.WXT_MONAD_TESTNET_RPC_URL ||
    process.env.WXT_MONAD_TESTNET_RPC_URL ||
    "https://testnet-rpc.monad.xyz";
  return new URL(url).origin;
}

/**
 * WXT was chosen over CRXJS for three concrete reasons, not for taste.
 *
 *  1. CRXJS 2.7.1 has an open, unfixed bug on Vite 8: an MV3 service worker
 *     whose module graph contains a top-level dynamic import throws
 *     synchronously before any chrome.* listener is registered, which kills
 *     the whole background worker. A wallet background that lazy-loads chain
 *     adapters is exactly that shape.
 *  2. WXT generates the Chrome service worker and the Firefox event page from
 *     one defineBackground call. Firefox still has no extension service
 *     worker support (Bugzilla 1573659, open since 2019).
 *  3. WXT builds content scripts as synchronous IIFEs, which is what wins the
 *     document_start race when injecting a provider into the page.
 *
 * Docs: https://wxt.dev
 */
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],

  /**
   * Required. WXT defaults Firefox and Safari to Manifest V2, so leaving this
   * out silently ships an MV2 Firefox build.
   */
  manifestVersion: 3,

  targetBrowsers: ["chrome", "firefox"],

  // webUiFonts: the self-hosted faces at /fonts, shared with the showcase and
  // the wallet, written to the build next to the pages that use them.
  vite: () => ({
    plugins: [webUiFonts(), tailwindcss()],
  }),

  manifest: ({ browser }) => ({
    name: "Baret",
    short_name: "Baret",
    description:
      "Reads every Monad transaction before you sign it. Simulates it, checks it against your rules, and tells you what it found.",

    permissions: [
      "storage", // keystore, activity, permissions ledger
      "alarms", // auto-lock deadline
      "notifications", // drift alerts
    ],

    host_permissions: [`${baretApiOrigin()}/*`, `${monadRpcOrigin()}/*`],

    action: {
      default_title: "Baret",
      default_popup: "popup.html",
    },

    /**
     * 'wasm-unsafe-eval' is the default MV3 allowance and is declared here so
     * a future Rust crypto core does not need a manifest change. 'unsafe-eval'
     * is rejected by the Chrome Web Store outright and must never appear.
     */
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },

    // Chrome 111 is where content_scripts[].world became available.
    ...(browser === "chrome" && { minimum_chrome_version: "111" }),

    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          // AMO does not assign an id for MV3. Signing fails without one.
          id: "wallet@baret.dev",
          // 128 is the clean floor: world MAIN, match_origin_as_fallback and
          // optional_host_permissions all land there.
          strict_min_version: "128.0",
          // Mandatory for new AMO submissions since November 2025.
          data_collection_permissions: { required: ["none"] },
        },
        gecko_android: { strict_min_version: "128.0" },
      },
    }),
  }),

  /**
   * AMO requires a full source submission for anything built with a bundler,
   * and reviewers rebuild and diff it. In a monorepo the sources zip has to
   * start at the workspace root or the build is not reproducible.
   */
  zip: {
    sourcesRoot: "../../",
    includeSources: [
      "apps/extension/**",
      "packages/content/**",
      "packages/guard/**",
      "packages/routes/**",
      "packages/ui/**",
      "packages/wallet-ui/**",
      "packages/web-ui/**",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.base.json",
      ".npmrc",
      ".nvmrc",
    ],
    excludeSources: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-types/**",
      "**/.output/**",
      "**/*.tsbuildinfo",
      "**/*.test.ts",
      "**/*.test.tsx",
      "baret-repos/**",
      "prompts/**",
    ],
  },
});
