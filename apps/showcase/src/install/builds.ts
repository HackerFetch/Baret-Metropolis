import { install } from "@baret/content";

/**
 * The install page's seams: which browser the visitor is on, and where each
 * extension build comes from.
 *
 * A build reaches the browser one of three ways, best first: its store
 * listing (the Chrome Web Store, Firefox Add-ons), a published zip, or the
 * source. The first two are URLs from the environment and null when unset,
 * so the page says exactly which one it has and never guesses a URL, size or
 * date. With a store listing the zip is not offered: the store is the way in.
 */

export type Browser = "chromium" | "firefox" | "unknown";
export type BuildId = Exclude<Browser, "unknown">;
/** How a build reaches the browser, best first. */
export type Source = "store" | "zip" | "source";

/**
 * The browser family from a user-agent string. Chrome, Brave, Edge, Opera and
 * other Chromium browsers load the same build. iOS browsers are WebKit under
 * any name and load no extension, so they are "unknown", like Safari.
 */
export function detectBrowser(userAgent: string): Browser {
  const ua = userAgent;
  if (/\b(iPhone|iPad|iPod)\b/.test(ua) || /\b(CriOS|FxiOS|EdgiOS)\//.test(ua)) return "unknown";
  if (/\bFirefox\//.test(ua)) return "firefox";
  if (/\b(Chrome|Chromium|Edg|OPR)\//.test(ua)) return "chromium";
  return "unknown";
}

/** The extension's version. Keep in step with apps/extension/package.json (a test checks). */
export const EXTENSION_VERSION = "0.1.0";

export interface Build {
  readonly id: BuildId;
  /** The store listing, or null while none is public. */
  readonly store: string | null;
  /** A published zip, or null while none is published. */
  readonly href: string | null;
  readonly version: string;
  readonly title: string;
  readonly requires: string;
  /** The hero button for the zip. */
  readonly action: string;
}

/** One of the three steps under the hero. */
export interface Step {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  /** A browser page the visitor pastes into the address bar. */
  readonly address?: string;
}

/** Only an absolute https URL counts as a published build or a public listing. */
function urlOrNull(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\/\S+$/.test(value.trim()) ? value.trim() : null;
}

const { builds } = install.download;

export function buildsFrom(env: {
  readonly chromium?: unknown;
  readonly firefox?: unknown;
  readonly chromiumStore?: unknown;
  readonly firefoxStore?: unknown;
}): Record<BuildId, Build> {
  return {
    chromium: {
      id: "chromium",
      store: urlOrNull(env.chromiumStore),
      href: urlOrNull(env.chromium),
      version: EXTENSION_VERSION,
      title: builds.chromium.title,
      requires: builds.chromium.requires,
      action: install.hero.actions.primary.label,
    },
    firefox: {
      id: "firefox",
      store: urlOrNull(env.firefoxStore),
      href: urlOrNull(env.firefox),
      version: EXTENSION_VERSION,
      title: builds.firefox.title,
      requires: builds.firefox.requires,
      action: install.hero.actions.secondary.label,
    },
  };
}

export const BUILDS = buildsFrom({
  chromium: import.meta.env.VITE_BARET_EXTENSION_CHROMIUM_URL,
  firefox: import.meta.env.VITE_BARET_EXTENSION_FIREFOX_URL,
  chromiumStore: import.meta.env.VITE_BARET_EXTENSION_CHROMIUM_STORE_URL,
  firefoxStore: import.meta.env.VITE_BARET_EXTENSION_FIREFOX_STORE_URL,
});

/** The store when the build is listed, else the zip when one is published, else the source. */
export function sourceOf(build: Build): Source {
  if (build.store !== null) return "store";
  if (build.href !== null) return "zip";
  return "source";
}

/** The build the hero leads with: the visitor's own, Chromium when unknown. */
export function leadBuild(browser: Browser): BuildId {
  return browser === "firefox" ? "firefox" : "chromium";
}

/** The other build, offered as a quiet link beside the lead one. */
export function otherBuild(id: BuildId): BuildId {
  return id === "firefox" ? "chromium" : "firefox";
}

/**
 * The three steps for a build. From its store: open, add, pin. Otherwise
 * extract, open, load, with step 1 building the folder from source while no
 * zip is published.
 */
export function stepsFor(id: BuildId, source: Source): readonly Step[] {
  if (source === "store") return builds[id].store.steps;
  const { steps } = install;
  const chosen = id === "firefox" ? steps.firefox : steps.chrome;
  const first = id === "firefox" ? steps.pending.firefox : steps.pending.chrome;
  return source === "source" ? [first, ...chosen.items.slice(1)] : chosen.items;
}

/**
 * The troubleshooting items that can still happen. An unpacked load goes
 * wrong only while the Chromium build is not in its store; a temporary add-on
 * vanishes only while the Firefox one is not.
 */
export function helpItems(all: Record<BuildId, Build>) {
  return install.troubleshooting.items.filter((item) => {
    if (!("only" in item)) return true;
    const id: BuildId = item.only === "unpacked" ? "chromium" : "firefox";
    return sourceOf(all[id]) !== "store";
  });
}
