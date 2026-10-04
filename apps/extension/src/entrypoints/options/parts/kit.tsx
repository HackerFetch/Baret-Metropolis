import { common, extFrame } from "@baret/content";
import { Button, VerdictTag } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { T } from "@baret/web-ui/lib/type";
import { createContext, type JSX, type ReactNode, use, useEffect, useId, useRef } from "react";
import type { Activity } from "../../../data/types.js";
import { activityText, partyOf, statusOf, timeOf } from "../../../data/words.js";

/**
 * The options page's shared pieces, in the wallet's grammar: the sample
 * notice, a modal dialog that states every consequence before its button, a
 * labelled native select, a search field, a figure for a summary strip, and
 * one line of the log. Native controls throughout: keyboard, find-in-page
 * and screen readers work with no library.
 */

/** Above every page: nothing here is connected yet, and nothing is sent. */
export function SampleNotice(): JSX.Element {
  return (
    <aside
      aria-label={extFrame.sample.tag}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[color:var(--rule)] pb-4"
    >
      <Tag tone="neutral" size="sm">
        {extFrame.sample.tag}
      </Tag>
      <p className={`${T.small} min-w-[24ch] flex-1`}>{extFrame.sample.body}</p>
    </aside>
  );
}

/**
 * A modal dialog: the focus stays inside, Escape cancels, the page behind
 * dims. `onConfirm` runs on the main button; the dialog closes when `open`
 * turns false, so the caller decides when the work is done.
 */
export function Dialog({
  open,
  title,
  children,
  action,
  cancel = common.actions.cancel,
  onConfirm,
  onCancel,
  danger = false,
  disabled = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  action: string;
  cancel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onCancel}
      className="m-auto w-[min(92vw,560px)] border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-0 text-[color:var(--fg)] backdrop:bg-black/55"
    >
      <div className="grid gap-5 p-6">
        <h2 id={titleId} className={`${T.h3} text-[color:var(--fg)]`}>
          {title}
        </h2>
        <div className="grid gap-3">{children}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            disabled={disabled}
            onClick={onConfirm}
          >
            {action}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

const CONTROL =
  "h-11 w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 text-base text-[color:var(--fg)] placeholder:text-[color:var(--fg-muted)] focus-visible:border-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

export const INPUT = CONTROL;

/** A labelled native select. */
export function Select<V extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: V;
  options: readonly { readonly value: V; readonly label: string }[];
  onChange: (value: V) => void;
  className?: string;
}): JSX.Element {
  const id = useId();
  return (
    <div className={`grid min-w-0 gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className={T.label}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const picked = options.find((o) => o.value === event.target.value);
          if (picked) onChange(picked.value);
        }}
        className={`${CONTROL} cursor-pointer pr-8`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A search field: its placeholder is its visible prompt, its label is for readers. */
export function Search({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}): JSX.Element {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={CONTROL}
      />
    </div>
  );
}

/** One figure of a summary strip: the number large, what it counts under it. */
export function Figure({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <div className="grid content-start gap-1 border-t border-[color:var(--rule-strong)] pt-3">
      <p
        className={`font-display text-4xl font-extrabold leading-none text-[color:var(--fg)] ${T.num}`}
      >
        {value}
      </p>
      <p className={T.small}>{label}</p>
    </div>
  );
}

/** One line of the log: the verdict at the time, who and what, and when. */
export function LogLine({ item }: { item: Activity }): JSX.Element {
  const status = statusOf(item);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3.5 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
      <span className="col-start-1 row-start-1 flex">
        {item.verdict ? (
          <VerdictTag kind={item.verdict} label={common.verdicts[item.verdict].label} />
        ) : null}
      </span>
      <span className="col-span-2 row-start-2 grid min-w-0 gap-0.5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <span className="truncate text-base font-medium text-[color:var(--fg)]">
          {partyOf(item)}
        </span>
        <span className="text-sm text-[color:var(--fg-muted)]">
          {activityText(item)}
          {status ? ` · ${status}` : ""}
        </span>
      </span>
      <time
        dateTime={item.at}
        className={`col-start-2 row-start-1 justify-self-end font-mono text-sm text-[color:var(--fg-muted)] sm:col-start-3 ${T.num}`}
      >
        {timeOf(item.at)}
      </time>
    </div>
  );
}

/** A link inside running copy or beside a block title. */
export const LINK =
  "text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 transition-colors hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

/** Locks the wallet from any page (Settings, Lock now): the layout provides it. */
export const LockContext = createContext<() => void>(() => {});

export function useLock(): () => void {
  return use(LockContext);
}
