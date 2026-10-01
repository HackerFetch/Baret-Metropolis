import { home } from "@baret/content";
import { Mark, Tag } from "@baret/ui";
import { Link } from "react-router";
import { Label, Panel, Section } from "../components/Section.js";

/**
 * The landing page. Every string comes from @baret/content, so a copy change
 * never touches this file.
 *
 * Section order follows what the research found across Stripe, Linear, Vercel
 * and the rest: hero, positioning, capability sections, proof, comparison,
 * trust, questions, closing restatement.
 */

export function Component() {
  return (
    <>
      <Hero />

      <Section
        id="layers"
        index="01"
        eyebrow={home.pillars.eyebrow}
        title={home.pillars.title}
        body={home.pillars.body}
      >
        <div className="grid gap-3.5 md:grid-cols-3">
          {home.pillars.items.map((item) => (
            <Panel key={item.title}>
              <h3 className="text-display-m">{item.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">{item.body}</p>
              <ul className="mt-1.5 grid gap-1.5">
                {item.points.map((point) => (
                  <li
                    key={point}
                    className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
                  >
                    <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                      /
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </Section>

      <Section
        id="caution"
        index="02"
        eyebrow={home.caution.eyebrow}
        title={home.caution.title}
        body={home.caution.body}
        deep
      >
        <div className="grid gap-3.5 md:grid-cols-3">
          {home.caution.examples.map((example, i) => (
            <Panel key={example.title}>
              <Tag tone={(["safe", "caution", "blocked"] as const)[i] ?? "neutral"} size="sm">
                {example.title}
              </Tag>
              <p className="text-sm text-[color:var(--fg-muted)]">{example.body}</p>
            </Panel>
          ))}
        </div>
        <Panel className="mt-3.5">
          <h3 className="text-display-m">{home.caution.honesty.title}</h3>
          <p className="max-w-[70ch] text-sm text-[color:var(--fg-muted)]">
            {home.caution.honesty.body}
          </p>
        </Panel>
      </Section>

      <Section
        id="agents"
        index="03"
        eyebrow={home.agents.eyebrow}
        title={home.agents.title}
        body={home.agents.body}
      >
        <div className="grid gap-3.5 md:grid-cols-3">
          {home.agents.gaps.map((gap) => (
            <Panel key={gap.title}>
              <h3 className="text-display-m">{gap.title}</h3>
              <p className="text-sm text-[color:var(--fg-faint)]">{gap.gap}</p>
              <hr className="my-1.5 border-[color:var(--rule)]" />
              <p className="text-sm text-[color:var(--fg-muted)]">{gap.answer}</p>
            </Panel>
          ))}
        </div>
        <Link
          to={home.agents.action.href}
          className="chamfer-sm mt-5 inline-flex h-11 items-center border border-[color:var(--fg)] px-4 font-display text-base uppercase tracking-[0.08em]"
        >
          {home.agents.action.label}
        </Link>
      </Section>

      <Section id="stats" title={home.stats.title} deep>
        <dl className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {home.stats.items.map((stat) => (
            <Panel key={stat.label}>
              <dd
                data-numeric
                className="font-stencil text-5xl leading-none text-[color:var(--accent)]"
              >
                {stat.value}
              </dd>
              <dt className="text-sm text-[color:var(--fg-muted)]">{stat.label}</dt>
            </Panel>
          ))}
        </dl>
      </Section>

      <Section
        id="comparison"
        index="04"
        eyebrow={home.comparison.eyebrow}
        title={home.comparison.title}
        body={home.comparison.body}
      >
        <div className="overflow-x-auto border border-[color:var(--rule)] bg-[color:var(--surface)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-[22%] border-b border-[color:var(--rule)] p-3 text-left font-mono text-label uppercase text-[color:var(--fg-faint)]">
                  {" "}
                </th>
                <th className="border-b border-[color:var(--rule)] p-3 text-left font-mono text-label uppercase text-[color:var(--fg-faint)]">
                  {home.comparison.columns.without}
                </th>
                <th className="border-b border-[color:var(--rule)] p-3 text-left font-mono text-label uppercase text-[color:var(--accent)]">
                  {home.comparison.columns.with}
                </th>
              </tr>
            </thead>
            <tbody>
              {home.comparison.rows.map((row) => (
                <tr key={row.aspect}>
                  <th className="border-b border-[color:var(--rule)] p-3 text-left align-top font-display text-base uppercase">
                    {row.aspect}
                  </th>
                  <td className="border-b border-[color:var(--rule)] p-3 align-top text-[color:var(--fg-faint)]">
                    {row.without}
                  </td>
                  <td className="border-b border-[color:var(--rule)] p-3 align-top text-[color:var(--fg-muted)]">
                    {row.with}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="privacy"
        index="05"
        eyebrow={home.privacy.eyebrow}
        title={home.privacy.title}
        body={home.privacy.body}
        deep
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          {home.privacy.cards.map((card) => (
            <Panel key={card.title}>
              <h3 className="text-display-m">{card.title}</h3>
              <p className="text-sm text-[color:var(--fg-muted)]">{card.body}</p>
            </Panel>
          ))}
        </div>
        <p className="mt-5 font-mono text-sm text-[color:var(--fg-faint)]">
          {home.privacy.footnote}{" "}
          <a href={home.privacy.action.href} className="text-[color:var(--accent)] underline">
            {home.privacy.action.label}
          </a>
        </p>
      </Section>

      <Section id="faq" index="06" eyebrow="FAQ" title={home.faq.title}>
        <div className="max-w-[80ch]">
          {home.faq.items.map((item) => (
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
      </Section>

      <Section className="border-b-0">
        <div className="grid max-w-[60ch] gap-4">
          <h2 className="text-display-l sm:text-5xl">{home.cta.title}</h2>
          <p className="text-lg text-[color:var(--fg-muted)]">{home.cta.body}</p>
          <div className="mt-1.5 flex flex-wrap gap-2.5">
            <Link
              to={home.cta.actions.primary.href}
              className="chamfer-sm inline-flex h-11 items-center bg-[color:var(--accent)] px-5 font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
            >
              {home.cta.actions.primary.label}
            </Link>
            <Link
              to={home.cta.actions.secondary.href}
              className="chamfer-sm inline-flex h-11 items-center border border-[color:var(--fg)] px-5 font-display text-base uppercase tracking-[0.08em]"
            >
              {home.cta.actions.secondary.label}
            </Link>
          </div>
          <p className="font-mono text-xs text-[color:var(--fg-faint)]">{home.cta.note}</p>
        </div>
      </Section>
    </>
  );
}

function Hero() {
  return (
    <header className="grid-paper border-b border-[color:var(--rule)]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-14 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Tag tone="watching" size="sm">
            {home.hero.status}
          </Tag>
          <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">
            Monad testnet 10143
          </span>
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-[auto_1fr] sm:gap-8">
          <Mark size={120} slit="var(--ground)" className="w-[84px] sm:w-[120px]" />
          <h1 className="font-stencil text-[clamp(3rem,9vw,6.5rem)] uppercase leading-[0.9] tracking-[0.02em]">
            {home.hero.title}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="grid gap-5">
            <p className="max-w-[56ch] text-xl text-[color:var(--fg-muted)]">{home.hero.body}</p>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to={home.hero.actions.primary.href}
                className="chamfer-sm inline-flex h-11 items-center bg-[color:var(--accent)] px-5 font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
              >
                {home.hero.actions.primary.label}
              </Link>
              <Link
                to={home.hero.actions.secondary.href}
                className="chamfer-sm inline-flex h-11 items-center border border-[color:var(--fg)] px-5 font-display text-base uppercase tracking-[0.08em]"
              >
                {home.hero.actions.secondary.label}
              </Link>
            </div>
          </div>

          <ul className="grid gap-2 lg:justify-end">
            {home.hero.badges.map((badge) => (
              <li key={badge}>
                <Tag size="sm">{badge}</Tag>
              </li>
            ))}
          </ul>
        </div>

        <Label>{home.hero.mockCaption}</Label>
      </div>
    </header>
  );
}
