import { createBrowserRouter } from "react-router";
import { routes } from "./routes.js";

/**
 * The router, built from the registry.
 *
 * Popup and setup routes sit at the top level because they must not inherit
 * the sidebar. A dApp opens /connect and /sign in a separate window, and
 * onboarding owns the whole screen until it finishes.
 */
const standalone = Object.entries(routes).filter(
  ([, route]) => route.group === "popup" || route.group === "setup",
);

const inLayout = Object.entries(routes).filter(
  ([, route]) => route.group !== "popup" && route.group !== "setup",
);

export const router = createBrowserRouter([
  ...standalone.map(([, route]) => ({ path: route.path, lazy: route.load })),
  {
    path: "/",
    lazy: () => import("./layouts/AppLayout.js"),
    children: inLayout.map(([key, route]) =>
      route.path === "/"
        ? { index: true, lazy: route.load }
        : { path: key === "notFound" ? "*" : route.path.slice(1), lazy: route.load },
    ),
  },
]);
