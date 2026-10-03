import { install } from "@baret/content";

/**
 * The install page's two seams: which browser the visitor is on, and where
 * each extension build can be downloaded.
 *
 * No build is published yet (the zips are CI artifacts, which need a GitHub
 * login), so each download URL comes from the environment and is null when
 * unset: the page then says so and points at the source instead. Never a
 * guessed URL, size or date.
 */

export type Browser = "chromium" | "firefox" | "unknown";
export type BuildId = Exclude<Browser, "unknown">;

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
  /** A published zip, or null while none is published. */
  readonly href: string | null;
  readonly version: string;
  readonly title: string;
  readonly requires: string;
  /** The hero button for this build. */
  readonly action: string;
}

/** Only an absolute https URL counts as a published build. */
function urlOrNull(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\/\S+$/.test(value.trim()) ? value.trim() : null;
}

const { builds } = install.download;

export function buildsFrom(env: {
  readonly chromium?: unknown;
  readonly firefox?: unknown;
}): Record<BuildId, Build> {
  return {
    chromium: {
      id: "chromium",
      href: urlOrNull(env.chromium),
      version: EXTENSION_VERSION,
      title: builds.chromium.title,
      requires: builds.chromium.requires,
      action: install.hero.actions.primary.label,
    },
    firefox: {
      id: "firefox",
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
});

/** The build the hero leads with: the visitor's own, Chromium when unknown. */
export function leadBuild(browser: Browser): BuildId {
  return browser === "firefox" ? "firefox" : "chromium";
}

/** The other build, offered as a quiet link beside the lead one. */
export function otherBuild(id: BuildId): BuildId {
  return id === "firefox" ? "chromium" : "firefox";
}
