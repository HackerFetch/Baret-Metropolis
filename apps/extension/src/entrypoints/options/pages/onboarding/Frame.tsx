/**
 * The setup's shared pieces, in the wallet setup's grammar: the step
 * indicator, the frame every step sits in (stencil title, two-tone lead, the
 * step's picture beside the copy from 768 px), a labelled field with its
 * hint and error, an outside link that looks like a button, the account's
 * address with a copy button, and the mark of a finished line. Once the
 * reader has moved past the first screen, each new step's heading takes the
 * focus, so a keyboard or screen reader lands on what changed.
 */

import { extFrame, extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { ACCOUNT } from "@baret/wallet-ui/data/sample";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { ImgWell } from "@baret/web-ui/components/Img";
import { TwoToneText } from "@baret/web-ui/components/SectionHeader";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import { ArrowUpRight, Check } from "lucide-react";
import {
  createContext,
  type JSX,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  use,
  useEffect,
  useId,
  useRef,
} from "react";
import type { ImgAsset } from "../../../../assets.js";
import { activeAccount, useExtension } from "../../../../data/store.js";
import { INPUT } from "../../parts/kit.js";

/** True once the reader has left the first screen: from then on, new headings take the focus. */
export const MovedContext = createContext(false);

/** The eight steps. A restored account skips two of them, drawn dashed and struck through. */
export function Steps({
  current,
  skipped = [],
}: {
  current: number;
  skipped?: readonly number[];
}): JSX.Element {
  return (
    <div className="grid gap-2">
      <ol className="grid grid-cols-8 gap-2">
        {extOnboarding.steps.map((step, i) => {
          const skip = skipped.includes(i);
          const edge = skip
            ? "border-dashed border-[color:var(--rule-strong)]"
            : i <= current
              ? "border-[color:var(--fg)]"
              : "border-[color:var(--rule)]";
          return (
            <li
              key={step}
              aria-current={i === current ? "step" : undefined}
              className={`grid min-w-0 gap-2 border-t-2 pt-2 ${edge}`}
            >
              <span
                className={`font-mono text-label uppercase ${i === current ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"} ${skip ? "line-through" : ""}`}
              >
                <span className={T.num}>{i + 1}</span>{" "}
                <span className="sr-only md:not-sr-only">{step}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p
        aria-hidden="true"
        className="font-mono text-label uppercase text-[color:var(--fg)] md:hidden"
      >
        {extOnboarding.steps[current]}
      </p>
    </div>
  );
}

/**
 * One step: the title and lead, the step's own content, its picture beside.
 * `wide` runs under both at full width, for content too broad for the copy
 * column (the three template cards).
 */
export function StepFrame({
  title,
  body,
  picture,
  children,
  wide,
}: {
  title: string;
  body: string;
  picture: ImgAsset;
  children?: ReactNode;
  wide?: ReactNode;
}): JSX.Element {
  const moved = use(MovedContext);
  const copy = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    if (!moved) return;
    const heading = copy.current?.querySelector("h1");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [moved]);

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-10 md:grid-cols-12 md:items-start md:gap-8"
    >
      <div ref={copy} className="@container grid min-w-0 content-start gap-6 md:col-span-7">
        <TextReveal
          as="h1"
          id={headingId}
          text={title}
          immediate
          className={`${T.h1Page} text-balance text-[color:var(--fg)] focus:outline-none`}
        />
        <p className={`${T.lead} max-w-[52ch]`}>
          <TwoToneText text={body} />
        </p>
        {children}
      </div>
      <ImgWell
        asset={picture}
        ratio="4/3"
        dim
        sizes="(min-width: 768px) 420px, 100vw"
        className="border border-[color:var(--rule)] md:col-span-5"
      />
      {wide ? <div className="grid min-w-0 gap-6 md:col-span-12">{wide}</div> : null}
    </section>
  );
}

export const LABEL = "text-sm font-medium text-[color:var(--fg)]";
export const ERROR = "text-sm font-medium text-[color:var(--blocked-ink)]";

/** A labelled field: the hint and any error under it, both read with the field. */
export function TextField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  autoComplete,
  hint,
  error,
  describedBy,
  inputRef,
  mono = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "password";
  autoComplete: string;
  hint?: string;
  error?: string | null;
  /** More ids the field is described by, such as a strength meter. */
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  mono?: boolean;
  children?: ReactNode;
}): JSX.Element {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const described = [hint ? hintId : "", describedBy ?? "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className={`${INPUT} ${mono ? "font-mono" : ""}`}
      />
      {hint ? (
        <p id={hintId} className={T.small}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className={ERROR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A link to another site, in a new tab, drawn as a button. */
export function OutLink({
  href,
  label,
  variant = "ghost",
  size = "lg",
  onClick,
  describedBy,
}: {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "lg";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  describedBy?: string;
}): JSX.Element {
  return (
    <Button asChild variant={variant} size={size}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        aria-describedby={describedBy}
      >
        {label}
        <ArrowUpRight aria-hidden="true" strokeWidth={1.5} />
      </a>
    </Button>
  );
}

/** The new account's address, whole and wrapped, with a copy button. */
export function AddressLine(): JSX.Element {
  const { state } = useExtension();
  // Live: the account the keystore just made. The sample shows its own.
  const address =
    state.scenario === "live" ? (activeAccount(state)?.address ?? "") : ACCOUNT.address;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <code className="min-w-0 font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
        {address}
      </code>
      <CopyButton text={address} label={extFrame.account.copy} done={extFrame.account.copied} />
    </div>
  );
}

/** The mark beside a line: a check once it is finished, a still dot while it runs. */
export function Mark({ done }: { done: boolean }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`grid size-6 shrink-0 place-items-center border ${done ? "border-[color:var(--safe)] text-[color:var(--safe)]" : "border-[color:var(--rule-strong)]"}`}
    >
      {done ? (
        <Check className="size-4" strokeWidth={2} />
      ) : (
        <span className="size-1.5 bg-[color:var(--fg-muted)]" />
      )}
    </span>
  );
}
