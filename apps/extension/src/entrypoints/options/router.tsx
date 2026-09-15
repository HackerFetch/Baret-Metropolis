import { createHashRouter } from "react-router";
import { routes } from "./routes.js";

const setup = Object.entries(routes).filter(([, route]) => route.group === "setup");
const inLayout = Object.entries(routes).filter(([, route]) => route.group !== "setup");

export const router = createHashRouter([
  ...setup.map(([, route]) => ({ path: route.path, lazy: route.load })),
  {
    path: "/",
    lazy: () => import("./OptionsLayout.js"),
    children: inLayout.map(([key, route]) =>
      route.path === "/"
        ? { index: true, lazy: route.load }
        : { path: key === "notFound" ? "*" : route.path.slice(1), lazy: route.load },
    ),
  },
]);
