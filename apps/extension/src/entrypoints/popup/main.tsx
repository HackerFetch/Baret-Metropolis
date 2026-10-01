import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp.js";
import "../../styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root.");

createRoot(container).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
