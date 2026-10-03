import { Reveal } from "@baret/web-ui/components/Reveal";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { FRAME, GRID } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import type { JSX, ReactNode } from "react";

/**
 * The page-level pieces every demo dApp shares: its hero (claim on the left,
 * its main card on the right), the head of a secondary page, and the two
 * figure blocks of a stats page. The display title is the dApp's own, never
 * Baret's stencil.
 */

/** A dApp's page title: display face, 44 to 80 px, tight leading. */
export const SITE_H1 =
  "font-display text-[clamp(2.75rem,1.5rem+4vw,5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.005em] text-[color:var(--fg)]";

export function SiteHero({
  badge,
  title,
  body,
  keepCase,
  card,
}: {
  badge: string;
  title: string;
  body: string;
  /** Mixed-case tokens in the title (dUSDC, oMON) that must not be uppercased. */
  keepCase?: readonly string[];
  /** The site's main card: the swap form, the mint box, the question box. */
  card: ReactNode;
}): JSX.Element {
  return (
    <section className={`${FRAME} py-12 md:py-16 lg:py-24`}>
      <div className={`${GRID} gap-y-12 lg:items-center`}>
        <div className="col-span-4 grid gap-6 md:col-span-8 lg:col-span-6">
          <p className={T.label}>{badge}</p>
          <TextReveal
            as="h1"
            text={title}
            immediate
            className={SITE_H1}
            {...(keepCase ? { keepCase } : {})}
          />
          <p className={`${T.lead} max-w-[46ch]`}>{body}</p>
        </div>
        <Reveal className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">{card}</Reveal>
      </div>
    </section>
  );
}

/** The head of a secondary page: its title, one line, and the sample-figures note. */
export function PageHead({
  title,
  body,
  note,
}: {
  title: string;
  body: string;
  note: string;
}): JSX.Element {
  return (
    <div className="grid max-w-[760px] gap-4">
      <TextReveal
        as="h1"
        text={title}
        immediate
        className="font-display text-[clamp(2.75rem,1.5rem+4vw,5rem)] font-extrabold uppercase leading-[0.92] text-[color:var(--fg)]"
      />
      <p className={T.lead}>{body}</p>
      <p className={T.label}>{note}</p>
    </div>
  );
}

/** A secondary page's frame: same padding as the home page's hero. */
export function PageFrame({ children }: { children: ReactNode }): JSX.Element {
  return <section className={`${FRAME} grid gap-12 py-12 md:py-16 lg:py-24`}>{children}</section>;
}

/** Daily bars, the last one in the accent. Hover a bar to read its value. */
export function BarChart({
  title,
  caption,
  unit,
  labels,
  values,
}: {
  title: string;
  caption: string;
  unit: string;
  labels: readonly string[];
  values: readonly number[];
}): JSX.Element {
  const max = Math.max(...values);
  return (
    <Reveal className="grid gap-6 border-t border-[color:var(--rule-strong)] pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className={`${T.h3} text-[color:var(--fg)]`}>{title}</h2>
        <p className={T.small}>{caption}</p>
      </div>
      <figure className="grid gap-2">
        <div className="flex h-56 items-end gap-1 border-b border-[color:var(--rule-strong)] md:h-72 md:gap-2">
          {values.map((value, i) => (
            <div
              key={labels[i]}
              className="group relative flex h-full flex-1 items-end"
              title={`${labels[i]}: ${value} ${unit}`}
            >
              <div
                className={`w-full ${i === values.length - 1 ? "bg-[color:var(--accent)]" : "bg-[color:var(--rule-strong)] group-hover:bg-[color:var(--accent)]"} transition-colors`}
                style={{ height: `${(value / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="flex gap-1 md:gap-2">
          {labels.map((label) => (
            <span
              key={label}
              className={`flex-1 text-center font-mono text-label text-[color:var(--fg-muted)] ${T.num}`}
            >
              {label}
            </span>
          ))}
        </div>
        <figcaption className="sr-only">
          {caption} {values.map((v, i) => `${labels[i]}: ${v}`).join(", ")}
        </figcaption>
      </figure>
    </Reveal>
  );
}

/** A row of big figures on hairlines: two per row on phones, four from 1024 px. */
export function Totals({
  title,
  items,
}: {
  title: string;
  items: readonly { readonly label: string; readonly value: string }[];
}): JSX.Element {
  return (
    <Reveal className="grid gap-6">
      <h2 className={`${T.h3} text-[color:var(--fg)]`}>{title}</h2>
      <dl className="grid grid-cols-2 border-t border-[color:var(--rule)] lg:grid-cols-4">
        {items.map((item, i) => (
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
  );
}
