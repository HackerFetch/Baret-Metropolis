import type { CheckSource, DemoMode } from "@baret/web-ui/lib/check-types";
import { sampleCheck } from "./sample.js";

/**
 * Where Scrybe's "Pay and ask" and "Start the agent" go. Prepared samples
 * only, for now: a live answer needs the 402 reply from the demo paywall and
 * a payment request built by `@baret/demo` (tasks/FOR_EZGIN.md), and the
 * frontend never writes a payment by hand. Once those exist, the live path
 * is NovaSwap's: build the request, send it to `/v1/analyze` with the
 * payment context, fail closed on anything else.
 */

export interface AskInput {
  readonly mode: DemoMode;
  /** The hourly cap the visitor picked for the agent loop, in base units. */
  readonly cap: bigint;
}

export const SOURCE: CheckSource<AskInput> = async (input) => sampleCheck(input.mode, input.cap);
