import { createBrowserRouter } from "react-router";
import { routes } from "./routes.js";

/**
 * The router, built from the registry so a new page cannot be added to one
 * without the other.
 *
 * Data mode rather than framework mode: this is a client-rendered site with
 * twelve routes, so loaders and error boundaries are worth having and a route
 * config file, generated types and an SSR shape are not.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    lazy: () => import("./layouts/RootLayout.js"),
    children: Object.entries(routes).map(([key, route]) =>
      route.path === "/"
        ? { index: true, lazy: route.load }
        : { path: key === "notFound" ? "*" : route.path.slice(1), lazy: route.load },
    ),
  },
]);
