import { partners } from "@baret/content";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { titleIdOf } from "@baret/web-ui/components/Section";
import { FRAME, GRID, SECTION_PAD } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { PageHero } from "../shared/PageHero.js";
import { LogoWall } from "./LogoWall.js";
import { PartnerCard } from "./PartnerCard.js";

/**
 * /partners: every sponsor and data source inside the check, with its own
 * logo, what Baret uses it for and a link to the proof. Order: the hero with
 * the logo wall, four groups (chain, data, identity and agents, models),
 * then the way to see them work. Every link that leaves the page opens a new
 * tab (the site's link rule, components/NewTabLink).
 */
export function Component(): JSX.Element {
  const { hero, groups, cta } = partners;
  return (
    <div className="overflow-x-clip">
      <PageHero
        title={hero.title}
        body={hero.body}
        actions={
          <>
            <LinkButton
              href={hero.jump.href}
              label={hero.jump.label}
              variant="primary"
              size="lg"
              icon="arrow-down"
              fullOnPhone
            />
            <LinkButton
              href={cta.actions.primary.href}
              label={cta.actions.primary.label}
              size="lg"
              icon="arrow-up-right"
              newTab
              fullOnPhone
            />
          </>
        }
        after={
          <div className="grid gap-4">
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
              {hero.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse gap-1">
                  <dt className={T.label}>{stat.label}</dt>
                  <dd className={`${T.stat} text-[color:var(--fg)]`} data-numeric="">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className={`${T.small} max-w-[56ch]`}>{hero.note}</p>
          </div>
        }
        picture={<LogoWall />}
      />

      {groups.map((group, index) => (
        <section
          key={group.id}
          id={group.id}
          aria-labelledby={titleIdOf(group.id)}
          className={`border-t border-[color:var(--rule)] ${index % 2 === 1 ? "bg-[color:var(--ground-deep)]" : "bg-[color:var(--ground)]"} ${SECTION_PAD}`}
        >
          <div className={FRAME}>
            <div className={`${GRID} gap-y-8`}>
              <header className="col-span-4 md:col-span-8 lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <p className={T.label}>
                    {String(index + 1).padStart(2, "0")} / {String(groups.length).padStart(2, "0")}
                  </p>
                  <h2
                    id={titleIdOf(group.id)}
                    className={`${T.h2} mt-3 text-balance text-[color:var(--fg)]`}
                  >
                    {group.title}
                  </h2>
                  <p className={`${T.body} mt-4 max-w-[40ch]`}>{group.body}</p>
                </div>
              </header>
              <ul className="col-span-4 grid gap-4 md:col-span-8 md:grid-cols-2 md:gap-6 lg:col-span-8">
                {group.partners.map((partner) => (
                  <li key={partner.id} className="scroll-mt-24">
                    <PartnerCard partner={partner} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      <section
        id="start"
        aria-labelledby={titleIdOf("start")}
        data-band="dark"
        className={`bg-graphite text-chalk ${SECTION_PAD}`}
      >
        <div className={FRAME}>
          <div className={`${GRID} gap-y-8 lg:items-end`}>
            <div className="col-span-4 md:col-span-8 lg:col-span-7">
              <h2 id={titleIdOf("start")} className={`${T.h2Stencil} text-balance`}>
                {cta.title}
              </h2>
              <p className="mt-4 max-w-[52ch] text-base text-chalk/80 md:text-lg">{cta.body}</p>
            </div>
            <div className="col-span-4 flex flex-wrap gap-3 md:col-span-8 lg:col-span-5 lg:justify-end">
              <LinkButton
                href={cta.actions.primary.href}
                label={cta.actions.primary.label}
                variant="primary"
                size="lg"
                icon="arrow-up-right"
                newTab
                fullOnPhone
              />
              <LinkButton
                href={cta.actions.secondary.href}
                label={cta.actions.secondary.label}
                variant="ghostInverse"
                size="lg"
                icon="arrow-up-right"
                newTab
                fullOnPhone
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
