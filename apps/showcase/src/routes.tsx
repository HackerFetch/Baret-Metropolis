import { createBrowserRouter } from "react-router";

/**
 * React Router 8, data mode.
 *
 * Declarative mode would mean hand-rolling loading states for twelve routes.
 * Framework mode would add a route-config file, generated types and an SSR
 * shape we would then configure back off. Data mode is the fit.
 *
 * Every page is lazy so the six demo sites, which are heavy and rarely
 * visited together, stay out of the first load. Each module exports
 * `Component` and may export `loader` and `ErrorBoundary`.
 *
 * Route list matches docs/FRONTEND.md and packages/content/src/showcase.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    lazy: () => import("./layouts/RootLayout.js"),
    children: [
      { index: true, lazy: () => import("./pages/HomePage.js") },
      { path: "home", lazy: () => import("./pages/HomePage.js") },
      { path: "showcase", lazy: () => import("./pages/HubPage.js") },
      { path: "agents", lazy: () => import("./pages/AgentsPage.js") },
      { path: "docs", lazy: () => import("./pages/DocsPage.js") },
      { path: "install", lazy: () => import("./pages/InstallPage.js") },

      // The six demo sites. Each renders without the marketing chrome.
      { path: "scrybe", lazy: () => import("./sites/ScrybePage.js") },
      { path: "novaswap", lazy: () => import("./sites/NovaSwapPage.js") },
      { path: "pixeldrop", lazy: () => import("./sites/PixelDropPage.js") },
      { path: "orbityield", lazy: () => import("./sites/OrbitYieldPage.js") },
      { path: "claimhub", lazy: () => import("./sites/ClaimHubPage.js") },
      { path: "launchpad", lazy: () => import("./sites/LaunchPadPage.js") },

      { path: "*", lazy: () => import("./pages/NotFoundPage.js") },
    ],
  },
]);
