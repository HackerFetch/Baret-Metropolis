import type { CheckSource, DemoMode } from "@baret/web-ui/lib/check-types";
import { sampleCheck } from "./sample.js";

/**
 * Where PixelDrop's "Mint" goes. Prepared samples only, for now: the honest
 * `mint(count)` and the attack `setApprovalForAll(operator, true)` need a
 * demo collection and builders in `@baret/demo` (tasks/FOR_EZGIN.md), and
 * the frontend never writes calldata by hand. Once they ship, the live path
 * is NovaSwap's: build the call, `analyzeCall` it, fail closed.
 */

export interface MintInput {
  readonly mode: DemoMode;
  /** How many pieces, already checked against the per-wallet limit. */
  readonly count: number;
}

export const SOURCE: CheckSource<MintInput> = async (input) => sampleCheck(input.mode, input.count);
