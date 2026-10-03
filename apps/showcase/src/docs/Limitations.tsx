import { docs } from "@baret/content";
import { ImgWell } from "@baret/web-ui/components/Img";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { GRID } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { DOCS_ART } from "../shared/assets.js";

/**
 * Known limitations, flat and unapologetic: each line is a property of the
 * design, not a bug waiting for a fix. Tags on a wire at a site, one fallen
 * to the ground, sit beside the list: what a check does not catch.
 */

const ID = "limitations";
const { limitations } = docs;

export function Limitations(): JSX.Element {
  return (
    <Section id={ID} ground="ground">
      <SectionHeader titleId={titleIdOf(ID)} title={limitations.title} layout="stack" />
      <div className={`${GRID} mt-10 gap-y-8 lg:items-start`}>
        <Reveal className="col-span-4 md:col-span-8 lg:col-span-5">
          <ImgWell
            asset={DOCS_ART.limitations}
            ratio="3/2"
            sizes="(min-width: 1024px) 480px, 100vw"
            className="border border-[color:var(--rule)]"
          />
        </Reveal>
        <Reveal className="col-span-4 md:col-span-8 lg:col-span-7" delay={0.06}>
          <ul className="border-t border-[color:var(--rule)]">
            {limitations.items.map((item) => (
              <li
                key={item}
                className={`${T.body} border-b border-[color:var(--rule)] py-4 text-[color:var(--fg)]`}
              >
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
