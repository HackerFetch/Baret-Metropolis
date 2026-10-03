import { install } from "@baret/content";
import { useEffect, useState } from "react";
import { type Browser, type BuildId, detectBrowser, leadBuild } from "../install/builds.js";
import { Help } from "../install/Help.js";
import { InstallHero } from "../install/InstallHero.js";
import { InstallSteps } from "../install/InstallSteps.js";
import { Trust } from "../install/Trust.js";
import { INSTALL_ART } from "../shared/assets.js";
import { ClosingBand } from "../shared/ClosingBand.js";

/**
 * /install. Five blocks (owner's order, 2026-10-03): the download in the
 * hero, the three steps for the visitor's browser, what Baret can and cannot
 * do, help when something goes wrong, and the way to try it. "What happens
 * next" and "What you get" are cut.
 *
 * The browser is read on the client after the first render (which assumes
 * "unknown"), so the static page and the hydrated one agree; the steps follow
 * it until the visitor picks one.
 */
export function Component() {
  const [browser, setBrowser] = useState<Browser>("unknown");
  const [picked, setPicked] = useState<BuildId | null>(null);

  useEffect(() => {
    setBrowser(detectBrowser(navigator.userAgent));
  }, []);

  const { cta } = install;
  return (
    <div className="overflow-x-clip">
      <InstallHero browser={browser} />
      <InstallSteps browser={picked ?? leadBuild(browser)} onBrowser={setPicked} />
      <Trust />
      <Help />
      <ClosingBand
        title={cta.title}
        body={cta.body}
        primary={cta.actions.primary}
        secondary={cta.actions.secondary}
        picture={{ asset: INSTALL_ART.cta, position: "40% 50%" }}
      />
    </div>
  );
}
