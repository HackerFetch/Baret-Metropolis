import type { CheckSource, DemoMode } from "@baret/web-ui/lib/check-types";
import { sampleCheck } from "./sample.js";

/**
 * Where ClaimHub's "Claim 2,410 HUB" goes. Prepared samples only, for now:
 * the honest `claim()` and the attack `approve(spender, unlimited)` on the
 * canonical test USDC need the demo distributor and builders in
 * `@baret/demo` (tasks/FOR_EZGIN.md), and the frontend never writes
 * calldata by hand. Once they ship, the live path is NovaSwap's: build the
 * call, `analyzeCall` it, fail closed.
 */

export interface ClaimInput {
  readonly mode: DemoMode;
  /** The wallet the eligibility check read. */
  readonly wallet: string;
}

/** Whether SOURCE asks Baret's server. Flip it with SOURCE: the panel's header note reads it. */
export const LIVE = false;

export const SOURCE: CheckSource<ClaimInput> = async (input) => sampleCheck(input.mode);
