import { common } from "@baret/content";
import { Mark } from "@baret/ui";
import type { JSX } from "react";

/**
 * The mark and the stencil wordmark, at the top of every wallet surface. The
 * visor slit must match the surface behind the mark: --ground-deep in the
 * headers and sidebars, `"var(--ground)"` on a plain screen.
 */
export function Brand({ slit = "var(--ground-deep)" }: { slit?: string } = {}): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {/* The wordmark beside it names the product; the mark stays silent. */}
      <Mark size={28} slit={slit} decorative />
      <span className="font-stencil text-2xl uppercase tracking-[0.04em] text-[color:var(--fg)]">
        {common.brand.wordmark}
      </span>
    </div>
  );
}
