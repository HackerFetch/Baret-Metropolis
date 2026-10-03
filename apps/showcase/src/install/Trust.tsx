import { install } from "@baret/content";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { staggerDelay } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";

/**
 * What Baret can and cannot do, said before anyone loads it. The header
 * explains why it asks for every site; three equal lists follow (it can, it
 * cannot, who else sees what), then the audit fact and the source.
 */

const ID = "trust";
const { trust } = install;
const LISTS = [trust.can, trust.cannot, trust.others] as const;

export function Trust(): JSX.Element {
  return (
    <Section id={ID} ground="ground">
      <SectionHeader
        titleId={titleIdOf(ID)}
        title={trust.title}
        body={trust.siteAccess.body}
        layout="split"
      />
      <ul className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
        {LISTS.map((list, i) => (
          <Reveal as="li" key={list.title} delay={staggerDelay(i)}>
            <h3 className={`${T.h3} text-[color:var(--fg)]`}>{list.title}</h3>
            <ul className="mt-4 border-t border-[color:var(--rule)]">
              {list.points.map((point) => (
                <li
                  key={point}
                  className="border-b border-[color:var(--rule)] py-3 text-sm leading-normal text-[color:var(--fg)] md:text-base"
                >
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-10 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <p className={`${T.lead} text-[color:var(--fg)]`}>{trust.audit.body}</p>
        <LinkButton
          href={trust.audit.action.href}
          label={trust.audit.action.label}
          icon="arrow-up-right"
        />
      </Reveal>
    </Section>
  );
}
