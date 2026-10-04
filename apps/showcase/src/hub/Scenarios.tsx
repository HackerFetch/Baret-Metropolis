import { hub } from "@baret/content";
import { ImgWell } from "@baret/web-ui/components/Img";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { Segment } from "@baret/web-ui/components/Segment";
import { staggerDelay } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId, useState } from "react";
import { useSearchParams } from "react-router";
import { HUB_ART } from "../shared/assets.js";
import { FILTER_PARAM, filterScenarios, filterStatus, parseFilter } from "./hub.js";
import { ScenarioCard } from "./ScenarioCard.js";

/**
 * The six sites and their filter. A native radio group (one tab stop, arrow
 * keys) narrows the cards to one threat class; beside it, that class's
 * picture and its one sentence. Cards that do not match leave the DOM, and
 * one status region says how many are shown. No timers, nothing moves on
 * its own; a card that appears rises once like every surface.
 *
 * The filter lives in the URL (`?filter=drainer`), one history entry per
 * pick, so a link opens on it and Back/Forward bring it back with the list
 * that ScrollRestoration's saved position was measured on. "All" drops the
 * query. A pick never scrolls the page.
 */

const ID = "scenarios";
const { filters } = hub;

const PICTURE = {
  all: HUB_ART.all,
  drainer: HUB_ART.drainer,
  trap: HUB_ART.trap,
  agent: HUB_ART.agent,
} as const;

export function Scenarios(): JSX.Element {
  const name = useId();
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get(FILTER_PARAM));
  const [said, setSaid] = useState("");
  const shown = filterScenarios(filter);
  const current = filters.items.find((f) => f.id === filter) ?? filters.items[0];

  const pick = (value: string): void => {
    const next = parseFilter(value);
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === "all") out.delete(FILTER_PARAM);
        else out.set(FILTER_PARAM, next);
        return out;
      },
      { preventScrollReset: true },
    );
    setSaid(filterStatus(filterScenarios(next).length));
  };

  return (
    <Section id={ID} ground="deep">
      <SectionHeader titleId={titleIdOf(ID)} title={hub.scenarios.title} layout="stack" />

      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
        <fieldset className="lg:col-span-7">
          <legend className={T.label}>{filters.label}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {filters.items.map((item) => (
              <Segment
                key={item.id}
                name={name}
                value={item.id}
                checked={item.id === filter}
                label={item.label}
                onSelect={pick}
              />
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-4 lg:col-span-5">
          <ImgWell
            asset={PICTURE[filter]}
            ratio="4/3"
            dim
            sizes="128px"
            className="w-24 shrink-0 border border-[color:var(--rule)] md:w-32"
          />
          <p className={`${T.body} text-[color:var(--fg)]`}>{current?.body}</p>
        </div>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {shown.map((scenario, i) => (
          <Reveal as="li" key={scenario.slug} delay={staggerDelay(i % 3)}>
            <ScenarioCard scenario={scenario} />
          </Reveal>
        ))}
      </ul>

      <p role="status" className="sr-only">
        {said}
      </p>
    </Section>
  );
}
