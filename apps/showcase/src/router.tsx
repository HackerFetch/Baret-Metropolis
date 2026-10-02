import { createBrowserRouter } from "react-router";
import * as RootLayout from "./layouts/RootLayout.js";
import * as HomePage from "./pages/HomePage.js";
import { routes } from "./routes.js";

/**
 * A page's own meta description, loaded with its chunk and handed to
 * RootLayout as the route handle, so the live head matches the static
 * dist/<route>/index.html that scripts/head.mjs writes. Each lookup is a
 * dynamic import so the page copy stays in the page chunk, not the entry.
 * The path points at the content file itself, never the barrel: importing
 * the @baret/content barrel (statically or dynamically) pulled all four
 * pages' copy into the entry chunk (+27 KB raw, measured). @baret/content now
 * exports `./showcase/*.content`; switch these to
 * `@baret/content/showcase/<name>.content` after the next dev-server restart
 * (a running Vite server keeps the old exports map cached).
 */
const DESCRIBE: Partial<Record<keyof typeof routes, () => Promise<string>>> = {
  showcase: () =>
    import("../../../packages/content/src/showcase/hub.content.js").then(
      ({ hub }) => hub.meta.description,
    ),
  agents: () =>
    import("../../../packages/content/src/showcase/agents.content.js").then(
      ({ agents }) => agents.meta.description,
    ),
  docs: () =>
    import("../../../packages/content/src/showcase/docs.content.js").then(
      ({ docs }) => docs.meta.description,
    ),
  install: () =>
    import("../../../packages/content/src/showcase/install.content.js").then(
      ({ install }) => install.meta.description,
    ),
};

/**
 * The router, built from the registry so a new page cannot be added to one
 * without the other.
 *
 * Data mode rather than framework mode: this is a client-rendered site with
 * twelve routes, so loaders and error boundaries are worth having and a route
 * config file, generated types and an SSR shape are not.
 *
 * The layout and the landing are imported statically (IMPROVE E2): "/" is the
 * entry for nearly every visit, and two lazy hops in a row held the first
 * frame back by about a second. Every other route stays lazy. Because nothing
 * on "/" is lazy any more, no HydrateFallback is needed.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout.Component,
    ErrorBoundary: RootLayout.ErrorBoundary,
    children: Object.entries(routes).map(([key, route]) =>
      route.path === "/"
        ? { index: true, Component: HomePage.Component }
        : {
            path: key === "notFound" ? "*" : route.path.slice(1),
            lazy: async () => {
              const describe = DESCRIBE[key as keyof typeof routes];
              const [page, description] = await Promise.all([route.load(), describe?.()]);
              return description ? { ...page, handle: { description } } : page;
            },
          },
    ),
  },
]);
