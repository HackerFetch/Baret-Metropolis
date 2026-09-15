import { createBrowserRouter } from "react-router";

/**
 * React Router 8, data mode.
 *
 * Connect and Sign are popup routes: a dApp opens them in a separate window
 * through the wallet adapter, so they render without the app chrome.
 *
 * Route list matches docs/WALLET.md section 3 and packages/content/src/wallet.
 */
export const router = createBrowserRouter([
  { path: "/onboarding", lazy: () => import("./pages/OnboardingPage.js") },
  { path: "/connect", lazy: () => import("./pages/ConnectPage.js") },
  { path: "/sign", lazy: () => import("./pages/SignPage.js") },
  {
    path: "/",
    lazy: () => import("./layouts/AppLayout.js"),
    children: [
      { index: true, lazy: () => import("./pages/HomePage.js") },
      { path: "send", lazy: () => import("./pages/SendPage.js") },
      { path: "receive", lazy: () => import("./pages/ReceivePage.js") },
      { path: "history", lazy: () => import("./pages/HistoryPage.js") },
      { path: "policies", lazy: () => import("./pages/PoliciesPage.js") },
      { path: "agents", lazy: () => import("./pages/DelegationPage.js") },
      { path: "settings", lazy: () => import("./pages/SettingsPage.js") },
      { path: "*", lazy: () => import("./pages/NotFoundPage.js") },
    ],
  },
]);
