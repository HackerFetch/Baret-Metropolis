import { optionsFrame } from "@baret/content/extension/options/frame.content";
import { defineRoutes } from "@baret/routes";

const { pages } = optionsFrame;

/** "{page} · Baret settings": the page name with the product after it. */
export function pageTitle(page: string): string {
  return optionsFrame.title.replace("{page}", page);
}

/**
 * The extension options page.
 *
 * Hash routing, not history routing. An extension page is loaded from
 * chrome-extension://<id>/options.html and there is no server to rewrite a
 * deep path, so /policies would 404 on reload. The hash keeps deep links
 * working, which matters because the popup links straight into this page:
 * options.html#/policies opens the rule editor from the popup's settings tab.
 */
export const routes = defineRoutes({
  home: {
    path: "/",
    title: pageTitle(pages.home),
    label: pages.home,
    group: "main",
    load: () => import("./pages/HomePage.js"),
  },
  activity: {
    path: "/activity",
    title: pageTitle(pages.activity),
    label: pages.activity,
    group: "main",
    load: () => import("./pages/ActivityPage.js"),
  },
  allowances: {
    path: "/permissions",
    title: pageTitle(pages.allowances),
    label: pages.allowances,
    group: "main",
    load: () => import("./pages/AllowancesPage.js"),
  },
  policies: {
    path: "/rules",
    title: pageTitle(pages.policies),
    label: pages.policies,
    group: "main",
    load: () => import("./pages/PoliciesPage.js"),
  },
  x402: {
    path: "/payments",
    title: pageTitle(pages.x402),
    label: pages.x402,
    group: "main",
    load: () => import("./pages/X402Page.js"),
  },
  sites: {
    path: "/sites",
    title: pageTitle(pages.sites),
    label: pages.sites,
    group: "main",
    load: () => import("./pages/SitesPage.js"),
  },
  siteDetail: {
    path: "/sites/:origin",
    title: pageTitle(pages.siteDetail),
    hidden: true,
    load: () => import("./pages/SiteDetailPage.js"),
  },
  settings: {
    path: "/settings",
    title: pageTitle(pages.settings),
    label: pages.settings,
    group: "main",
    load: () => import("./pages/SettingsPage.js"),
  },

  /**
   * Full screen. Rendered outside the sidebar because a half-finished wallet
   * must not offer a way to wander off into the rest of the app.
   */
  onboarding: {
    path: "/onboarding",
    title: pageTitle(pages.onboarding),
    group: "setup",
    hidden: true,
    load: () => import("./pages/OnboardingPage.js"),
  },

  notFound: {
    path: "/*",
    title: pageTitle(pages.notFound),
    hidden: true,
    load: () => import("./pages/NotFoundPage.js"),
  },
});

export type OptionsRoute = keyof typeof routes;
