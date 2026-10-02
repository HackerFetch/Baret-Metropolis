import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./router.js";
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

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
