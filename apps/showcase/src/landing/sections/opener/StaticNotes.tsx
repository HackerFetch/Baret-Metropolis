import { home } from "@baret/content";
import { ArrowDown } from "lucide-react";
import type { JSX, MouseEvent } from "react";
import { Img } from "../../../shared/Img.js";
import { IDS, titleId } from "../../../shared/ids.js";
import { FRAME } from "../../../shared/layout.js";
import { T } from "../../../shared/type.js";
import { FRAMES } from "./frames.js";

/**
 * The opener under reduced motion: one finished screen. The Confirm button
 * (l-06, frame 0) with the three lines as one plain paragraph set straight
 * on the photo over a bottom scrim, then the hero.
 */

const FIRST = FRAMES[0];

/**
 * After the browser jumps to `#hero`, focus lands on the hero heading, so the
 * next Tab starts in the hero and a screen reader announces where it is.
 * `tabindex=-1` makes the heading focusable by script only.
 *
 * Chrome counts that scripted focus as :focus-visible and would draw the
 * orange ring round the whole headline, a second orange signal next to the
 * primary button. The heading is a landing point, not a control, so it drops
 * the ring; Tab can never reach it, so no control loses its focus indicator.
 */
const NO_RING = "focus-visible:outline-none";

function focusHeroTitle(_e: MouseEvent<HTMLDivElement>): void {
  window.requestAnimationFrame(() => {
    const h = document.getElementById(titleId("hero"));
    if (!h) return;
    if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
    h.classList.add(NO_RING);
    h.focus({ preventScroll: true });
  });
}

/**
 * The skip link is a quiet mono text link, not a second outlined button under
 * the header's Showcase action: 11 px caps, +8% tracking, an arrow. It sits
 * on a small solid graphite plate so it reads the same over every frame, and
 * keeps a 44 px hit area and the same orange focus ring as the buttons.
 */
const SKIP =
  "group inline-flex min-h-11 items-center gap-2 bg-graphite px-3 font-mono text-label uppercase tracking-[0.08em] text-chalk/80 transition-colors duration-150 hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

export function SkipLink(): JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the click comes from the link inside; this only hands focus on.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Enter on the link fires this same click.
    <div onClick={focusHeroTitle}>
      <a href={`#${IDS.hero}`} className={SKIP}>
        <span className="underline decoration-chalk/40 underline-offset-4 group-hover:decoration-chalk">
          {home.opener.skip}
        </span>
        <ArrowDown aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
      </a>
    </div>
  );
}

/** Accessible name of the opener region, from its dedicated content key. */
export const OPENER_LABEL = home.opener.regionLabel;

export function StaticNotes(): JSX.Element {
  return (
    <section
      id={IDS.opener}
      aria-label={OPENER_LABEL}
      data-band="dark"
      className="relative flex min-h-[calc(100svh-56px)] items-end bg-graphite"
    >
      {FIRST ? (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <Img
            asset={FIRST.asset}
            fit={FIRST.fit}
            position={FIRST.position}
            loading="priority"
            className={`absolute inset-0 size-full ${FIRST.zoom ?? ""}`}
          />
        </div>
      ) : null}
      <div className={`${FRAME} absolute inset-x-0 top-4 z-10 flex justify-end md:top-6`}>
        <SkipLink />
      </div>
      <div className={`${FRAME} relative w-full pb-4 pt-24 md:pb-8 lg:pb-12`}>
        {/* The same flat graphite band as the stage's LinePlate: no gradient scrim. */}
        <p
          className={`${T.line} w-full bg-[rgb(18_18_18/0.72)] p-4 text-chalk md:w-fit md:max-w-[560px] md:p-5 lg:max-w-[720px]`}
        >
          {home.opener.lines.join(" ")}
        </p>
      </div>
    </section>
  );
}
