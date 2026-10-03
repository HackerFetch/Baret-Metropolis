import { novaswap } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import type { JSX } from "react";
import { FRAME } from "../../shared/layout.js";

/**
 * NovaSwap's own header, in its cobalt palette. The nav switches between the
 * site's four pages (Swap, Pools, Stats, Docs); on phones it drops to a row
 * under the brand. The wallet control never asks a real wallet: it fills in
 * the sample address.
 */

const { site } = novaswap;

/** NovaSwap's mark: a four-point star in the site's accent. */
function NovaGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-[color:var(--accent)]">
      <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" />
    </svg>
  );
}

export const VIEWS = ["swap", "pools", "stats", "docs"] as const;
export type View = (typeof VIEWS)[number];

function NavItems({ view, onView }: { view: View; onView: (view: View) => void }): JSX.Element {
  return (
    <>
      {site.nav.map((item, i) => {
        const key = VIEWS[i] ?? "swap";
        const active = key === view;
        return (
          <button
            key={item}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onView(key)}
            className={`shrink-0 border-b-2 py-1 text-sm transition-colors ${active ? "border-[color:var(--accent)] font-medium text-[color:var(--fg)]" : "border-transparent text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"}`}
          >
            {item}
          </button>
        );
      })}
    </>
  );
}

export function SiteHeader({
  connected,
  wallet,
  onConnect,
  view,
  onView,
}: {
  connected: boolean;
  /** The address shown once connected: the sample, or the live demo address. */
  wallet: string;
  onConnect: () => void;
  view: View;
  onView: (view: View) => void;
}): JSX.Element {
  return (
    <header className="border-b border-[color:var(--rule)]">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-6`}>
        <button type="button" onClick={() => onView("swap")} className="flex items-center gap-3">
          <NovaGlyph />
          <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-[color:var(--fg)]">
            {site.brand}
          </span>
        </button>

        <nav aria-label={site.brand} className="hidden items-center gap-8 md:flex">
          <NavItems view={view} onView={onView} />
        </nav>

        {connected ? (
          <span className="flex items-center gap-2 border border-[color:var(--rule-strong)] px-3 py-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-[color:var(--safe)]" />
            <span className="text-sm text-[color:var(--fg-muted)]">{site.connect?.connected}</span>
            <span className="font-mono text-sm text-[color:var(--fg)]">
              {truncateAddress(wallet)}
            </span>
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onConnect}>
            {site.connect?.label}
          </Button>
        )}
      </div>
      <nav
        aria-label={site.brand}
        className={`${FRAME} flex gap-6 overflow-x-auto border-t border-[color:var(--rule)] py-2 md:hidden`}
      >
        <NavItems view={view} onView={onView} />
      </nav>
    </header>
  );
}
