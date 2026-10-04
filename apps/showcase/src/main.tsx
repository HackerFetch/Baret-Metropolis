import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { routeObjects } from "./router.js";
import "./index.css";

// index.html ships a static head (title, description, og:*, twitter:*) for
// link-preview bots, which never run this script (IMPROVE G1). In a browser
// RootLayout renders the per-route <title> and <meta> instead, so the static
// copies go first and the document never carries two titles. The og:* and
// twitter:* tags describe the landing only, so they go too: left in place they
// would keep the home og:title on every other route of the live document.
const STATIC_HEAD = '[data-static-head], meta[property^="og:"], meta[name^="twitter:"]';
for (const node of document.querySelectorAll(STATIC_HEAD)) node.remove();

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root. Check index.html.");

const app = (
  <StrictMode>
    <RouterProvider router={createBrowserRouter(routeObjects)} />
  </StrictMode>
);

// "/" ships prerendered (scripts/prerender.mjs), so React takes over the
// markup already on screen instead of drawing it again. A host that answers
// an unknown path with index.html sends that markup too; the flag set in
// index.html keeps it hidden, and it is dropped here before the right page
// renders.
if (location.pathname === "/" && container.firstElementChild) {
  hydrateRoot(container, app);
} else {
  container.replaceChildren();
  delete document.documentElement.dataset.prerenderHidden;
  createRoot(container).render(app);
}
