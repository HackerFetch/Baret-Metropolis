import { claimhub } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";

/** /claimhub. Threat demo. Copy lives in packages/content. */
export function Component() {
  const [danger, setDanger] = useState(false);
  return <DemoSite content={claimhub} danger={danger} onToggle={setDanger} />;
}
