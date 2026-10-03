import { home, hub } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { ArrowRight } from "lucide-react";
import type { JSX } from "react";
import { Link } from "react-router";
import { routeKeyFor, warm } from "../../../routes.js";
import { Img } from "../../../shared/Img.js";
import { VERDICT_TONE } from "../../../shared/tone.js";
import { T } from "../../../shared/type.js";
import { DARK_PRINT } from "../pillars/Tile.js";
import { CARD_MEDIA, WELL_GROUND } from "./cardMedia.js";

export type ShowcaseCardData = (typeof home.showcase.cards)[number];

/**
 * One site, one anchor. The product name's link stretches over the whole
 * item with an `::after`, so the item is the link and its accessible name
 * is the product name; the verdict and hook stay readable to screen
 * readers. The focus ring is drawn on the item (a ring on the anchor would
 * only circle the name).
 *
 * The tap cue is always visible, never hover-only: below 768 px a 16 px
 * arrow at the row's right edge; from 768 px a bottom line, "Open the
 * site" and the arrow, which nudges 4 px on hover and focus (with the
 * illustration's slow push, the only motion). Both are aria-hidden: the link
 * already names the site.
 *
 * One component, two shapes: below 1024 px a row (two columns from 768 px;
 * square well, text to the right, both top-aligned so the well never floats
 * below the name); from 1024 px a card (well on top, a 1 px border). The
 * text column is a size container: the verdict tag sits on its own line
 * under the name until that column is 22rem wide, then beside it.
 *
 * Press: the item takes --ground-deep for the length of the press, so a tap
 * on a phone answers before the route loads. Intent (pointer enter or focus)
 * warms the site's chunk once, and the navigation is a view transition.
 */
const FOCUS =
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-solid has-[a:focus-visible]:outline-[color:var(--accent)]";

const STRETCH = "after:absolute after:inset-0 focus-visible:outline-none";

const NUDGE =
  "size-4 shrink-0 transition-transform duration-150 ease-out group-hover/card:translate-x-1 group-has-[a:focus-visible]/card:translate-x-1 motion-reduce:transition-none";

/**
 * The page's only image hover: a slow 2.5% push on the card's illustration,
 * because the card is a real link. It sits on a wrapper so it never fights
 * the Img fade's transition; clipped by the well; off under reduced motion.
 */
const SLOW_ZOOM =
  "transition-transform duration-[600ms] ease-out-soft group-hover/card:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100";

/** The md+ cue: "Open the site" and the arrow, pinned to the bottom. */
function OpenCue(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="mt-auto hidden items-center gap-2 pt-4 font-sans font-semibold text-[14px] text-[color:var(--fg-muted)] leading-5 transition-colors duration-150 ease-out group-hover/card:text-[color:var(--fg)] group-has-[a:focus-visible]/card:text-[color:var(--fg)] md:flex"
    >
      {home.showcase.labels.open}
      <ArrowRight className={NUDGE} strokeWidth={1.5} />
    </span>
  );
}

/** The illustration well: one cover crop for all six, dimmed in dark theme (DARK_PRINT, shared with the bento tiles). */
function MediaWell({ href }: { href: string }): JSX.Element {
  const m = CARD_MEDIA[href];
  return (
    <div
      className={`relative size-[72px] shrink-0 overflow-hidden min-[380px]:size-[88px] lg:aspect-[9/4] lg:size-auto lg:w-full lg:border-b lg:border-[color:var(--rule)] ${DARK_PRINT}`}
      style={{ backgroundColor: WELL_GROUND }}
    >
      {m ? (
        <div className={`absolute inset-0 ${SLOW_ZOOM}`}>
          <Img
            asset={m.asset}
            fit="cover"
            position={m.position}
            className="absolute inset-0 size-full"
          />
        </div>
      ) : null}
    </div>
  );
}

/** The expected verdict: an sr-only label, then the tag, the item's only colour. */
function Verdict({ card }: { card: ShowcaseCardData }): JSX.Element {
  return (
    <span>
      <span className="sr-only">{home.showcase.labels.verdict} </span>
      <Tag tone={VERDICT_TONE[card.verdict]} size="sm">
        {hub.cardLabels.verdicts[card.verdict]}
      </Tag>
    </span>
  );
}

/** Starts loading the site's route chunk on intent, once (routes.warm). */
function warmCard(href: string): void {
  const key = routeKeyFor(href);
  if (key) warm(key);
}

/** One site: well, name, verdict under it, hook, then the tap cue. */
export function ShowcaseCard({ card }: { card: ShowcaseCardData }): JSX.Element {
  return (
    <article
      className={`group/card relative flex h-full items-start gap-4 py-4 transition-[background-color,border-color] duration-150 ease-out active:bg-[color:var(--ground-deep)] lg:flex-col lg:items-stretch lg:gap-0 lg:border lg:border-[color:var(--rule)] lg:bg-[color:var(--surface)] lg:py-0 lg:hover:border-[color:var(--fg)] lg:active:bg-[color:var(--ground-deep)] lg:has-[a:focus-visible]:border-[color:var(--fg)] ${FOCUS}`}
    >
      <MediaWell href={card.href} />
      <div className="@container/text flex min-w-0 flex-1 flex-col self-stretch lg:px-5 lg:py-4">
        <div className="flex flex-col items-start gap-1 @[22rem]/text:flex-row @[22rem]/text:items-center @[22rem]/text:justify-between @[22rem]/text:gap-4">
          <h3 className={`${T.h3} text-[color:var(--fg)]`}>
            <Link
              to={card.href}
              viewTransition
              className={STRETCH}
              onPointerEnter={() => warmCard(card.href)}
              onFocus={() => warmCard(card.href)}
            >
              {card.name}
            </Link>
          </h3>
          <Verdict card={card} />
        </div>
        <p className={`${T.body} mt-2 lg:mt-1.5`}>{card.hook}</p>
        <OpenCue />
      </div>
      <ArrowRight
        aria-hidden="true"
        className="ml-auto size-4 shrink-0 self-center text-[color:var(--fg-muted)] md:hidden"
        strokeWidth={1.5}
      />
    </article>
  );
}
