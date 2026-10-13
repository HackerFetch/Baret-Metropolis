import { review } from "@baret/content";
import type { JSX } from "react";
import type { TimelineState } from "./reducer.js";

/**
 * The review in five stages, in the order it runs: Baret's verdict, the
 * plan, the tool calls, the decision and the payment. Each is done, running
 * or waiting, read from the state, so a stage is never marked done before
 * its event arrived. While a run streams, the running stage spins and the
 * bar fills by the stages passed. A run Baret stops skips the model's
 * stages, which read "skipped". Reduced motion: no spin.
 */

const copy = review.timeline.stages;

type Mark = "done" | "active" | "waiting" | "skipped";

export function stagesOf(state: TimelineState): readonly Mark[] {
  const running = state.phase === "running";
  const stopped = state.baret !== null && state.baret.decision !== "safe";
  const done: boolean[] = [
    state.baret !== null,
    state.plan !== null,
    state.tools.length > 0 && (state.decision !== null || state.phase !== "running"),
    state.decision !== null,
    state.phase === "done",
  ];
  const marks: Mark[] = done.map((d) => (d ? "done" : "waiting"));
  if (stopped) {
    for (const i of [1, 2, 3]) if (!done[i]) marks[i] = "skipped";
  } else if (state.phase === "done" && state.tools.length === 0 && state.decision) {
    marks[2] = "skipped";
  }
  if (state.phase === "done" && !state.sent?.hash) marks[4] = "skipped";
  if (running) {
    const next = marks.indexOf("waiting");
    if (next >= 0) marks[next] = "active";
  }
  return marks;
}

export function Stepper({ state }: { state: TimelineState }): JSX.Element {
  const marks = stagesOf(state);
  const passed = marks.filter((m) => m === "done" || m === "skipped").length;
  const pct = state.phase === "done" ? 100 : Math.round(((passed + 0.5) / marks.length) * 100);
  return (
    <div className="grid gap-4">
      <div className="relative h-1 overflow-hidden bg-[color:var(--rule)]">
        <span
          className="absolute inset-y-0 left-0 bg-[color:var(--accent)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        {copy.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <Dot mark={marks[i] ?? "waiting"} />
            <span
              className={`text-sm ${
                marks[i] === "active"
                  ? "font-medium text-[color:var(--fg)]"
                  : marks[i] === "done"
                    ? "text-[color:var(--fg)]"
                    : "text-[color:var(--fg-faint)]"
              } ${marks[i] === "skipped" ? "line-through" : ""}`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Dot({ mark }: { mark: Mark }): JSX.Element {
  if (mark === "done") {
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
  if (mark === "active") {
    return (
      <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[color:var(--rule)] border-t-[color:var(--accent)] motion-reduce:animate-none" />
        <span className="size-1.5 rounded-full bg-[color:var(--accent)]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
      <span
        className={`size-1.5 rounded-full ${
          mark === "skipped" ? "bg-[color:var(--rule)]" : "bg-[color:var(--rule-strong)]"
        }`}
      />
    </span>
  );
}
