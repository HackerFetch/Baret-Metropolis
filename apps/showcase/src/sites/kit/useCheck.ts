import { runCheck } from "@baret/web-ui/lib/check";
import type { CheckResult, CheckSource } from "@baret/web-ui/lib/check-types";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The panel's state: idle, then a walk through the analysis phases, then the
 * result. The phases mirror what Baret does (read, simulate, run the
 * detectors, apply the rules) at 160 ms each. The result shows once the walk
 * is over and the answer is in: a fast answer waits for the walk, a slow one
 * keeps the last phase lit until it lands or the check times out. Reduced
 * motion skips the walk and waits on the last phase.
 */

export type CheckState =
  | { readonly phase: "idle" }
  | { readonly phase: "checking"; readonly step: number; readonly result: CheckResult | null }
  | { readonly phase: "done"; readonly result: CheckResult };

export const STEP_MS = 160;

/** The phase timer ticked. Pure, exported for tests. */
export function advance(state: CheckState, steps: number): CheckState {
  if (state.phase !== "checking") return state;
  if (state.step + 1 < steps) return { ...state, step: state.step + 1 };
  return state.result ? { phase: "done", result: state.result } : state;
}

/** The answer arrived. Pure, exported for tests. */
export function settle(state: CheckState, result: CheckResult, steps: number): CheckState {
  if (state.phase !== "checking") return state;
  return state.step >= steps - 1 ? { phase: "done", result } : { ...state, result };
}

export function useCheck<I>(
  steps: number,
  source: CheckSource<I>,
): {
  state: CheckState;
  start: (input: I) => void;
  reset: () => void;
} {
  const reduce = useReduce();
  const [state, setState] = useState<CheckState>({ phase: "idle" });
  // Only the latest run may write its answer; starting again or closing
  // aborts the one before.
  const run = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    run.current += 1;
    controller.current?.abort();
    controller.current = null;
  }, []);

  const start = useCallback(
    (input: I) => {
      stop();
      const id = run.current;
      const ctrl = new AbortController();
      controller.current = ctrl;
      setState({ phase: "checking", step: reduce ? Math.max(steps - 1, 0) : 0, result: null });
      void runCheck(source, input, ctrl).then((result) => {
        if (run.current === id) setState((s) => settle(s, result, steps));
      });
    },
    [reduce, steps, source, stop],
  );

  const reset = useCallback(() => {
    stop();
    setState({ phase: "idle" });
  }, [stop]);

  useEffect(() => {
    if (state.phase !== "checking") return;
    const id = window.setTimeout(() => setState((s) => advance(s, steps)), STEP_MS);
    return () => window.clearTimeout(id);
  }, [state, steps]);

  useEffect(() => stop, [stop]);

  return { state, start, reset };
}
