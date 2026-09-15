import { defineRoutes } from "@baret/routes";

/**
 * Every path the showcase serves, declared once.
 *
 * The router, the header nav, the footer and the route test all read this.
 * Nothing else in the app is allowed to write a path as a literal string.
 *
 * Groups:
 *   marketing  the header nav
 *   demo       the six threat sites, linked from the hub rather than the nav
 *   utility    reachable but not listed anywhere
 */
export const routes = defineRoutes({
  home: {
    path: "/",
    title: "Baret",
    load: () => import("./pages/HomePage.js"),
  },
  showcase: {
    path: "/showcase",
    title: "Baret showcase",
    label: "Showcase",
    group: "marketing",
    load: () => import("./pages/HubPage.js"),
  },
  agents: {
    path: "/agents",
    title: "Baret for agents",
    label: "Agents",
    group: "marketing",
    load: () => import("./pages/AgentsPage.js"),
  },
  docs: {
    path: "/docs",
    title: "Baret docs",
    label: "Docs",
    group: "marketing",
    load: () => import("./pages/DocsPage.js"),
  },
  install: {
    path: "/install",
    title: "Install Baret",
    label: "Install",
    group: "marketing",
    load: () => import("./pages/InstallPage.js"),
  },

  scrybe: {
    path: "/scrybe",
    title: "Scrybe",
    label: "Scrybe",
    group: "demo",
    load: () => import("./sites/ScrybePage.js"),
  },
  novaswap: {
    path: "/novaswap",
    title: "NovaSwap",
    label: "NovaSwap",
    group: "demo",
    load: () => import("./sites/NovaSwapPage.js"),
  },
  pixeldrop: {
    path: "/pixeldrop",
    title: "PixelDrop",
    label: "PixelDrop",
    group: "demo",
    load: () => import("./sites/PixelDropPage.js"),
  },
  orbityield: {
    path: "/orbityield",
    title: "OrbitYield",
    label: "OrbitYield",
    group: "demo",
    load: () => import("./sites/OrbitYieldPage.js"),
  },
  claimhub: {
    path: "/claimhub",
    title: "ClaimHub",
    label: "ClaimHub",
    group: "demo",
    load: () => import("./sites/ClaimHubPage.js"),
  },
  launchpad: {
    path: "/launchpad",
    title: "LaunchPad",
    label: "LaunchPad",
    group: "demo",
    load: () => import("./sites/LaunchPadPage.js"),
  },

  notFound: {
    path: "/*",
    title: "Not found",
    group: "utility",
    hidden: true,
    load: () => import("./pages/NotFoundPage.js"),
  },
});

export type ShowcaseRoute = keyof typeof routes;

/** The six demo paths, so the layout knows when to drop the marketing chrome. */
export const DEMO_PATHS: ReadonlySet<string> = new Set(
  Object.values(routes)
    .filter((route) => route.group === "demo")
    .map((route) => route.path),
);
