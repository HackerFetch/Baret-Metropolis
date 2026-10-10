import { settings } from "@baret/content";
import { fill } from "@baret/web-ui/lib/util";
import type { SealedOutcome } from "../live/live.js";

/** Which sealed-copy button ran last. */
export type SealedAction = "save" | "restore";

/**
 * The status line under the sealed-copy buttons. Busy wins; then the last
 * outcome, unless the rules changed since; then the session's state. A failed
 * save gets its own line, because a 502 or a timeout can still land on Monad.
 */
export function sealedStatus(input: {
  readonly busy: boolean;
  readonly outcome: SealedOutcome | null;
  readonly action: SealedAction | null;
  readonly state: "unknown" | "current" | "changed";
}): string {
  const { busy, outcome, action, state } = input;
  const copy = settings.sealed;
  if (busy) return copy.busy;
  if (outcome && state !== "changed") {
    if (outcome.result === "failed" && action === "save") return copy.outcome.saveFailed;
    return fill(copy.outcome[outcome.result], {
      version: "version" in outcome ? outcome.version : "",
    });
  }
  return state === "unknown" ? copy.prompt : copy.state[state];
}
