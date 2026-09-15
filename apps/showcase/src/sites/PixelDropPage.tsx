import { pixeldrop } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";

/** /pixeldrop. Threat demo. Copy lives in packages/content. */
export function Component() {
  const [danger, setDanger] = useState(false);
  return <DemoSite content={pixeldrop} danger={danger} onToggle={setDanger} />;
}
