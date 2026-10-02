import { novaswap } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import type { JSX } from "react";
import { FRAME } from "../../shared/layout.js";
import { SAMPLE } from "./sample.js";

/**
 * NovaSwap's own header, in its cobalt palette. The nav is the fake site's
 * dressing, not working links, so it is hidden from assistive tech. The
 * wallet control never asks a real wallet: it fills in the sample address.
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

export function SiteHeader({
  connected,
  onConnect,
}: {
  connected: boolean;
  onConnect: () => void;
}): JSX.Element {
  return (
    <header className="border-b border-[color:var(--rule)]">
      <div className={`${FRAME} flex h-16 items-center justify-between gap-6`}>
        <span className="flex items-center gap-3">
          <NovaGlyph />
          <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-[color:var(--fg)]">
            {site.brand}
          </span>
        </span>

        <div aria-hidden="true" className="hidden items-center gap-8 md:flex">
          {site.nav.map((item, i) => (
            <span
              key={item}
              className={
                i === 0
                  ? "border-b-2 border-[color:var(--accent)] py-1 text-sm font-medium text-[color:var(--fg)]"
                  : "border-b-2 border-transparent py-1 text-sm text-[color:var(--fg-muted)]"
              }
            >
              {item}
            </span>
          ))}
        </div>

        {connected ? (
          <span className="flex items-center gap-2 border border-[color:var(--rule-strong)] px-3 py-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-[color:var(--safe)]" />
            <span className="text-sm text-[color:var(--fg-muted)]">{site.connect?.connected}</span>
            <span className="font-mono text-sm text-[color:var(--fg)]">
              {truncateAddress(SAMPLE.wallet)}
            </span>
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onConnect}>
            {site.connect?.label}
          </Button>
        )}
      </div>
    </header>
  );
}
