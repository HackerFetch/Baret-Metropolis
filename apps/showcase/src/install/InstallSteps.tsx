import { install } from "@baret/content";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { ImgWell } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { Segment } from "@baret/web-ui/components/Segment";
import { staggerDelay } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId } from "react";
import { INSTALL_ART } from "../shared/assets.js";
import { BUILDS, type BuildId, sourceOf, stepsFor } from "./builds.js";

/**
 * Three steps for the chosen browser, in one row: a drawing, the step, and
 * for the step that names a browser page, its address with a copy button (a
 * page cannot link to chrome:// or about:). The picker starts on the
 * visitor's browser.
 *
 * The steps follow where the build comes from. From its store: open, add,
 * pin, with the listing linked under step 1 (the hero's button leads with
 * the visitor's own build, and the picker may show the other one) and the
 * store's own note under the row. From a zip or the source: extract (or
 * build), open, load, with the browser's own caveat under the row:
 * developer mode for Chrome, temporary add-ons for Firefox.
 */

const ID = "steps";
const { steps, developerMode } = install;
/** The drawings in step order: a crate, a gate, a hook rail. */
const ART = [INSTALL_ART.extract, INSTALL_ART.open, INSTALL_ART.load] as const;
/** The store's steps open with the gate; the crate arrives second. */
const STORE_ART = [INSTALL_ART.open, INSTALL_ART.extract, INSTALL_ART.load] as const;

export function InstallSteps({
  browser,
  onBrowser,
}: {
  browser: BuildId;
  onBrowser: (browser: BuildId) => void;
}): JSX.Element {
  const name = useId();
  const build = BUILDS[browser];
  const source = sourceOf(build);
  const items = stepsFor(browser, source);
  const art = source === "store" ? STORE_ART : ART;
  const store = install.download.builds[browser].store;
  const options = [
    { id: "chromium", label: steps.chrome.title },
    { id: "firefox", label: steps.firefox.title },
  ] as const;

  return (
    <Section id={ID} ground="deep">
      <SectionHeader
        titleId={titleIdOf(ID)}
        title={source === "store" ? steps.titleStore : steps.title}
        layout="stack"
      />

      <fieldset className="mt-8 max-w-[560px]">
        <legend className={T.label}>{steps.browser}</legend>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {options.map((option) => (
            <Segment
              key={option.id}
              name={name}
              value={option.id}
              checked={browser === option.id}
              label={option.label}
              onSelect={(value) => onBrowser(value as BuildId)}
            />
          ))}
        </div>
      </fieldset>

      <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
        {items.map((item, i) => (
          <Reveal as="li" key={`${browser}-${item.short}`} delay={staggerDelay(i)}>
            <ImgWell
              asset={art[i] ?? INSTALL_ART.extract}
              ratio="3/2"
              dim
              sizes="(min-width: 768px) 380px, 100vw"
              className="border border-[color:var(--rule)]"
            />
            <h3 className={`${T.h3} mt-5 text-[color:var(--fg)]`}>{item.title}</h3>
            <p className={`${T.body} mt-2`}>{item.body}</p>
            {source === "store" && i === 0 && build.store ? (
              <div className="mt-4">
                <LinkButton
                  href={build.store}
                  label={store.open}
                  variant="ghost"
                  size="sm"
                  icon="arrow-up-right"
                  newTab
                />
              </div>
            ) : null}
            {item.address ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] pl-3">
                <code className="min-w-0 break-all py-2 font-mono text-sm text-[color:var(--fg)]">
                  {item.address}
                </code>
                <CopyButton text={item.address} label={steps.copy.label} done={steps.copy.done} />
              </div>
            ) : null}
          </Reveal>
        ))}
      </ol>

      <div className="mt-12 grid gap-2 border-t border-[color:var(--rule)] pt-6 lg:grid-cols-12 lg:gap-8">
        {source === "store" ? (
          <>
            <h3 className={`${T.label} lg:col-span-3 lg:pt-1`}>{store.note.title}</h3>
            <p className={`${T.body} max-w-[64ch] lg:col-span-9`}>{store.note.body}</p>
          </>
        ) : browser === "firefox" ? (
          <p className={`${T.body} text-[color:var(--fg)] lg:col-span-8`}>
            {steps.firefox.warning}
          </p>
        ) : (
          <>
            <h3 className={`${T.label} lg:col-span-3 lg:pt-1`}>{developerMode.title}</h3>
            <div className="grid max-w-[64ch] gap-2 lg:col-span-9">
              <p className={T.body}>{developerMode.body}</p>
              <p className={`${T.body} font-medium text-[color:var(--fg)]`}>
                {developerMode.warning}
              </p>
              <p className={T.small}>{developerMode.note}</p>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
