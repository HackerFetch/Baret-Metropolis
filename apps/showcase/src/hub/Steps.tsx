import { hub } from "@baret/content";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId, useState } from "react";
import { HUB_ART } from "../shared/assets.js";
import { STRIP_FRAME, stripShift } from "./hub.js";

/**
 * How it works, one step at a time. A radio group picks the step; the frame
 * beside it shows that step's drawing from the four-panel strip (h-05) by
 * sliding the strip under a window cut to one panel, 460 ms on the BRAND
 * ease (instant under reduced motion). The step's title and body change in
 * the same frame and one status region reads the title. Nothing advances on
 * its own.
 */

const ID = "how-it-works";
const { steps } = hub;

export function Steps(): JSX.Element {
  const name = useId();
  const [step, setStep] = useState(0);
  const [said, setSaid] = useState("");
  const current = steps.items[step] ?? steps.items[0];

  const pick = (value: string): void => {
    const next = Number(value);
    setStep(next);
    setSaid(steps.items[next]?.title ?? "");
  };

  return (
    <Section id={ID} ground="ground">
      <SectionHeader titleId={titleIdOf(ID)} title={steps.title} layout="stack" />
      <Reveal className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center lg:gap-12">
        <fieldset className="md:col-span-12">
          <legend className="sr-only">{steps.legend}</legend>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {steps.items.map((item, i) => (
              <Segment
                key={item.short}
                name={name}
                value={String(i)}
                checked={i === step}
                label={item.short}
                onSelect={pick}
              />
            ))}
          </div>
        </fieldset>

        <div className="md:col-span-5 lg:col-span-3">
          <div
            className="relative mx-auto w-full max-w-[280px] overflow-hidden border border-[color:var(--rule)] dark:brightness-[0.78] dark:contrast-[1.05] md:max-w-none"
            style={{ aspectRatio: STRIP_FRAME.ratio, backgroundColor: HUB_ART.steps.ground }}
          >
            <img
              src={HUB_ART.steps.src}
              width={HUB_ART.steps.width}
              height={HUB_ART.steps.height}
              alt=""
              decoding="async"
              loading="lazy"
              className="absolute left-0 h-auto max-w-none transition-transform duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{
                width: STRIP_FRAME.width,
                top: STRIP_FRAME.top,
                transform: `translateX(${stripShift(step)})`,
              }}
            />
          </div>
        </div>

        <div className="md:col-span-7 lg:col-span-6 lg:col-start-5">
          <h3 className={`${T.h3Large} text-[color:var(--fg)]`}>{current?.title}</h3>
          <p className={`${T.lead} mt-4 max-w-[48ch]`}>{current?.body}</p>
        </div>
      </Reveal>
      <p role="status" className="sr-only">
        {said}
      </p>
    </Section>
  );
}
