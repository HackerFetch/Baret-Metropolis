import { defineRoutes } from "@baret/routes";

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
    title: "Baret",
    label: "Overview",
    group: "main",
    load: () => import("./pages/HomePage.js"),
  },
  activity: {
    path: "/activity",
    title: "Activity",
    label: "Activity",
    group: "main",
    load: () => import("./pages/ActivityPage.js"),
  },
  allowances: {
    path: "/permissions",
    title: "Standing permissions",
    label: "Permissions",
    group: "main",
    load: () => import("./pages/AllowancesPage.js"),
  },
  policies: {
    path: "/rules",
    title: "Your rules",
    label: "Rules",
    group: "main",
    load: () => import("./pages/PoliciesPage.js"),
  },
  x402: {
    path: "/payments",
    title: "Agent payments",
    label: "Payments",
    group: "main",
    load: () => import("./pages/X402Page.js"),
  },
  sites: {
    path: "/sites",
    title: "Sites",
    label: "Sites",
    group: "main",
    load: () => import("./pages/SitesPage.js"),
  },
  siteDetail: {
    path: "/sites/:origin",
    title: "Site",
    hidden: true,
    load: () => import("./pages/SiteDetailPage.js"),
  },
  settings: {
    path: "/settings",
    title: "Settings",
    label: "Settings",
    group: "main",
    load: () => import("./pages/SettingsPage.js"),
  },

  /**
   * Full screen. Rendered outside the sidebar because a half-finished wallet
   * must not offer a way to wander off into the rest of the app.
   */
  onboarding: {
    path: "/onboarding",
    title: "Set up Baret",
    group: "setup",
    hidden: true,
    load: () => import("./pages/OnboardingPage.js"),
  },

  notFound: {
    path: "/*",
    title: "Not found",
    hidden: true,
    load: () => import("./pages/NotFoundPage.js"),
  },
});

export type OptionsRoute = keyof typeof routes;
