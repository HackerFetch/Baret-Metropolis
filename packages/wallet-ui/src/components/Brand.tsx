import { common } from "@baret/content";
import { Mark } from "@baret/ui";
import type { JSX } from "react";

/** The mark and the stencil wordmark, at the top of every wallet surface. */
export function Brand(): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <Mark size={28} slit="var(--ground-deep)" />
      <span className="font-stencil text-2xl uppercase tracking-[0.04em] text-[color:var(--fg)]">
        {common.brand.wordmark}
      </span>
    </div>
  );
}
