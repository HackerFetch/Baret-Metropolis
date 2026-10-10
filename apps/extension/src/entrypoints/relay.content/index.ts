import {
  ERRORS,
  PAGE_CHANNEL,
  type PageAnswer,
  parsePageRequest,
  type RpcOutcome,
} from "../../core/protocol.js";
import { onMessage, sendMessage } from "../../lib/messaging.js";

/**
 * The isolated-world content script. This is the trust boundary.
 *
 * It is the only thing that talks to both the page and the extension, so it
 * never forwards a message without the background stamping the origin the
 * browser reports. A page can say anything about who it is: nothing a page
 * sends about its own identity travels past this file.
 */
export default defineContentScript({
  matches: ["file://*/*", "http://*/*", "https://*/*"],
  runAt: "document_start",
  allFrames: true,
  main() {
    const origin = window.location.origin;
    /** Requests this frame sent that wait for the owner. */
    const waiting = new Set<string>();

    function answer(id: string, outcome: RpcOutcome): void {
      const message: PageAnswer =
        "error" in outcome
          ? { channel: PAGE_CHANNEL, dir: "response", id, error: outcome.error }
          : { channel: PAGE_CHANNEL, dir: "response", id, result: outcome.result };
      window.postMessage(message, origin);
    }

    window.addEventListener("message", (event) => {
      // Only this frame's own page, never a child frame or another window.
      if (event.source !== window || event.origin !== origin) return;
      const request = parsePageRequest(event.data);
      if (!request) return;
      sendMessage("rpc", { id: request.id, method: request.method, params: request.params }).then(
        (reply) => {
          if ("pending" in reply) waiting.add(request.id);
          else answer(request.id, reply);
        },
        () => answer(request.id, { error: ERRORS.internal }),
      );
    });

    onMessage("rpcResult", ({ data }) => {
      // Every frame of the tab hears it; only the one that asked answers.
      if (!waiting.delete(data.id)) return;
      answer(data.id, data.outcome);
    });
  },
});
