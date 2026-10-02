import { useCallback, useEffect, useState } from "react";
import { useReduce } from "../../shared/useReduce.js";

/**
 * The panel's state: idle, then a short walk through the analysis phases,
 * then the result. The phases mirror what Baret really does (read, simulate,
 * run the detectors, apply the rules) and take 160 ms each, so the visitor
 * sees the order of work without a fake wait. Reduced motion skips straight
 * to the result.
 */

export type CheckState =
  | { readonly phase: "idle" }
  | { readonly phase: "checking"; readonly step: number }
  | { readonly phase: "done" };

export const STEP_MS = 160;

/** Pure transition, exported for tests. */
export function nextState(state: CheckState, steps: number): CheckState {
  if (state.phase !== "checking") return state;
  return state.step + 1 >= steps ? { phase: "done" } : { phase: "checking", step: state.step + 1 };
}

export function useSampleCheck(steps: number): {
  state: CheckState;
  start: () => void;
  reset: () => void;
} {
  const reduce = useReduce();
  const [state, setState] = useState<CheckState>({ phase: "idle" });

  const start = useCallback(() => {
    setState(reduce || steps <= 0 ? { phase: "done" } : { phase: "checking", step: 0 });
  }, [reduce, steps]);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  useEffect(() => {
    if (state.phase !== "checking") return;
    const id = window.setTimeout(() => setState((s) => nextState(s, steps)), STEP_MS);
    return () => window.clearTimeout(id);
  }, [state, steps]);

  return { state, start, reset };
}
