import { novaswap } from "@baret/content";
import { NOVASWAP } from "@baret/demo";
import { Button } from "@baret/ui";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { FRAME, GRID } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";

/**
 * NovaSwap's Pools, Stats and Docs pages. Same grammar as the swap page: a
 * title, one short paragraph, then rows on hairlines. Every figure is sample
 * data from novaswap.content.ts and the page says so under its title.
 */

const pages = novaswap.site.pages;

function PageHead({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="grid max-w-[760px] gap-4">
      <TextReveal
        as="h1"
        text={title}
        immediate
        className="font-display text-[clamp(2.75rem,1.5rem+4vw,5rem)] font-extrabold uppercase leading-[0.92] text-[color:var(--fg)]"
      />
      <p className={T.lead}>{body}</p>
      <p className={T.label}>{pages.sampleNote}</p>
    </div>
  );
}

export function PoolsPage({ onSwap }: { onSwap: () => void }): JSX.Element {
  const { pools } = pages;
  const th = `${T.label} py-3 pr-4 text-left font-normal`;
  const wide = "hidden md:table-cell";
  return (
    <section className={`${FRAME} grid gap-12 py-12 md:py-16 lg:py-24`}>
      <PageHead title={pools.title} body={pools.body} />
      <Reveal>
        <table className="w-full border-collapse border-t border-[color:var(--rule-strong)]">
          <caption className="sr-only">{pools.title}</caption>
          <thead>
            <tr className="border-b border-[color:var(--rule)]">
              <th scope="col" className={th}>
                {pools.columns.pair}
              </th>
              <th scope="col" className={th}>
                {pools.columns.tvl}
              </th>
              <th scope="col" className={`${th} ${wide}`}>
                {pools.columns.volume}
              </th>
              <th scope="col" className={`${th} ${wide}`}>
                {pools.columns.fee}
              </th>
              <td />
            </tr>
          </thead>
          <tbody>
            {pools.items.map((pool) => (
              <tr
                key={pool.pair}
                className="border-b border-[color:var(--rule)] transition-colors hover:bg-[color:var(--surface)]"
              >
                <th
                  scope="row"
                  className="py-4 pr-4 text-left font-display text-xl font-bold uppercase text-[color:var(--fg)] md:text-2xl"
                >
                  {pool.pair}
                </th>
                <td className={`${T.num} py-4 pr-4 text-[color:var(--fg)]`}>{pool.tvl}</td>
                <td className={`${T.num} ${wide} py-4 pr-4 text-[color:var(--fg-muted)]`}>
                  {pool.volume}
                </td>
                <td className={`${wide} py-4 pr-4`}>
                  <span className="border border-[color:var(--accent-edge)] px-2 py-1 font-mono text-label text-[color:var(--accent)]">
                    {pool.fee}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={onSwap}>
                    {pools.action}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}

export function StatsPage(): JSX.Element {
  const { stats } = pages;
  const { chart } = stats;
  const max = Math.max(...chart.values);
  return (
    <section className={`${FRAME} grid gap-12 py-12 md:py-16 lg:py-24`}>
      <PageHead title={stats.title} body={stats.body} />

      <Reveal className="grid gap-6 border-t border-[color:var(--rule-strong)] pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className={`${T.h3} text-[color:var(--fg)]`}>{chart.title}</h2>
          <p className={T.small}>{chart.caption}</p>
        </div>
        <figure className="grid gap-2">
          <div className="flex h-56 items-end gap-1 border-b border-[color:var(--rule-strong)] md:h-72 md:gap-2">
            {chart.values.map((value, i) => (
              <div
                key={chart.days[i]}
                className="group relative flex h-full flex-1 items-end"
                title={`${chart.days[i]}: ${value} ${chart.unit}`}
              >
                <div
                  className={`w-full ${i === chart.values.length - 1 ? "bg-[color:var(--accent)]" : "bg-[color:var(--rule-strong)] group-hover:bg-[color:var(--accent)]"} transition-colors`}
                  style={{ height: `${(value / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="flex gap-1 md:gap-2">
            {chart.days.map((day) => (
              <span
                key={day}
                className={`flex-1 text-center font-mono text-label text-[color:var(--fg-muted)] ${T.num}`}
              >
                {day}
              </span>
            ))}
          </div>
          <figcaption className="sr-only">
            {chart.caption} {chart.values.map((v, i) => `${chart.days[i]}: ${v}`).join(", ")}
          </figcaption>
        </figure>
      </Reveal>

      <Reveal className="grid gap-6">
        <h2 className={`${T.h3} text-[color:var(--fg)]`}>{stats.top.title}</h2>
        <dl className="grid grid-cols-2 border-t border-[color:var(--rule)] lg:grid-cols-4">
          {stats.top.items.map((item, i) => (
            <div
              key={item.label}
              className={`grid gap-1 border-b border-[color:var(--rule)] py-6 ${i % 2 === 1 ? "border-l pl-6" : ""} ${i > 0 ? "lg:border-l lg:pl-6" : ""}`}
            >
              <dd className={`${T.stat} text-[color:var(--fg)]`}>{item.value}</dd>
              <dt className={T.small}>{item.label}</dt>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

export function DocsPage(): JSX.Element {
  const { docs } = pages;
  return (
    <section className={`${FRAME} grid gap-12 py-12 md:py-16 lg:py-24`}>
      <PageHead title={docs.title} body={docs.body} />
      <div className={`${GRID} gap-y-10`}>
        <nav aria-label={docs.toc} className="col-span-4 md:col-span-8 lg:col-span-3">
          <div className="grid gap-3 lg:sticky lg:top-24">
            <p className={T.label}>{docs.toc}</p>
            <ul className="grid border-l border-[color:var(--rule)]">
              {docs.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l-2 border-transparent py-2 pl-4 text-sm text-[color:var(--fg-muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--fg)]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="col-span-4 grid gap-10 md:col-span-8 lg:col-span-8 lg:col-start-5">
          <div className="grid gap-3 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-6">
            <p className={T.label}>{docs.contract.label}</p>
            <code className="block break-all font-mono text-base text-[color:var(--fg)]">
              {NOVASWAP.router}
            </code>
            <p className={T.small}>{docs.contract.note}</p>
          </div>
          {docs.sections.map((section) => (
            <Reveal
              key={section.id}
              className="grid scroll-mt-24 gap-3 border-t-2 border-[color:var(--accent)] pt-5"
            >
              <h2 id={section.id} className={`${T.h3} text-[color:var(--fg)]`}>
                {section.title}
              </h2>
              <p className={`${T.body} max-w-[64ch]`}>{section.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
