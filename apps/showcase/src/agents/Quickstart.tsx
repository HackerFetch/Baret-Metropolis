import { agents, common } from "@baret/content";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { ImgWell } from "@baret/web-ui/components/Img";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { Segment } from "@baret/web-ui/components/Segment";
import { GRID } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId, useState } from "react";
import { AGENTS_ART } from "../shared/assets.js";
import { withPolicy } from "./code.js";
import type { PolicyName } from "./playground/sample.js";

/**
 * From install to the first blocked transaction. Left: the three steps on
 * hairlines and a hand picking one of three tags (pick a policy). Right: the
 * code, one sample at a time behind a radio group (TypeScript, any
 * language, agent frameworks): the line before it, the code with a copy
 * button, the line after it. The SDK and CLI samples carry the policy picked
 * in the playground. The code scrolls sideways inside its own box only.
 */

const ID = "quickstart";
const { quickstart, steps } = agents;
const SAMPLES = { sdk: quickstart.sdk, cli: quickstart.cli, mcp: quickstart.mcp } as const;
type SampleId = keyof typeof SAMPLES;

export function Quickstart({ policy }: { policy: PolicyName }): JSX.Element {
  const name = useId();
  const [tab, setTab] = useState<SampleId>("sdk");
  const sample = SAMPLES[tab];
  const code = withPolicy(sample.code, policy);
  return (
    <Section id={ID} ground="deep">
      <SectionHeader titleId={titleIdOf(ID)} title={quickstart.title} layout="stack" />
      <div className={`${GRID} mt-12 gap-y-10 lg:items-start`}>
        <Reveal className="col-span-4 md:col-span-8 lg:col-span-5">
          <ol className="border-t border-[color:var(--rule)]">
            {steps.items.map((step) => (
              <li key={step.title} className="border-b border-[color:var(--rule)] py-5">
                <h3 className={`${T.h3} text-[color:var(--fg)]`}>{step.title}</h3>
                <p className={`${T.body} mt-2`}>{step.body}</p>
              </li>
            ))}
          </ol>
          <ImgWell
            asset={AGENTS_ART.policy}
            ratio="4/3"
            dim
            sizes="(min-width: 1024px) 460px, 100vw"
            className="mt-8 hidden border border-[color:var(--rule)] md:block"
          />
        </Reveal>
        <Reveal className="col-span-4 min-w-0 md:col-span-8 lg:col-span-7" delay={0.06}>
          <fieldset>
            <legend className="sr-only">{quickstart.tabs}</legend>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {(Object.keys(SAMPLES) as SampleId[]).map((id) => (
                <Segment
                  key={id}
                  name={name}
                  value={id}
                  checked={tab === id}
                  label={SAMPLES[id].title}
                  onSelect={(value) => setTab(value as SampleId)}
                />
              ))}
            </div>
          </fieldset>
          <p className={`${T.body} mt-6 text-[color:var(--fg)]`}>{sample.before}</p>
          <div className="mt-3 border border-[color:var(--rule-strong)] bg-[color:var(--surface)]">
            <div className="flex justify-end border-b border-[color:var(--rule)]">
              <CopyButton text={code} label={common.actions.copy} done={common.actions.copied} />
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed text-[color:var(--fg)] md:text-sm">
              <code>{code}</code>
            </pre>
          </div>
          <p className={`${T.small} mt-3`}>{sample.after}</p>
          <div className="mt-8 grid gap-1 border-t border-[color:var(--rule)] pt-5">
            <p className={T.label}>{quickstart.secrets.title}</p>
            <p className={T.small}>{quickstart.secrets.body}</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
