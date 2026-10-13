import { T } from "@baret/web-ui/lib/type";
import { type JSX, useEffect, useState } from "react";

/**
 * A staged progress card for a check that is running: a thin bar that fills
 * as the stages pass, the stages themselves (done, running, waiting), and a
 * skeleton of the answer underneath so the layout does not jump when it
 * lands. The stages advance on a timer and the last one stays lit until the
 * caller swaps this card for the answer, so a slow API never shows a stage
 * as done that is not. Reduced motion: no spinner, no shimmer, the bar and
 * the stages still move so the reader knows something is happening.
 * Rendered only after a click, so it never runs during the prerender.
 */

export function StageProgress({
  stages,
  title,
  stepMs = 650,
  skeleton = 3,
}: {
  stages: readonly string[];
  title: string;
  stepMs?: number;
  skeleton?: number;
}): JSX.Element {
  const [step, setStep] = useState(0);
  const last = stages.length - 1;

  useEffect(() => {
    if (step >= last) return;
    const id = window.setTimeout(() => setStep((s) => Math.min(s + 1, last)), stepMs);
    return () => window.clearTimeout(id);
  }, [step, last, stepMs]);

  // The bar never reaches the end on its own: the answer completes it.
  const pct = Math.round(((step + 0.6) / stages.length) * 100);

  return (
    <div
      aria-busy="true"
      className="grid gap-5 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-5 md:p-6"
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className={`${T.h3} text-[color:var(--fg)]`}>{title}</p>
          <span className="font-mono text-xs tabular-nums text-[color:var(--fg-muted)]">
            {Math.min(step + 1, stages.length)}/{stages.length}
          </span>
        </div>
        <div className="relative h-1 overflow-hidden bg-[color:var(--rule)]">
          <span
            className="absolute inset-y-0 left-0 bg-[color:var(--accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
          <span className="baret-sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent motion-reduce:hidden" />
        </div>
      </div>

      <ol className="grid gap-3">
        {stages.map((label, i) => {
          const state = i < step ? "done" : i === step ? "active" : "waiting";
          return (
            <li key={label} className="flex items-center gap-3">
              <StageMark state={state} />
              <span
                className={
                  state === "waiting"
                    ? "text-sm text-[color:var(--fg-faint)]"
                    : state === "active"
                      ? "text-sm font-medium text-[color:var(--fg)]"
                      : "text-sm text-[color:var(--fg-muted)]"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div aria-hidden="true" className="grid gap-2 border-t border-[color:var(--rule)] pt-5">
        <span className="h-6 w-28 animate-pulse bg-[color:var(--rule)] motion-reduce:animate-none" />
        {Array.from({ length: skeleton }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder rows.
            key={i}
            className="h-3 animate-pulse bg-[color:var(--rule)] motion-reduce:animate-none"
            style={{ width: `${92 - i * 18}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      <style>{`@keyframes baret-sweep{from{left:-25%}to{left:100%}}.baret-sweep{animation:baret-sweep 1.2s ease-in-out infinite}`}</style>
    </div>
  );
}

function StageMark({ state }: { state: "done" | "active" | "waiting" }): JSX.Element {
  if (state === "done") {
    return (
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center bg-[color:var(--fg)] text-[color:var(--surface)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2.5 6.5l2.2 2.2L9.5 3.8" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[color:var(--rule)] border-t-[color:var(--accent)] motion-reduce:animate-none motion-reduce:border-[color:var(--accent)]" />
        <span className="size-1.5 rounded-full bg-[color:var(--accent)]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
      <span className="size-1.5 rounded-full bg-[color:var(--rule-strong)]" />
    </span>
  );
}
