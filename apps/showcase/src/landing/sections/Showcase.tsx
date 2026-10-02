import { home } from "@baret/content";
import type { JSX } from "react";
import { LinkButton } from "../shared/LinkButton.js";
import { Reveal } from "../shared/Reveal.js";
import { SectionFrame } from "../shared/SectionFrame.js";
import { SectionHeader } from "../shared/SectionHeader.js";
import { T } from "../shared/type.js";
import { ShowcaseCard } from "./showcase/ShowcaseCard.js";

/**
 * Six dApps: the six fake sites, one list in the DOM. Below 1024 px each
 * item is a row split by 1 px rules (one column, two from 768 px); from
 * 1024 px a three-column grid of cards. Each site is one link. A footer
 * follows: the notice on the left, a ghost link into the showcase on the
 * right (stacked below 768 px).
 */
export function ShowcaseSection(): JSX.Element {
  const s = home.showcase;
  return (
    <SectionFrame sectionKey="showcase" ground="ground">
      <SectionHeader sectionKey="showcase" layout="split" title={s.title} body={s.body} />
      <Reveal className="mt-10">
        <ul className="border-t border-[color:var(--rule)] md:grid md:grid-cols-2 md:gap-x-8 lg:grid-cols-3 lg:gap-6 lg:border-t-0">
          {s.cards.map((card) => (
            <li key={card.href} className="border-b border-[color:var(--rule)] lg:border-b-0">
              <ShowcaseCard card={card} />
            </li>
          ))}
        </ul>
      </Reveal>
      <div className="mt-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className={`${T.small} max-w-[60ch]`}>{s.notice}</p>
        <LinkButton href={s.action.href} label={s.action.label} variant="ghost" />
      </div>
    </SectionFrame>
  );
}
