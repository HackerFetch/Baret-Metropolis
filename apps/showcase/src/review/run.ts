import type { ReviewScenarioId } from "@baret/content";
import { honest } from "./recorded/honest.js";
import { injected } from "./recorded/injected.js";
import { overpay } from "./recorded/overpay.js";
import type { ReviewAnswer, TimelineAction } from "./reducer.js";
import { readSse } from "./sse.js";

/**
 * Runs one review against Baret's API and streams it into the timeline.
 *
 * The showcase reaches the server at `/api` (the Vite proxy in development,
 * a Vercel rewrite in production), like the demo sites' live checks.
 *
 * When the live run cannot be shown (the route answers 503 or 429, the
 * network fails, or nothing arrives within 60 s) the page falls back to the
 * run recorded on 9 October 2026, labelled as recorded. A run that already
 * showed live steps and then broke stays live and says it stopped: mixing a
 * recording into a live timeline would present it as live.
 */

export const REVIEW_URL = "/api/v1/review";
export const HEALTH_URL = "/api/health";
export const FIRST_EVENT_TIMEOUT_MS = 60_000;

export const RECORDED: Readonly<Record<ReviewScenarioId, ReviewAnswer>> = {
  honest,
  overpay,
  injected,
};

/** Why a live run did not start: each of these shows the recorded run. */
export type Fallback = "unavailable" | "limited" | "network" | "timeout";

/** The fallback for a response status, or null when the stream can be read. */
export function fallbackFor(status: number): Fallback | null {
  if (status === 503) return "unavailable";
  if (status === 429) return "limited";
  if (status < 200 || status >= 300) return "unavailable";
  return null;
}

/** Wakes the API on page load (a free instance sleeps). Errors are ignored. */
export function wakeApi(fetchImpl: typeof fetch = fetch): void {
  fetchImpl(HEALTH_URL).catch(() => undefined);
}

export async function runReview(
  scenario: ReviewScenarioId,
  dispatch: (action: TimelineAction) => void,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<"live" | Fallback> {
  const { fetchImpl = fetch, timeoutMs = FIRST_EVENT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const outer = options.signal;
  outer?.addEventListener("abort", () => controller.abort(), { once: true });
  let seen = false;
  let finished = false;
  let timedOut = false;
  const timer = setTimeout(() => {
    if (seen) return;
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const fallBack = (why: Fallback): Fallback => {
    dispatch({ type: "recorded", answer: RECORDED[scenario] });
    return why;
  };

  dispatch({ type: "begin", scenario });
  try {
    const res = await fetchImpl(REVIEW_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify({ scenario }),
      signal: controller.signal,
    });
    const why = fallbackFor(res.status);
    if (why) return fallBack(why);
    if (!res.body) return fallBack("network");
    await readSse(res.body, ({ event, data }) => {
      seen = true;
      if (event === "done" || event === "error") finished = true;
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = null;
      }
      dispatch({ type: "event", event, data: parsed });
    });
    if (!seen) return fallBack(timedOut ? "timeout" : "network");
    if (!finished) dispatch({ type: "fail", message: "the stream ended before the decision" });
    return "live";
  } catch (error) {
    if (outer?.aborted) throw error;
    if (!seen) return fallBack(timedOut ? "timeout" : "network");
    dispatch({ type: "fail", message: "the connection was lost" });
    return "live";
  } finally {
    clearTimeout(timer);
  }
}
