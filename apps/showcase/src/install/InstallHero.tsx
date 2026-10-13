import { install } from "@baret/content";
import { Img } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { INSTALL_ART, LCP_SIZES } from "../shared/assets.js";
import { PageHero } from "../shared/PageHero.js";
import { type Browser, BUILDS, leadBuild, otherBuild, sourceOf } from "./builds.js";

/**
 * The opening with the way in, so the main action is in the first viewport.
 * The detected browser picks the lead build; its line keeps its height while
 * detection resolves, so nothing shifts.
 *
 * What the button does follows where the build comes from: the store listing
 * once it is public (in a new tab, so the steps below stay in reach), else
 * the zip (what is inside it, a mono meta line, the other build as a quiet
 * link), else the source with the hero saying so.
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
  const source = sourceOf(lead);
  const copy = download.builds[lead.id];
  const otherHref = other.store ?? other.href;

  const action =
    source === "store" ? (
      <LinkButton
        href={lead.store ?? ""}
        label={copy.store.action}
        variant="primary"
        size="lg"
        icon="arrow-up-right"
        fullOnPhone
        newTab
      />
    ) : source === "zip" ? (
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
        newTab
        label={download.pending.action.label}
        variant="primary"
        size="lg"
        icon="arrow-up-right"
        fullOnPhone
      />
    );

  const body =
    source === "store" ? copy.store.body : source === "zip" ? download.body : download.pending.body;

  // A phone loads no extension: the web wallet is the way in, and the desktop
  // builds stay as quiet links for a visitor who comes back on a computer.
  const phone = browser === "phone";
  const leadHref = lead.store ?? lead.href;

  return (
    <PageHero
      title={hero.title}
      body={`${hero.body} ${source === "store" ? copy.store.how : copy.developerBuild}`}
      actions={
        <>
          <p className={`${T.small} w-full min-h-[2lh] text-[color:var(--fg)] md:min-h-[1lh]`}>
            {(source === "source" ? hero.detectedPending : hero.detected)[browser]}
          </p>
          {phone ? (
            <LinkButton
              href={hero.phone.action.href}
              label={hero.phone.action.label}
              variant="primary"
              size="lg"
              icon="arrow-up-right"
              fullOnPhone
              newTab
            />
          ) : (
            action
          )}
        </>
      }
      after={
        <div className="grid gap-3 border-t border-[color:var(--rule)] pt-4">
          <p className={`${T.small} max-w-[56ch]`}>{phone ? hero.phone.body : body}</p>
          <Meta id={lead.id} />
          {phone ? (
            <p className={T.small}>
              {hero.phone.desktop}{" "}
              {[lead, other]
                .filter((build) => (build.store ?? build.href) !== null)
                .map((build, i) => (
                  <span key={build.id}>
                    {i > 0 ? ", " : null}
                    <a
                      href={build.store ?? build.href ?? ""}
                      rel="noreferrer"
                      className="font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
                    >
                      {build.title}
                    </a>
                  </span>
                ))}
              {leadHref === null && otherHref === null ? download.pending.action.label : null}
            </p>
          ) : source !== "source" && otherHref ? (
            <p className={T.small}>
              {download.other}{" "}
              <a
                href={otherHref}
                rel="noreferrer"
                className="font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
              >
                {other.title}
              </a>
              {source === "store" && other.store === null ? `, ${download.otherZip}` : null}
            </p>
          ) : source === "store" ? null : (
            <p className={`${T.small} max-w-[56ch]`}>
              {source === "zip" ? copy.status : copy.statusPending}
            </p>
          )}
        </div>
      }
      picture={
        <div className="relative aspect-[3/2] overflow-hidden border border-[color:var(--rule)] lg:aspect-[4/5]">
          <Img
            asset={INSTALL_ART.hero}
            loading="priority"
            position="62% 50%"
            sizes={LCP_SIZES.install}
            className="absolute inset-0 size-full"
          />
        </div>
      }
    />
  );
}
