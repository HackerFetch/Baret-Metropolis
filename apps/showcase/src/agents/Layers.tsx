import { agents } from "@baret/content";
import { ImgWell } from "@baret/web-ui/components/Img";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { staggerDelay } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { AGENTS_ART } from "../shared/assets.js";

/**
 * Three layers between an agent and its money, as three equal columns: the
 * check (a press drawn with its gauge), the guarded signer (the kit in its
 * box), the vault (a covered switch with a tag: caps and the kill switch).
 * Each: the drawing, the title, one paragraph, its points on hairlines. The
 * vault's revoke and the fail-closed rule live in the points and the FAQ,
 * not in blocks of their own.
 */

const ID = "layers";
const { layers } = agents;
const ART = [AGENTS_ART.check, AGENTS_ART.signer, AGENTS_ART.vault] as const;

export function Layers(): JSX.Element {
  return (
    <Section id={ID} ground="ground">
      <SectionHeader titleId={titleIdOf(ID)} title={layers.title} body={layers.body} />
      <ul className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
        {layers.items.map((item, i) => (
          <Reveal as="li" key={item.title} delay={staggerDelay(i)}>
            <ImgWell
              asset={ART[i] ?? AGENTS_ART.check}
              ratio="4/3"
              dim
              sizes="(min-width: 768px) 380px, 100vw"
              className="border border-[color:var(--rule)]"
            />
            <h3 className={`${T.h3} mt-5 text-[color:var(--fg)]`}>{item.title}</h3>
            <p className={`${T.body} mt-2`}>{item.body}</p>
            <ul className="mt-5 border-t border-[color:var(--rule)]">
              {item.points.map((point) => (
                <li
                  key={point}
                  className="border-b border-[color:var(--rule)] py-2 text-sm leading-normal text-[color:var(--fg)]"
                >
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>
      <p className={`${T.small} mt-8 max-w-[72ch]`}>{layers.note}</p>
    </Section>
  );
}
