import { common } from "@baret/content";
import { Mark } from "@baret/ui";
import type { JSX } from "react";

/** Where the mark always leads, from every wallet and extension surface. */
export const BRAND_HOME = "https://usebaret.com";

/**
 * The mark and the stencil wordmark, at the top of every wallet surface. It
 * always links to usebaret.com, in a new tab: it leaves the wallet, and a new
 * tab keeps the wallet's session (and the extension's window) where it was.
 * The visor slit must match the surface behind the mark: --ground-deep in the
 * headers and sidebars, `"var(--ground)"` on a plain screen.
 */
export function Brand({ slit = "var(--ground-deep)" }: { slit?: string } = {}): JSX.Element {
  return (
    <a
      href={BRAND_HOME}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${common.brand.name}, usebaret.com`}
      className="flex min-h-11 w-max items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
    >
      {/* The wordmark beside it names the product; the mark stays silent. */}
      <Mark size={28} slit={slit} decorative />
      <span className="font-stencil text-2xl uppercase tracking-[0.04em] text-[color:var(--fg)]">
        {common.brand.wordmark}
      </span>
    </a>
  );
}
