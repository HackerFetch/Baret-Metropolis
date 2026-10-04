import { agents, common } from "@baret/content";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { Img } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Parallax } from "@baret/web-ui/components/Parallax";
import { titleIdOf } from "@baret/web-ui/components/Section";
import { splitLead } from "@baret/web-ui/components/SectionHeader";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { FRAME, GRID } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { AGENTS_ART, LCP_SIZES } from "../shared/assets.js";

/**
 * The agents page opens like the landing's hero, at night: robot carts with
 * tags crossing a site (a-01) fill the section from 1024 px under one flat
 * 35 % graphite veil and drift a little with the scroll; below 1024 px the
 * photo is a band on top and the copy follows on graphite. The claim, one
 * paragraph (first sentence in chalk), the way to the quickstart (the one
 * orange) and to the playground, and the install line with a copy button.
 */

const ID = "hero";
const { hero } = agents;

export function AgentsHero(): JSX.Element {
  const [lead, rest] = splitLead(hero.body);
  return (
    <section
      id={ID}
      aria-labelledby={titleIdOf(ID)}
      data-band="dark"
      className="relative flex flex-col bg-graphite text-chalk lg:min-h-[max(640px,calc(100svh-56px))] lg:justify-center"
    >
      <div className="relative h-[260px] overflow-hidden md:h-[340px] lg:absolute lg:inset-0 lg:h-auto">
        <Parallax amount={0.03} settle={0.03}>
          <Img
            asset={AGENTS_ART.hero}
            loading="priority"
            position={{ base: "70% 60%", lg: "80% 60%" }}
            sizes={LCP_SIZES.agents}
            className="absolute inset-0 size-full"
          />
        </Parallax>
        <span aria-hidden="true" className="absolute inset-0 hidden bg-graphite/35 lg:block" />
      </div>
      <div className={`${FRAME} relative w-full`}>
        <div className={`${GRID} pt-10 pb-12 md:pt-12 md:pb-16 lg:py-24`}>
          <div className="@container col-span-4 md:col-span-8 lg:col-span-7">
            <TextReveal
              as="h1"
              id={titleIdOf(ID)}
              className={`${T.h1Page} text-balance text-chalk`}
              text={hero.title}
              keepBeats
              immediate
            />
            <p className="mt-8 max-w-[48ch] text-lg leading-normal text-chalk/80 md:text-xl">
              <span className="text-chalk">{lead}</span> {rest}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <LinkButton
                href={hero.actions.primary.href}
                label={hero.actions.primary.label}
                variant="primary"
                size="lg"
                icon="arrow-down"
                fullOnPhone
              />
              <LinkButton
                href={hero.actions.secondary.href}
                label={hero.actions.secondary.label}
                variant="ghostInverse"
                size="lg"
                fullOnPhone
              />
            </div>
            <div className="mt-8 flex max-w-[420px] items-center justify-between gap-2 border border-chalk/25 bg-ink/40 pl-4">
              <code className="min-w-0 truncate font-mono text-sm text-chalk">{hero.install}</code>
              <CopyButton
                text={hero.install}
                label={common.actions.copy}
                done={common.actions.copied}
                inverse
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
