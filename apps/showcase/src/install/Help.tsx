import { install } from "@baret/content";
import { Disclosures } from "@baret/web-ui/components/Disclosures";
import { ImgWell } from "@baret/web-ui/components/Img";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { GRID } from "@baret/web-ui/lib/layout";
import type { JSX } from "react";
import { INSTALL_ART } from "../shared/assets.js";

/**
 * If something goes wrong: the symptom in the browser's own words, the fix
 * one click away. One exclusive group, so opening one closes the others.
 * Cutters taking a tag off its wire sit beside the list from 1024 px.
 */

const ID = "help";
const { troubleshooting } = install;
const ITEMS = troubleshooting.items.map((item) => ({ summary: item.symptom, body: item.fix }));

export function Help(): JSX.Element {
  return (
    <Section id={ID} ground="deep">
      <SectionHeader titleId={titleIdOf(ID)} title={troubleshooting.title} layout="stack" />
      <div className={`${GRID} mt-10 gap-y-8 lg:items-start`}>
        <Reveal className="col-span-4 md:col-span-8 lg:col-span-8">
          <Disclosures name="install-help" items={ITEMS} />
        </Reveal>
        <Reveal className="hidden lg:col-span-4 lg:block" delay={0.06}>
          <ImgWell
            asset={INSTALL_ART.help}
            ratio="4/5"
            sizes="380px"
            className="border border-[color:var(--rule)]"
          />
        </Reveal>
      </div>
    </Section>
  );
}
