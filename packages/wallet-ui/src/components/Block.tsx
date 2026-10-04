import { Reveal } from "@baret/web-ui/components/Reveal";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, type ReactNode, useId } from "react";

/**
 * The pieces a wallet screen is built from, in the landing's grammar: a
 * titled block on a strong hairline, rows of label and value on hairlines,
 * an empty state in a dashed frame, and a problem stated plainly (what
 * happened, what you can do). No boxes around running copy.
 *
 * A block's content rises once as it scrolls into view, the landing's surface
 * enter (CSS Reveal: 460 ms, BRAND ease, off under reduced motion). The
 * hairline stays put, so the page never shifts.
 */

export function Block({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  /** Beside the title: a count, a link, a small action. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`grid content-start border-t border-[color:var(--rule-strong)] pt-5 ${className ?? ""}`}
    >
      <Reveal className="grid content-start gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 id={id} className={`${T.h3} text-[color:var(--fg)]`}>
            {title}
          </h2>
          {aside}
        </div>
        {children}
      </Reveal>
    </section>
  );
}

export interface Row {
  readonly label: string;
  readonly value: ReactNode;
  /** One plain line under the row. */
  readonly hint?: string;
}

export function Rows({ rows }: { rows: readonly Row[] }): JSX.Element {
  return (
    <dl className="grid border-t border-[color:var(--rule)]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-1 border-b border-[color:var(--rule)] py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6"
        >
          <dt className="text-sm text-[color:var(--fg-muted)]">{row.label}</dt>
          <dd className="min-w-0 text-sm text-[color:var(--fg)] [overflow-wrap:anywhere] sm:text-right">
            {row.value}
          </dd>
          {row.hint ? <p className={`${T.small} sm:col-span-2`}>{row.hint}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="grid gap-2 border border-dashed border-[color:var(--rule-strong)] p-6">
      <p className={`${T.h3} text-[color:var(--fg)]`}>{title}</p>
      <p className={`${T.body} max-w-[60ch]`}>{body}</p>
      {action ? <div className="mt-2 flex">{action}</div> : null}
    </div>
  );
}

/** Something that did not work: what happened, then what the reader can do. */
export function Problem({
  title,
  body,
  action,
}: {
  /** Left out when the body says it all (a field's name is the title then). */
  title?: string;
  body: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div role="alert" className="grid gap-2 border-l-4 border-[color:var(--fg)] py-1 pl-4">
      {title ? (
        <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]">
          {title}
        </p>
      ) : null}
      <p className={`${T.body} max-w-[60ch]`}>{body}</p>
      {action ? <div className="mt-1 flex">{action}</div> : null}
    </div>
  );
}
