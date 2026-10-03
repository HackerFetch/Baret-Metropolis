import type { CheckSource, DemoMode } from "@baret/web-ui/lib/check-types";
import { sampleCheck } from "./sample.js";

/**
 * Where OrbitYield's "Stake" goes. Prepared samples only, for now: the two
 * `stake()` calls need the demo pools and builders in `@baret/demo`
 * (tasks/FOR_EZGIN.md), and the frontend never writes calldata by hand.
 * Once they ship, the live path is NovaSwap's: build the call, `analyzeCall`
 * it, fail closed.
 */

export interface StakeInput {
  readonly mode: DemoMode;
  /** MON, already checked against the balance. */
  readonly amount: number;
}

export const SOURCE: CheckSource<StakeInput> = async (input) =>
  sampleCheck(input.mode, input.amount);
