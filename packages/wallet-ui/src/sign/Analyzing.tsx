import { sign } from "@baret/content";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { type JSX, useEffect, useState } from "react";

/**
 * The loading state while Baret's answer is on its way: the stages it walks
 * through (simulate, read what changes, run the checks, apply the rules), a
 * thin bar that fills with them, and skeleton rows where the answer lands.
 * The stages are a pace, not a claim: the last one stays in progress until
 * the answer arrives, and nothing reads as done before the verdict is shown.
 *
 * The first render is the same on the server and the client (stage one);
 * the timer starts in an effect. Reduced motion: no spinner, no shimmer, the
 * stages still move on so the reader sees progress.
 */

/** How long each stage holds before the next one starts. */
const STAGE_MS = 650;

function Dot({ state }: { state: "done" | "now" | "next" }): JSX.Element {
  if (state === "done") {
    return (
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center rounded-full bg-[color:var(--fg)] text-[color:var(--ground)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-3"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "now") {
    return (
      <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-[color:var(--rule-strong)]" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[color:var(--accent)] motion-reduce:animate-none motion-reduce:border-t-[color:var(--fg)]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
      <span className="size-2 rounded-full bg-[color:var(--rule-strong)]" />
    </span>
  );
}

function Skeleton({ width }: { width: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`block h-3 rounded-sm bg-[color:var(--rule)] animate-pulse motion-reduce:animate-none ${width}`}
    />
  );
}

export function Analyzing({
  message = false,
  compact = false,
}: {
  /** A typed message: read, never simulated, so its stages say so. */
  message?: boolean;
  /** The 360 px popup: tighter, no skeleton rows. */
  compact?: boolean;
}): JSX.Element {
  const reduce = useReduce();
  const { checking } = sign.verdict;
  const steps = message ? Object.values(checking.stepsMessage) : Object.values(checking.steps);
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (at >= steps.length - 1) return;
    const id = window.setTimeout(() => setAt((n) => n + 1), STAGE_MS);
    return () => window.clearTimeout(id);
  }, [at, steps.length]);
  // The bar never reaches the end on its own: the answer finishes it.
  const filled = Math.min(92, ((at + 0.6) / steps.length) * 100);
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <p className="font-display text-xl font-extrabold uppercase leading-tight text-[color:var(--fg)]">
          {checking.title}
        </p>
        <p className="text-sm text-[color:var(--fg-muted)]">
          {message ? checking.bodyMessage : checking.body}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="relative h-1 overflow-hidden rounded-full bg-[color:var(--rule)]"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full bg-[color:var(--accent)] ${reduce ? "" : "transition-[width] duration-500 ease-out"}`}
          style={{ width: `${filled}%` }}
        />
      </div>
      <ol className="grid gap-2.5">
        {steps.map((step, i) => {
          const state = i < at ? "done" : i === at ? "now" : "next";
          return (
            <li
              key={step}
              className={`flex items-center gap-3 text-sm ${state === "next" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"} ${state === "now" ? "font-medium" : ""}`}
            >
              <Dot state={state} />
              <span>{step}</span>
              {state === "next" ? null : (
                <span className="sr-only">
                  {state === "done" ? checking.stepDone : checking.stepNow}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {compact ? null : (
        <div className="grid gap-2.5 border-t border-[color:var(--rule)] pt-4">
          <Skeleton width="w-1/3" />
          <Skeleton width="w-5/6" />
          <Skeleton width="w-2/3" />
        </div>
      )}
    </div>
  );
}
