import { docs } from "@baret/content";
import { ImgWell } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { DocsIndex } from "../docs/DocsIndex.js";
import { Limitations } from "../docs/Limitations.js";
import { Timeline } from "../docs/Timeline.js";
import { DOCS_ART } from "../shared/assets.js";
import { ClosingBand } from "../shared/ClosingBand.js";
import { PageHero } from "../shared/PageHero.js";

/**
 * /docs, an index, not a doc. Four blocks (owner's order, 2026-10-03): where
 * the check happens (with the two timelines), the eleven files in four
 * groups, the known limitations, and the way to see it work. Every card
 * opens its file on GitHub.
 */
export function Component() {
  const { hero, cta } = docs;
  return (
    <div className="overflow-x-clip">
      <PageHero
        title={hero.title}
        body={hero.body}
        actions={
          <>
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
              size="lg"
              icon="arrow-up-right"
              fullOnPhone
            />
          </>
        }
        after={<p className={`${T.small} max-w-[56ch]`}>{hero.note}</p>}
        picture={
          <ImgWell
            asset={DOCS_ART.hero}
            ratio="1/1"
            dim
            sizes="(min-width: 1024px) 480px, 100vw"
            className="border border-[color:var(--rule)]"
          />
        }
        below={<Timeline />}
      />
      <DocsIndex />
      <Limitations />
      <ClosingBand
        title={cta.title}
        body={cta.body}
        primary={cta.actions.primary}
        secondary={cta.actions.secondary}
        picture={{ asset: DOCS_ART.cta, position: "60% 50%" }}
      />
    </div>
  );
}
