import { novaswap } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";

/** /novaswap. Threat demo. Copy lives in packages/content. */
export function Component() {
  const [danger, setDanger] = useState(false);
  return <DemoSite content={novaswap} danger={danger} onToggle={setDanger} />;
}
