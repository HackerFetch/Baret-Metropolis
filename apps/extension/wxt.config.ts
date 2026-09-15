import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

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

  vite: () => ({
    plugins: [tailwindcss()],
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
      "scripting",
    ],

    host_permissions: ["<all_urls>"],

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
      "packages/ui/**",
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
      "**/*.test.ts",
      "baret-repos/**",
      "prompts/**",
    ],
  },
});
