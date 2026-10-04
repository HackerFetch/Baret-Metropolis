import { createHashRouter } from "react-router";
import * as Layout from "./OptionsLayout.js";
import { Blank, PageError, RouteError } from "./parts/RouteError.js";
import { routes } from "./routes.js";

const setup = Object.entries(routes).filter(([, route]) => route.group === "setup");
const inLayout = Object.entries(routes).filter(([, route]) => route.group !== "setup");

/**
 * The frame is static, so it paints at once and also stands in while a lazy
 * page loads on first visit (its HydrateFallback). The error screens sit on
 * the route objects, outside any lazy chunk: a chunk that fails to load
 * still gets the branded screen with a reload. A page that fails keeps the
 * frame around it; setup and the frame itself fail to the whole tab.
 */
export const router = createHashRouter([
  ...setup.map(([, route]) => ({
    path: route.path,
    lazy: route.load,
    HydrateFallback: Blank,
    ErrorBoundary: RouteError,
  })),
  {
    path: "/",
    Component: Layout.Component,
    HydrateFallback: Layout.Component,
    ErrorBoundary: RouteError,
    children: inLayout.map(([key, route]) =>
      route.path === "/"
        ? { index: true, lazy: route.load, ErrorBoundary: PageError }
        : {
            path: key === "notFound" ? "*" : route.path.slice(1),
            lazy: route.load,
            ErrorBoundary: PageError,
          },
    ),
  },
]);
