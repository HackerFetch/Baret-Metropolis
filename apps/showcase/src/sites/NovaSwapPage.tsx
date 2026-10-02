import { novaswap } from "@baret/content";
import { useState } from "react";
import { DemoSite } from "./DemoSite.js";
import { DappTheme } from "./theme/DappTheme.js";

/**
 * /novaswap. Threat demo, in NovaSwap's own palette (cobalt on steel). Copy
 * lives in packages/content. The page design lands on top of this theme.
 */
export function Component() {
  const [danger, setDanger] = useState(false);
  return (
    <DappTheme name="novaswap">
      <DemoSite content={novaswap} danger={danger} onToggle={setDanger} />
    </DappTheme>
  );
}
