import { walletFrame } from "@baret/content";
import { defineRoutes } from "@baret/routes";

const { titles } = walletFrame.meta;
const { labels } = walletFrame.nav;

/**
 * Every screen the standalone wallet serves.
 *
 * Three groups, and the group decides where a screen renders:
 *   app      inside the sidebar layout, and listed in the sidebar unless hidden
 *   popup    opened in its own window by a dApp, so no sidebar and no nav
 *   setup    full screen, one step at a time, no way out until it is done
 *
 * Titles and labels are copy, so they live in packages/content (walletFrame).
 */
export const routes = defineRoutes({
  home: {
    path: "/",
    title: titles.home,
    label: labels.home,
    group: "app",
    load: () => import("./pages/HomePage.js"),
  },
  // Send and Receive are Home's two main actions, so they leave the sidebar.
  send: {
    path: "/send",
    title: titles.send,
    label: labels.send,
    group: "app",
    hidden: true,
    load: () => import("./pages/SendPage.js"),
  },
  receive: {
    path: "/receive",
    title: titles.receive,
    label: labels.receive,
    group: "app",
    hidden: true,
    load: () => import("./pages/ReceivePage.js"),
  },
  history: {
    path: "/history",
    title: titles.history,
    label: labels.history,
    group: "app",
    load: () => import("./pages/HistoryPage.js"),
  },
  sites: {
    path: "/sites",
    title: titles.sites,
    label: labels.sites,
    group: "app",
    load: () => import("./pages/SitesPage.js"),
  },
  policies: {
    path: "/policies",
    title: titles.policies,
    label: labels.policies,
    group: "app",
    load: () => import("./pages/PoliciesPage.js"),
  },
  delegation: {
    path: "/agents",
    title: titles.delegation,
    label: labels.delegation,
    group: "app",
    load: () => import("./pages/DelegationPage.js"),
  },
  x402: {
    path: "/x402",
    title: titles.x402,
    label: labels.x402,
    group: "app",
    load: () => import("./pages/X402Page.js"),
  },
  settings: {
    path: "/settings",
    title: titles.settings,
    label: labels.settings,
    group: "app",
    load: () => import("./pages/SettingsPage.js"),
  },

  onboarding: {
    path: "/onboarding",
    title: titles.onboarding,
    group: "setup",
    hidden: true,
    load: () => import("./pages/OnboardingPage.js"),
  },

  connect: {
    path: "/connect",
    title: titles.connect,
    group: "popup",
    hidden: true,
    load: () => import("./pages/ConnectPage.js"),
  },
  sign: {
    path: "/sign",
    title: titles.sign,
    group: "popup",
    hidden: true,
    load: () => import("./pages/SignPage.js"),
  },

  notFound: {
    path: "/*",
    title: titles.notFound,
    hidden: true,
    load: () => import("./pages/NotFoundPage.js"),
  },
});

export type WalletRoute = keyof typeof routes;
