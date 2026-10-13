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
 * How it works, one step at a time. A radio group picks the step. Under it
 * the four drawings of the strip (h-05) sit in step order, one per column,
 * aligned to the four choices: the picked one is at full strength, the rest
 * fade back (300 ms, instant under reduced motion). On a phone only the
 * picked drawing shows. The step's title and body sit below on the same
 * grid, and one status region reads the title. Nothing advances on its own.
 */

const ID = "how-it-works";
const { steps } = hub;

/** One drawing cut from the strip: a window the size of one panel. */
function StepPanel({ index, active }: { index: number; active: boolean }): JSX.Element {
  return (
    <div
      className={`relative mx-auto w-full max-w-[300px] overflow-hidden border transition-opacity duration-300 motion-reduce:transition-none dark:brightness-[0.78] dark:contrast-[1.05] md:max-w-none ${
        active ? "border-[color:var(--fg)] opacity-100" : "border-[color:var(--rule)] opacity-45"
      }`}
      style={{ aspectRatio: STRIP_FRAME.ratio, backgroundColor: HUB_ART.steps.ground }}
    >
      <img
        src={HUB_ART.steps.src}
        width={HUB_ART.steps.width}
        height={HUB_ART.steps.height}
        alt=""
        decoding="async"
        loading="lazy"
        className="absolute left-0 h-auto max-w-none"
        style={{
          width: STRIP_FRAME.width,
          top: STRIP_FRAME.top,
          transform: `translateX(${stripShift(index)})`,
        }}
      />
    </div>
  );
}

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
      <Reveal className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start lg:gap-x-12">
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

        <ol aria-hidden="true" className="grid grid-cols-1 gap-2 md:col-span-12 md:grid-cols-4">
          {steps.items.map((item, i) => (
            <li key={item.short} className={i === step ? "block" : "hidden md:block"}>
              <StepPanel index={i} active={i === step} />
            </li>
          ))}
        </ol>

        <h3 className={`${T.h3Large} text-[color:var(--fg)] md:col-span-5`}>{current?.title}</h3>
        <p className={`${T.lead} max-w-[48ch] md:col-span-7`}>{current?.body}</p>
      </Reveal>
      <p role="status" className="sr-only">
        {said}
      </p>
    </Section>
  );
}
