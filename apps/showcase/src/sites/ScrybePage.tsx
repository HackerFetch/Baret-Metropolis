import { scrybe } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";

/** /scrybe. Threat demo. Copy lives in packages/content. */
export function Component() {
  const [danger, setDanger] = useState(false);
  return <DemoSite content={scrybe} danger={danger} onToggle={setDanger} />;
}
