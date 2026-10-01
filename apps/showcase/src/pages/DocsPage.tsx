import { docs } from "@baret/content";
import { Tag } from "@baret/ui";
import { Link } from "react-router";
import { Panel, Section } from "../components/Section.js";

const REPO = "https://github.com/HackerFetch/Baret-Metropolis/blob/main/";

/** /docs. An index, not a document. */
export function Component() {
  return (
    <>
      <header className="grid-paper border-b border-[color:var(--rule)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-5 px-5 py-14 sm:py-20">
          <Tag size="sm">{docs.hero.eyebrow}</Tag>
          <h1 className="max-w-[20ch] font-stencil text-[clamp(2.5rem,7vw,5rem)] uppercase leading-[0.9]">
            {docs.hero.title}
          </h1>
          <p className="max-w-[60ch] text-xl text-[color:var(--fg-muted)]">{docs.hero.body}</p>
        </div>
      </header>

      <Section index="01" eyebrow="Pipeline" title={docs.summary.title}>
        <ol className="grid gap-3.5 md:grid-cols-4">
          {docs.summary.steps.map((step, i) => (
            <Panel key={step.title}>
              <span className="font-display text-4xl leading-none text-[color:var(--accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="text-display-m">{step.title}</h2>
              <p className="text-sm text-[color:var(--fg-muted)]">{step.body}</p>
            </Panel>
          ))}
        </ol>
      </Section>

      {docs.groups.map((group, i) => (
        <Section
          key={group.title}
          id={group.title.toLowerCase().replace(/\W+/g, "-")}
          index={String(i + 2).padStart(2, "0")}
          eyebrow="Documents"
          title={group.title}
          body={group.body}
          deep={i % 2 === 1}
        >
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {group.cards.map((card) => (
              <a
                key={card.file}
                href={`${REPO}${card.file}`}
                className="grid content-start gap-2 border border-[color:var(--rule)] bg-[color:var(--surface)] p-5 transition-colors hover:border-[color:var(--accent)]"
              >
                <h3 className="text-display-m">{card.title}</h3>
                <p className="text-sm text-[color:var(--fg-muted)]">{card.body}</p>
                <code className="font-mono text-xs text-[color:var(--fg-faint)]">{card.file}</code>
              </a>
            ))}
          </div>
        </Section>
      ))}

      <Section className="border-b-0">
        <div className="grid max-w-[60ch] gap-4">
          <h2 className="text-display-l">{docs.cta.title}</h2>
          <p className="text-lg text-[color:var(--fg-muted)]">{docs.cta.body}</p>
          <Link
            to={docs.cta.actions.primary.href}
            className="chamfer-sm inline-flex h-11 w-max items-center bg-[color:var(--accent)] px-5 font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
          >
            {docs.cta.actions.primary.label}
          </Link>
        </div>
      </Section>
    </>
  );
}
