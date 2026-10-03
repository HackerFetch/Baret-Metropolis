import { Button, truncateAddress } from "@baret/ui";
import { FRAME } from "@baret/web-ui/lib/layout";
import type { JSX, ReactNode } from "react";

/**
 * A demo dApp's own header, in the site's palette: its glyph and name, a nav
 * that switches between the site's pages (`?view=`), and a wallet control
 * that never asks a real wallet (pressing it fills in the sample address).
 * On phones the nav drops to a row under the brand. Shared by the six sites;
 * each passes its own glyph, copy and views.
 */

function NavItems<V extends string>({
  nav,
  views,
  view,
  onView,
}: {
  nav: readonly string[];
  views: readonly V[];
  view: V;
  onView: (view: V) => void;
}): JSX.Element {
  const first = views[0];
  return (
    <>
      {nav.map((item, i) => {
        const key = views[i] ?? first;
        if (key === undefined) return null;
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

export function SiteHeader<V extends string>({
  brand,
  glyph,
  nav,
  views,
  view,
  onView,
  connect,
  connected,
  wallet,
  onConnect,
}: {
  brand: string;
  /** The site's mark, drawn in its accent. */
  glyph: ReactNode;
  nav: readonly string[];
  /** One view per nav item, in the same order. The first is the home page. */
  views: readonly V[];
  view: V;
  onView: (view: V) => void;
  connect: { readonly label: string; readonly connected: string } | undefined;
  connected: boolean;
  /** The address shown once connected: the sample, or the live demo address. */
  wallet: string;
  onConnect: () => void;
}): JSX.Element {
  const home = views[0];
  return (
    <header className="border-b border-[color:var(--rule)]">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-6`}>
        <button
          type="button"
          onClick={() => {
            if (home !== undefined) onView(home);
          }}
          className="flex items-center gap-3"
        >
          {glyph}
          <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-[color:var(--fg)]">
            {brand}
          </span>
        </button>

        <nav aria-label={brand} className="hidden items-center gap-8 md:flex">
          <NavItems nav={nav} views={views} view={view} onView={onView} />
        </nav>

        {connected ? (
          <span className="flex items-center gap-2 border border-[color:var(--rule-strong)] px-3 py-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-[color:var(--safe)]" />
            <span className="text-sm text-[color:var(--fg-muted)]">{connect?.connected}</span>
            <span className="font-mono text-sm text-[color:var(--fg)]">
              {truncateAddress(wallet)}
            </span>
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onConnect}>
            {connect?.label}
          </Button>
        )}
      </div>
      <nav
        aria-label={brand}
        className={`${FRAME} flex gap-6 overflow-x-auto border-t border-[color:var(--rule)] py-2 md:hidden`}
      >
        <NavItems nav={nav} views={views} view={view} onView={onView} />
      </nav>
    </header>
  );
}
