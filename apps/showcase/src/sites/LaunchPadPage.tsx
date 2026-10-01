import { launchpad } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";

/** /launchpad. Threat demo. Copy lives in packages/content. */
export function Component() {
  const [danger, setDanger] = useState(false);
  return <DemoSite content={launchpad} danger={danger} onToggle={setDanger} />;
}
