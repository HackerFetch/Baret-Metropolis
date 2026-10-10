import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { ExtensionProvider } from "../../data/store.js";
import { isLivePage } from "../../lib/live.js";
import { readStart } from "../../lib/start.js";
import { router } from "./router.js";
import "../../styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root.");

// The sample wallet the page starts from: options.html?sample=empty for a new
// one, ?offline=1 when Baret does not answer, ?sample=loading while it never does.
const start = readStart(location.search, "ready");

// Installed, with no sample named in the address: the real wallet. Its code
// loads only then, so the sample never touches the extension's APIs.
if (isLivePage()) {
  void import("../../live/boot.js").then(({ mountLiveOptions }) => mountLiveOptions(container));
} else {
  renderSample();
}

function renderSample(): void {
  if (!container) return;
  createRoot(container).render(
    <StrictMode>
      <LandingMotion>
        <ExtensionProvider start={{ scenario: start.scenario, reachable: start.reachable }}>
          <RouterProvider router={router} />
        </ExtensionProvider>
      </LandingMotion>
    </StrictMode>,
  );
}
