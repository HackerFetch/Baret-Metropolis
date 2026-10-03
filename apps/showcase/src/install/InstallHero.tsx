import { install } from "@baret/content";
import { Img } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { INSTALL_ART } from "../shared/assets.js";
import { PageHero } from "../shared/PageHero.js";
import { type Browser, BUILDS, leadBuild, otherBuild } from "./builds.js";

/**
 * The opening with the download in it, so the main action is in the first
 * viewport. The detected browser picks the lead build; its line keeps its
 * height while detection resolves, so nothing shifts.
 *
 * With a published build: the download button, what is inside the zip, a
 * mono meta line and the other build as a quiet link. Today none is
 * published, so the hero says that plainly and points at the source.
 */

const { hero, download } = install;

function Meta({ id }: { id: "chromium" | "firefox" }): JSX.Element {
  const build = BUILDS[id];
  return (
    <p data-numeric="" className={`${T.label} ${T.num}`}>
      {download.meta.version} {build.version} · {download.meta.manifest} · {build.requires}
    </p>
  );
}

export function InstallHero({ browser }: { browser: Browser }): JSX.Element {
  const lead = BUILDS[leadBuild(browser)];
  const other = BUILDS[otherBuild(lead.id)];
  const published = lead.href !== null;

  const actions = published ? (
    <LinkButton
      href={lead.href ?? ""}
      label={lead.action}
      variant="primary"
      size="lg"
      icon="arrow-down"
      fullOnPhone
    />
  ) : (
    <LinkButton
      href={download.pending.action.href}
      label={download.pending.action.label}
      variant="primary"
      size="lg"
      icon="arrow-up-right"
      fullOnPhone
    />
  );

  return (
    <PageHero
      title={hero.title}
      body={hero.body}
      actions={
        <>
          <p className={`${T.small} w-full min-h-[2lh] text-[color:var(--fg)] md:min-h-[1lh]`}>
            {hero.detected[browser]}
          </p>
          {actions}
        </>
      }
      after={
        <div className="grid gap-3 border-t border-[color:var(--rule)] pt-4">
          <p className={`${T.small} max-w-[56ch]`}>
            {published ? download.body : download.pending.body}
          </p>
          <Meta id={lead.id} />
          {published && other.href ? (
            <p className={T.small}>
              {download.other}{" "}
              <a
                href={other.href}
                rel="noreferrer"
                className="font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
              >
                {other.title}
              </a>
            </p>
          ) : (
            <p className={`${T.small} max-w-[56ch]`}>{download.status}</p>
          )}
        </div>
      }
      picture={
        <div className="relative aspect-[3/2] overflow-hidden border border-[color:var(--rule)] lg:aspect-[4/5]">
          <Img
            asset={INSTALL_ART.hero}
            loading="eager"
            position="62% 50%"
            sizes="(min-width: 1024px) 480px, 100vw"
            className="absolute inset-0 size-full"
          />
        </div>
      }
    />
  );
}
