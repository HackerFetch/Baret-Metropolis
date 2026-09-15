import { install } from "@baret/content";
import { Tag } from "@baret/ui";
import { Link } from "react-router";
import { Panel, Section } from "../components/Section.js";

/** /install. Loading an unpacked developer build. */
export function Component() {
  return (
    <>
      <header className="grid-paper border-b border-[color:var(--rule)]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-5 px-5 py-14 sm:py-20">
          <Tag tone="brand" size="sm">
            {install.hero.eyebrow}
          </Tag>
          <h1 className="max-w-[16ch] font-stencil text-[clamp(2.5rem,7vw,5rem)] uppercase leading-[0.9]">
            {install.hero.title}
          </h1>
          <p className="max-w-[60ch] text-xl text-[color:var(--fg-muted)]">{install.hero.body}</p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="chamfer-sm inline-flex h-11 items-center bg-[color:var(--accent)] px-5 font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
            >
              {install.hero.actions.primary.label}
            </button>
            <button
              type="button"
              className="chamfer-sm inline-flex h-11 items-center border border-[color:var(--fg)] px-5 font-display text-base uppercase tracking-[0.08em]"
            >
              {install.hero.actions.secondary.label}
            </button>
          </div>
        </div>
      </header>

      <Section index="01" eyebrow="Steps" title={install.steps.chrome.title}>
        <ol className="grid gap-3.5 md:grid-cols-3">
          {install.steps.chrome.items.map((step, i) => (
            <Panel key={step.title}>
              <span className="font-display text-4xl leading-none text-[color:var(--accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-display-m">{step.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">{step.body}</p>
            </Panel>
          ))}
        </ol>
        <Panel className="mt-3.5 max-w-[70ch]">
          <h3 className="text-display-m">{install.developerMode.title}</h3>
          <p className="text-sm text-[color:var(--fg-muted)]">{install.developerMode.body}</p>
        </Panel>
      </Section>

      <Section index="02" eyebrow="Steps" title={install.steps.firefox.title} deep>
        <ol className="grid gap-3.5 md:grid-cols-3">
          {install.steps.firefox.items.map((step, i) => (
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

      <Section index="03" eyebrow="Trust" title={install.trust.title}>
        <div className="grid gap-3.5 md:grid-cols-2">
          <Panel>
            <h3 className="text-display-m text-[color:var(--safe)]">{install.trust.can.title}</h3>
            <ul className="grid gap-1.5">
              {install.trust.can.points.map((point) => (
                <li
                  key={point}
                  className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
                >
                  <span aria-hidden="true" className="text-[color:var(--safe)]">
                    +
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <h3 className="text-display-m text-[color:var(--blocked)]">
              {install.trust.cannot.title}
            </h3>
            <ul className="grid gap-1.5">
              {install.trust.cannot.points.map((point) => (
                <li
                  key={point}
                  className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
                >
                  <span aria-hidden="true" className="text-[color:var(--blocked)]">
                    -
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Section>

      <Section index="04" eyebrow="After" title={install.afterInstall.title} deep>
        <ol className="grid gap-3.5 md:grid-cols-4">
          {install.afterInstall.items.map((step) => (
            <Panel key={step.title}>
              <h3 className="text-display-m">{step.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">{step.body}</p>
            </Panel>
          ))}
        </ol>
      </Section>

      <Section
        index="05"
        eyebrow="Help"
        title={install.troubleshooting.title}
        className="border-b-0"
      >
        <div className="max-w-[80ch]">
          {install.troubleshooting.items.map((item) => (
            <details
              key={item.question}
              className="border-t border-[color:var(--rule)] last:border-b"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 py-4 font-display text-xl uppercase tracking-[0.03em]">
                {item.question}
                <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                  +
                </span>
              </summary>
              <p className="max-w-[70ch] pb-5 text-[color:var(--fg-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
        <Link
          to={install.cta.actions.primary.href}
          className="chamfer-sm mt-7 inline-flex h-11 w-max items-center bg-[color:var(--accent)] px-5 font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
        >
          {install.cta.actions.primary.label}
        </Link>
      </Section>
    </>
  );
}
