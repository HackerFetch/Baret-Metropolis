import type { CheckSource, DemoMode } from "@baret/web-ui/lib/check-types";
import { sampleCheck } from "./sample.js";

/**
 * Where LaunchPad's "Contribute" goes. Prepared samples only, for now: the
 * two `contribute()` calls need the demo sale, the demo proxy and builders
 * in `@baret/demo` (tasks/FOR_EZGIN.md), and the frontend never writes
 * calldata by hand. Once they ship, the live path is NovaSwap's: build the
 * call, `analyzeCall` it, fail closed.
 */

export interface ContributeInput {
  readonly mode: DemoMode;
  /** MON, already checked against the sale's limits. */
  readonly amount: number;
}

/** Whether SOURCE asks Baret's server. Flip it with SOURCE: the panel's header note reads it. */
export const LIVE = false;

export const SOURCE: CheckSource<ContributeInput> = async (input) =>
  sampleCheck(input.mode, input.amount);
