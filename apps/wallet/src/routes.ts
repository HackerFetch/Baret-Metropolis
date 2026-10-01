import { defineRoutes } from "@baret/routes";

/**
 * Every screen the standalone wallet serves.
 *
 * Three groups, and the group decides where a screen renders:
 *   app      inside the sidebar layout, and listed in the sidebar
 *   popup    opened in its own window by a dApp, so no sidebar and no nav
 *   setup    full screen, one step at a time, no way out until it is done
 */
export const routes = defineRoutes({
  home: {
    path: "/",
    title: "Baret Wallet",
    label: "Home",
    group: "app",
    load: () => import("./pages/HomePage.js"),
  },
  send: {
    path: "/send",
    title: "Send",
    label: "Send",
    group: "app",
    load: () => import("./pages/SendPage.js"),
  },
  receive: {
    path: "/receive",
    title: "Receive",
    label: "Receive",
    group: "app",
    load: () => import("./pages/ReceivePage.js"),
  },
  history: {
    path: "/history",
    title: "Activity",
    label: "Activity",
    group: "app",
    load: () => import("./pages/HistoryPage.js"),
  },
  policies: {
    path: "/policies",
    title: "Your rules",
    label: "Rules",
    group: "app",
    load: () => import("./pages/PoliciesPage.js"),
  },
  delegation: {
    path: "/agents",
    title: "Agent delegation",
    label: "Agents",
    group: "app",
    load: () => import("./pages/DelegationPage.js"),
  },
  settings: {
    path: "/settings",
    title: "Settings",
    label: "Settings",
    group: "app",
    load: () => import("./pages/SettingsPage.js"),
  },

  onboarding: {
    path: "/onboarding",
    title: "Set up your wallet",
    group: "setup",
    hidden: true,
    load: () => import("./pages/OnboardingPage.js"),
  },

  connect: {
    path: "/connect",
    title: "Connection request",
    group: "popup",
    hidden: true,
    load: () => import("./pages/ConnectPage.js"),
  },
  sign: {
    path: "/sign",
    title: "Sign request",
    group: "popup",
    hidden: true,
    load: () => import("./pages/SignPage.js"),
  },

  notFound: {
    path: "/*",
    title: "Not found",
    hidden: true,
    load: () => import("./pages/NotFoundPage.js"),
  },
});

export type WalletRoute = keyof typeof routes;
