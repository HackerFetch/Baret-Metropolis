import { createBrowserRouter } from "react-router";
import { routeObjects } from "./routeTree.js";

/** The browser router over the route tree (routeTree.tsx). */
export const router = createBrowserRouter(routeObjects);
