import { createBrowserRouter } from "react-router";
import * as AppLayout from "./layouts/AppLayout.js";
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
 *
 * AppLayout is imported statically and the root paints it as its
 * HydrateFallback, so the frame and the sample notice show with the entry
 * chunk while the page's own chunk loads (one lazy hop, not two). Each route
 * carries its title in its handle; RootLayout reads it from the match, so
 * /send/ gets the Send title too.
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
    HydrateFallback: RootLayout.HydrateFallback,
    ErrorBoundary: RootLayout.ErrorBoundary,
    children: [
      ...standalone.map(([, route]) => ({
        path: route.path.slice(1),
        handle: { title: route.title },
        lazy: route.load,
      })),
      {
        Component: AppLayout.Component,
        ErrorBoundary: AppLayout.ErrorBoundary,
        children: inLayout.map(([key, route]) =>
          route.path === "/"
            ? { index: true, handle: { title: route.title }, lazy: route.load }
            : {
                path: key === "notFound" ? "*" : route.path.slice(1),
                handle: { title: route.title },
                lazy: route.load,
              },
        ),
      },
    ],
  },
]);
