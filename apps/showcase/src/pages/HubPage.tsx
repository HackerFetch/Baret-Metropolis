import { hub } from "@baret/content";
import { Tag } from "@baret/ui";
import { Link } from "react-router";
import { Panel, Section } from "../components/Section.js";
import { SCENARIOS } from "../sites/scenarios.js";

/** /showcase. The index of the six threat demos. */
export function Component() {
  return (
    <>
      <header className="grid-paper border-b border-[color:var(--rule)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-5 py-14 sm:py-20">
          <Tag tone="brand" size="sm">
            {hub.hero.eyebrow}
          </Tag>
          <h1 className="max-w-[18ch] font-stencil text-[clamp(2.5rem,7vw,5rem)] uppercase leading-[0.9]">
            {hub.hero.title}
          </h1>
          <p className="max-w-[60ch] text-xl text-[color:var(--fg-muted)]">{hub.hero.body}</p>
          <p className="max-w-[60ch] border-l-4 border-[color:var(--accent)] bg-[color:var(--tag-paper)] p-3 text-sm">
            {hub.hero.notice}
          </p>
        </div>
      </header>

      <Section id="scenarios" index="01" eyebrow="Scenarios" title="Pick one.">
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <Panel key={scenario.slug}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">
                  {scenario.category}
                </span>
                <Tag size="sm" tone={verdictTone(scenario.verdict)}>
                  {scenario.verdict}
                </Tag>
              </div>
              <h2 className="text-display-m">{scenario.name}</h2>
              <p className="text-sm text-[color:var(--fg-faint)]">{scenario.tagline}</p>
              <p className="text-sm text-[color:var(--fg-muted)]">{scenario.summary}</p>

              <span className="mt-1.5 font-mono text-label uppercase text-[color:var(--fg-faint)]">
                {hub.cardLabels.watchFor}
              </span>
              <ul className="grid gap-1">
                {scenario.watchFor.map((item) => (
                  <li
                    key={item}
                    className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
                  >
                    <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                      /
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                to={`/${scenario.slug}`}
                className="chamfer-sm mt-2 inline-flex h-10 w-max items-center border border-[color:var(--fg)] px-4 font-display text-sm uppercase tracking-[0.08em]"
              >
                {hub.cardLabels.open}
              </Link>
            </Panel>
          ))}
        </div>
      </Section>

      <Section index="02" eyebrow="Method" title={hub.steps.title} deep>
        <ol className="grid gap-3.5 md:grid-cols-4">
          {hub.steps.items.map((step, i) => (
            <Panel key={step.title}>
              <span className="font-display text-4xl leading-none text-[color:var(--accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-display-m">{step.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">{step.body}</p>
            </Panel>
          ))}
        </ol>
      </Section>

      <Section
        index="03"
        eyebrow={hub.detectors.eyebrow}
        title={hub.detectors.title}
        body={hub.detectors.body}
        className="border-b-0"
      >
        <Panel className="max-w-[70ch]">
          <h3 className="text-display-m">{hub.comparison.title}</h3>
          <p className="text-sm text-[color:var(--fg-muted)]">{hub.comparison.body}</p>
        </Panel>
      </Section>
    </>
  );
}

function verdictTone(verdict: string) {
  if (verdict === "blocked") return "blocked" as const;
  if (verdict === "caution") return "caution" as const;
  if (verdict === "capped") return "watching" as const;
  return "safe" as const;
}
