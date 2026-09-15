import { orbityield } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";

/** /orbityield. Threat demo. Copy lives in packages/content. */
export function Component() {
  const [danger, setDanger] = useState(false);
  return <DemoSite content={orbityield} danger={danger} onToggle={setDanger} />;
}
