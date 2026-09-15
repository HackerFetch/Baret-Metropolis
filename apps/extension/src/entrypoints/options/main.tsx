import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./OptionsApp.js";
import "../../styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root.");

createRoot(container).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
