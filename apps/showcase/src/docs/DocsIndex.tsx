import { docs } from "@baret/content";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { DEEP_FILL, FRAME, SECTION_PAD } from "@baret/web-ui/lib/layout";
import { staggerDelay } from "@baret/web-ui/lib/motion";
import type { JSX } from "react";
import { DocCard } from "./DocCard.js";
import { slug } from "./docs.js";

/**
 * The index: four groups in one deep band, so they read as one list. Each
 * group is its own section with an anchor (the slug of its title; /agents
 * links to #contracts-and-payments), a split header and a row of cards sized
 * to the group: two, three or four across from 1024 px, two from 768 px, one
 * on phones.
 */

const COLS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function DocsIndex(): JSX.Element {
  return (
    <div
      className={`${DEEP_FILL} dark:border-t dark:border-[color:var(--rule-strong)] ${SECTION_PAD}`}
    >
      <div className={`${FRAME} grid gap-16 lg:gap-24`}>
        {docs.groups.map((group) => {
          const id = slug(group.title);
          const cols = COLS[group.cards.length] ?? "lg:grid-cols-3";
          return (
            <section key={id} id={id} aria-labelledby={titleIdOf(id)}>
              <SectionHeader titleId={titleIdOf(id)} title={group.title} body={group.body} />
              <ul className={`mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 ${cols}`}>
                {group.cards.map((card, i) => (
                  <Reveal as="li" key={card.file} delay={staggerDelay(i % 4)}>
                    <DocCard card={card} wide={group.cards.length === 2} />
                  </Reveal>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
