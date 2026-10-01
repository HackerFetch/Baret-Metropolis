import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./router.js";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root. Check index.html.");

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
