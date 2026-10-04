import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ExtensionProvider } from "../../data/store.js";
import { readStart, type Start } from "../../lib/start.js";
import { PopupApp } from "./PopupApp.js";
import "../../styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root.");

// Opened as a page rather than as the toolbar popup (a preview, a review), the
// window is wider than the popup: centre the 360 by 600 frame on the ground.
// On a phone the browser opens the popup full screen: fill it instead.
if (window.matchMedia("(pointer: coarse)").matches) document.documentElement.dataset.view = "full";
else if (window.innerWidth > 420) document.documentElement.dataset.view = "tab";

/** The sample state in the address bar, so a reload or a shared link keeps it. */
function remember(start: Start): void {
  const params = new URLSearchParams();
  if (start.scenario === "empty") params.set("sample", "empty");
  params.set("phase", start.phase);
  if (start.phase === "signing") params.set("request", start.request);
  if (start.phase === "connecting") params.set("connect", start.connect);
  history.replaceState(null, "", `?${params.toString()}`);
}

function Root() {
  const [start, setStart] = useState(() => readStart(location.search));
  const [run, setRun] = useState(0);
  return (
    <LandingMotion>
      <ExtensionProvider
        key={run}
        start={{ scenario: start.scenario, drift: start.phase === "alert" }}
      >
        <PopupApp
          key={run}
          start={start}
          onRestart={(next) => {
            remember(next);
            setStart(next);
            setRun((n) => n + 1);
          }}
        />
      </ExtensionProvider>
    </LandingMotion>
  );
}

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
