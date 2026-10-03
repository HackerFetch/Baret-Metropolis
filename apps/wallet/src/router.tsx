import { createBrowserRouter } from "react-router";
import * as RootLayout from "./layouts/RootLayout.js";
import { routes } from "./routes.js";

/**
 * The router, built from the registry.
 *
 * One root route carries the shell every screen shares (RootLayout: motion,
 * the cursor, smooth scroll, scroll restoration). Under it, popup and setup
 * routes sit outside the sidebar layout because they must not inherit it: a
 * dApp opens /connect and /sign in a separate window, and onboarding owns the
 * whole screen until it finishes. Everything else renders inside AppLayout.
 */
const standalone = Object.entries(routes).filter(
  ([, route]) => route.group === "popup" || route.group === "setup",
);

const inLayout = Object.entries(routes).filter(
  ([, route]) => route.group !== "popup" && route.group !== "setup",
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout.Component,
    ErrorBoundary: RootLayout.ErrorBoundary,
    children: [
      ...standalone.map(([, route]) => ({ path: route.path.slice(1), lazy: route.load })),
      {
        lazy: () => import("./layouts/AppLayout.js"),
        children: inLayout.map(([key, route]) =>
          route.path === "/"
            ? { index: true, lazy: route.load }
            : { path: key === "notFound" ? "*" : route.path.slice(1), lazy: route.load },
        ),
      },
    ],
  },
]);
