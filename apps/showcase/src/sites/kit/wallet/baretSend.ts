import type { Hex } from "viem";
import { SendRefused } from "./baret.js";
import { askBaret, type BaretAnswer } from "./baretWindow.js";
import type { SendCall } from "./store.js";

/**
 * "Sign with your wallet" through the Baret wallet's own window. A site with
 * the Baret wallet connected (store.ts `baret`) has no injected provider to
 * send through, so each call of a run goes to the window instead, which
 * checks it with Baret and signs only what Baret clears.
 *
 * The window has to open inside the click, so the site opens the first ask
 * itself (`askBaret`) and hands the pending answer in; later steps ask again
 * once the step before is confirmed. Every answer that is not a signature
 * ends the run with a reason the sign block can word. Fail closed: a window
 * that closes before it answers signed nothing.
 */

/** The window's call shape: the same fields, without the sender. */
export function windowCallOf(call: SendCall): { to: Hex; value: string; data: Hex } {
  return { to: call.to, value: call.value, data: call.data };
}

/** The signed hash, or the refusal as a send error. Pure, exported for tests. */
export function hashOf(answer: BaretAnswer): Hex {
  switch (answer.type) {
    case "signed":
      return answer.hash;
    case "refused":
      if (answer.reason === "declined") throw new SendRefused("rejected");
      if (answer.reason === "unreachable") throw new SendRefused("unreachable");
      throw new SendRefused("checked");
    case "blocked":
      throw new SendRefused("window");
    case "busy":
      throw new SendRefused("pending");
    default:
      // "closed", or an answer that is not a signature (connect, typed).
      throw new SendRefused("closed");
  }
}

/**
 * A sender for `useSendFlow.run`: the first step takes the ask the click
 * already opened, every later step opens the window again.
 */
export function baretSender(
  first: Promise<BaretAnswer>,
): (call: SendCall, index: number) => Promise<Hex> {
  return async (call, index) => {
    const answer = await (index === 0 ? first : askBaret("sign", windowCallOf(call)));
    return hashOf(answer);
  };
}
