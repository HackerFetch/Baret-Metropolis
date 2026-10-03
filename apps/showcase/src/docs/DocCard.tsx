import { docs } from "@baret/content";
import { Img } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { ArrowUpRight } from "lucide-react";
import type { JSX } from "react";
import { DOCS_CARD_ART } from "../shared/assets.js";
import { fileName, fileUrl } from "./docs.js";

/**
 * One document, one link: the title's anchor stretches over the whole card,
 * so the card opens the file on GitHub and its accessible name is the title.
 * The line drawing sits contained on its own blueprint paper (no seam), and
 * the foot names the file in mono with the "Read it on GitHub" cue. Hover:
 * the border turns --fg and the drawing pushes 2.5 %.
 */

type Card = (typeof docs.groups)[number]["cards"][number];

const FOCUS =
  "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-solid has-[a:focus-visible]:outline-[color:var(--accent)]";
const PUSH =
  "transition-transform duration-[600ms] ease-out-soft group-hover/card:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100";

export function DocCard({ card, wide = false }: { card: Card; wide?: boolean }): JSX.Element {
  const art = DOCS_CARD_ART[card.file];
  return (
    <article
      className={`group/card relative flex h-full flex-col border border-[color:var(--rule)] bg-[color:var(--surface)] transition-colors duration-150 ease-out hover:border-[color:var(--fg)] has-[a:focus-visible]:border-[color:var(--fg)] ${FOCUS}`}
    >
      {art ? (
        <div
          className={`relative overflow-hidden border-b border-[color:var(--rule)] dark:brightness-[0.78] dark:contrast-[1.05] ${wide ? "aspect-[4/3] lg:aspect-[16/9]" : "aspect-[4/3]"}`}
          style={{ backgroundColor: art.ground }}
        >
          <div className={`absolute inset-0 ${PUSH}`}>
            <Img
              asset={art}
              fit="contain"
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
              className="absolute inset-0 size-full p-4"
            />
          </div>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <h3 className={`${T.h3} text-[color:var(--fg)]`}>
          <a
            href={fileUrl(card.file)}
            rel="noreferrer"
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {card.title}
          </a>
        </h3>
        <p className={`${T.body} mt-2`}>{card.body}</p>
        <div aria-hidden="true" className="mt-auto pt-6">
          <div className="flex flex-col items-start gap-1 border-t border-[color:var(--rule)] pt-3">
            {/* The file name keeps its own case: ARCHITECTURE.md, not .MD. */}
            <span className="font-mono text-label text-[color:var(--fg-muted)]">
              {fileName(card.file)}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--fg-muted)] transition-colors duration-150 group-hover/card:text-[color:var(--fg)]">
              {docs.open}
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
