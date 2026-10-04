import type { LoggedVerdict } from "@baret/wallet-ui/data/types";
import { ImgWell } from "@baret/web-ui/components/Img";
import type { ImgAsset } from "@baret/web-ui/lib/img";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, type ReactNode, useId } from "react";

/**
 * The popup's small pieces, in the landing's grammar at 360 px: a section
 * with a mono label on a hairline, a verdict dot, a quiet text button, and an
 * empty state with its picture. No cards around running copy.
 */

/** A section of a tab: its label and an optional action on one line, then the content. */
export function PopupSection({
  title,
  action,
  children,
  flush = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  /** Rows that run edge to edge (the log), so their hover fills the width. */
  flush?: boolean;
}): JSX.Element {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`grid gap-3 border-t border-[color:var(--rule)] pt-4 ${flush ? "pb-1" : "px-4 pb-5"}`}
    >
      <div className={`flex min-h-6 items-center justify-between gap-3 ${flush ? "px-4" : ""}`}>
        <h2 id={id} className={T.label}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Underlined text that acts: "See all", "Manage", "Clear filter". */
export const TEXT_BUTTON =
  "inline-flex min-h-9 items-center text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 transition-colors hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

export function TextButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button type="button" onClick={onClick} className={TEXT_BUTTON}>
      {children}
    </button>
  );
}

const DOT: Record<LoggedVerdict | "none", string> = {
  safe: "bg-[color:var(--safe)]",
  caution: "bg-[color:var(--caution)]",
  blocked: "bg-[color:var(--blocked)]",
  unreachable: "bg-[color:var(--fg)]",
  none: "border border-[color:var(--fg-muted)]",
};

/** The verdict at a glance. Always beside words that say the same, so it is hidden from readers. */
export function Dot({ verdict }: { verdict: LoggedVerdict | null }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2.5 shrink-0 rounded-full ${DOT[verdict ?? "none"]}`}
    />
  );
}

/** Nothing here yet: the screen's picture, one line of title, one of body, one action. */
export function PopupEmpty({
  picture,
  title,
  body,
  action,
}: {
  picture: ImgAsset;
  title: string;
  body: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="grid gap-4 px-4 py-5">
      <ImgWell
        asset={picture}
        ratio="16/10"
        dim
        sizes="328px"
        className="border border-[color:var(--rule)]"
      />
      <div className="grid gap-1.5">
        <p className="font-display text-xl font-bold uppercase leading-tight tracking-[0.02em] text-[color:var(--fg)]">
          {title}
        </p>
        <p className={T.small}>{body}</p>
      </div>
      {action ? <div className="flex">{action}</div> : null}
    </div>
  );
}

/** A problem stated plainly in the popup: what happened, what to do. */
export function PopupProblem({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div role="alert" className="grid gap-1.5 border-l-4 border-[color:var(--fg)] py-0.5 pl-3">
      <p className="font-display text-base font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]">
        {title}
      </p>
      <p className={T.small}>{body}</p>
      {action ? <div className="flex pt-1">{action}</div> : null}
    </div>
  );
}

/**
 * Filter chips: one native radio group, so one tab stop and the arrow keys.
 * The row scrolls sideways when it runs out of room; the picked chip fills
 * with ink, orange stays the focus ring.
 */
export function Chips<V extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly { readonly id: V; readonly label: string }[];
  value: V;
  onChange: (value: V) => void;
}): JSX.Element {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{legend}</legend>
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => (
          <label key={option.id} className="relative shrink-0 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="peer absolute inset-0 size-full cursor-pointer appearance-none"
            />
            <span className="pointer-events-none flex h-9 items-center border border-[color:var(--control-edge)] px-3 text-sm font-medium text-[color:var(--fg)] transition-colors peer-hover:border-[color:var(--fg)] peer-checked:border-[color:var(--fg)] peer-checked:bg-[color:var(--fg)] peer-checked:text-[color:var(--ground)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-[color:var(--accent)] forced-colors:peer-checked:border-[color:Highlight] forced-colors:peer-checked:bg-[color:Highlight] forced-colors:peer-checked:text-[color:HighlightText]">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A tab's own title: the display face, one step under a page title. */
export function TabTitle({ title, body }: { title: string; body?: string }): JSX.Element {
  return (
    <header className="grid gap-1.5 px-4 pt-5 pb-4">
      <h1 className="font-display text-[2rem] font-extrabold uppercase leading-none tracking-[-0.005em] text-[color:var(--fg)]">
        {title}
      </h1>
      {body ? <p className={T.small}>{body}</p> : null}
    </header>
  );
}
