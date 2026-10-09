import { review as copy } from "@baret/content";
import { describe, expect, it, vi } from "vitest";
import { progressLine } from "../pages/ReviewPage.js";
import { IDLE, reduce, type TimelineAction, type TimelineState } from "./reducer.js";
import { fallbackFor, RECORDED, REVIEW_URL, runReview } from "./run.js";
import { readSse, SseParser } from "./sse.js";
import { shortArguments, toolSummary } from "./Timeline.js";

function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function replay(actions: readonly TimelineAction[]): TimelineState {
  return actions.reduce(reduce, IDLE);
}

const answer = { ...RECORDED.honest, cached: false };

describe("SseParser", () => {
  it("joins a line split across chunks", () => {
    const parser = new SseParser();
    expect(parser.push("event: pl")).toEqual([]);
    expect(parser.push('an\ndata: {"plan":')).toEqual([]);
    expect(parser.push('["a"]}\n\n')).toEqual([{ event: "plan", data: '{"plan":["a"]}' }]);
  });

  it("reads several events from one chunk and skips comments", () => {
    const parser = new SseParser();
    const events = parser.push(
      ": keep-alive\n\nevent: start\ndata: 1\n\n: ping\nevent: baret\ndata: 2\n\n",
    );
    expect(events).toEqual([
      { event: "start", data: "1" },
      { event: "baret", data: "2" },
    ]);
  });

  it("handles CRLF split between chunks, multi-line data and a default event name", () => {
    const parser = new SseParser();
    expect(parser.push("data: a\r")).toEqual([]);
    expect(parser.push("\ndata: b\r\n\r\n")).toEqual([{ event: "message", data: "a\nb" }]);
  });

  it("dispatches an event that waits for its blank line at the end", () => {
    const parser = new SseParser();
    parser.push("event: done\ndata: {}");
    expect(parser.end()).toEqual([{ event: "done", data: "{}" }]);
  });

  it("reads a byte stream to the end", async () => {
    const seen: string[] = [];
    await readSse(streamOf([sse("start", {}), "event: plan\nda", 'ta: {"plan":[]}\n\n']), (e) =>
      seen.push(e.event),
    );
    expect(seen).toEqual(["start", "plan"]);
  });
});

describe("timeline reducer", () => {
  it("builds the timeline from the events in order", () => {
    const state = replay([
      { type: "begin", scenario: "overpay" },
      {
        type: "event",
        event: "start",
        data: { scenario: "overpay", intent: "Pay 0.10", call: answer.call },
      },
      { type: "event", event: "baret", data: { decision: "safe", findings: [] } },
      { type: "event", event: "plan", data: { plan: ["Decode", "Compare"] } },
      {
        type: "event",
        event: "tool",
        data: { tool: "decode_transaction", arguments: {}, ok: true, result: {}, ms: 2 },
      },
      {
        type: "event",
        event: "tool",
        data: {
          tool: "read_vault",
          arguments: { address: "0x1" },
          ok: false,
          result: "boom",
          ms: 5,
        },
      },
      {
        type: "event",
        event: "decision",
        data: { decision: "veto", reason: "9x", mismatches: ["amount"] },
      },
    ]);
    expect(state.phase).toBe("running");
    expect(state.intent).toBe("Pay 0.10");
    expect(state.plan).toEqual(["Decode", "Compare"]);
    expect(state.tools.map((t) => [t.tool, t.ok])).toEqual([
      ["decode_transaction", true],
      ["read_vault", false],
    ]);
    expect(state.decision).toEqual({ decision: "veto", reason: "9x", mismatches: ["amount"] });
  });

  it("reads an unknown decision as a veto (fail-closed)", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      { type: "event", event: "decision", data: { decision: "maybe", reason: "" } },
    ]);
    expect(state.decision?.decision).toBe("veto");
  });

  it("keeps the streamed steps when done arrives, and takes the sent payment", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      {
        type: "event",
        event: "tool",
        data: { tool: "only_streamed", arguments: {}, ok: true, result: {}, ms: 1 },
      },
      { type: "event", event: "done", data: answer },
    ]);
    expect(state.phase).toBe("done");
    expect(state.source).toBe("live");
    expect(state.tools.map((t) => t.tool)).toEqual(["only_streamed"]);
    expect(state.sent?.status).toBe("confirmed");
    expect(state.cachedAt).toBeNull();
  });

  it("parses a live tool result the server sends as JSON text", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      {
        type: "event",
        event: "tool",
        data: {
          tool: "get_baret_verdict",
          arguments: {},
          ok: true,
          result: JSON.stringify({ decision: "safe", findings: [] }),
          ms: 3,
        },
      },
    ]);
    const [step] = state.tools;
    if (!step) throw new Error("no step");
    expect(step.result).toEqual({ decision: "safe", findings: [] });
    expect(toolSummary(step)).toBe("safe, 0 findings");
  });

  it("keeps a cut tool result as text, summarised to one line", () => {
    const cut = JSON.stringify({ a: "x".repeat(3000) }).slice(0, 2000);
    const state = replay([
      { type: "begin", scenario: "honest" },
      {
        type: "event",
        event: "tool",
        data: { tool: "lookup", arguments: {}, ok: true, result: cut, ms: 1 },
      },
    ]);
    const [step] = state.tools;
    if (!step) throw new Error("no step");
    expect(step.result).toBe(cut);
    expect(toolSummary(step).length).toBeLessThanOrEqual(120);
  });

  it("sums up the reputation and vault reads in plain words, even from a cut result", () => {
    const step = (tool: string, result: unknown) => ({
      tool,
      arguments: {},
      ok: true,
      result,
      ms: 1,
    });
    expect(toolSummary(step("check_reputation", { listed: false }))).toBe(
      copy.timeline.summary.notListed,
    );
    expect(toolSummary(step("check_reputation", { listed: true, entry: {} }))).toBe(
      copy.timeline.summary.listed,
    );
    expect(toolSummary(step("read_vault", { thisPayment: { fits: true }, now: 1 }))).toBe(
      copy.timeline.summary.fits,
    );
    const cut = JSON.stringify({ thisPayment: { fits: false }, vault: { x: "y".repeat(3000) } });
    expect(toolSummary(step("read_vault", cut.slice(0, 2000)))).toBe(
      copy.timeline.summary.doesNotFit,
    );
  });

  it("reports a send that never left the server as failed, with no hash", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      { type: "event", event: "sent", data: { hash: null, status: "failed" } },
      { type: "event", event: "done", data: { ...answer, sent: { hash: null, status: "failed" } } },
    ]);
    expect(state.sent).toEqual({ hash: null, status: "failed" });
  });

  it("marks a cached answer with when it ran", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      {
        type: "event",
        event: "done",
        data: { ...answer, cached: true, ranAt: "2026-10-09T12:00:00.000Z" },
      },
    ]);
    expect(state.cachedAt).toBe("2026-10-09T12:00:00.000Z");
    expect(state.tools.length).toBeGreaterThan(0);
  });

  it("labels a recorded run as recorded", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      { type: "recorded", answer: RECORDED.honest },
    ]);
    expect(state.source).toBe("recorded");
    expect(progressLine(state)).toBe("Showing the recorded run.");
  });

  it("stops on an error event", () => {
    const state = replay([
      { type: "begin", scenario: "honest" },
      { type: "event", event: "error", data: { message: "model timed out" } },
    ]);
    expect(state.phase).toBe("error");
    expect(state.error).toBe("model timed out");
  });
});

describe("recorded runs", () => {
  it("keeps the real tx for the honest case and nothing sent for the others", () => {
    expect(RECORDED.honest.sent?.hash).toBe(
      "0xb4339027d5b38d32a04c15424ca2a4501c996dad462efef728aa9be3b054e528",
    );
    expect(RECORDED.honest.review?.decision).toBe("approve");
    expect(RECORDED.overpay.review?.decision).toBe("veto");
    expect(RECORDED.overpay.sent).toBeNull();
    expect(RECORDED.injected.review?.decision).toBe("veto");
    expect(RECORDED.injected.sent).toBeNull();
  });
});

describe("fallback choice", () => {
  it("falls back on 503, 429 and other errors, and streams on 200", () => {
    expect(fallbackFor(503)).toBe("unavailable");
    expect(fallbackFor(429)).toBe("limited");
    expect(fallbackFor(500)).toBe("unavailable");
    expect(fallbackFor(200)).toBeNull();
  });

  it("shows the recorded run when the route answers 503", async () => {
    const actions: TimelineAction[] = [];
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 }));
    const why = await runReview("overpay", (a) => actions.push(a), { fetchImpl });
    expect(why).toBe("unavailable");
    expect(actions.at(-1)).toEqual({ type: "recorded", answer: RECORDED.overpay });
  });

  it("shows the recorded run when the network fails", async () => {
    const actions: TimelineAction[] = [];
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("offline");
    });
    expect(await runReview("injected", (a) => actions.push(a), { fetchImpl })).toBe("network");
    expect(actions.at(-1)?.type).toBe("recorded");
  });

  it("shows the recorded run when nothing arrives in time", async () => {
    const actions: TimelineAction[] = [];
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    expect(await runReview("honest", (a) => actions.push(a), { fetchImpl, timeoutMs: 10 })).toBe(
      "timeout",
    );
    expect(actions.at(-1)?.type).toBe("recorded");
  });

  it("streams a live run and never mixes in the recording", async () => {
    const actions: TimelineAction[] = [];
    const fetchImpl = vi.fn(
      async () =>
        new Response(streamOf([sse("start", { intent: "x" }), sse("done", answer)]), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );
    expect(await runReview("honest", (a) => actions.push(a), { fetchImpl })).toBe("live");
    expect(actions.some((a) => a.type === "recorded")).toBe(false);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(REVIEW_URL);
    expect(JSON.parse(String(init.body))).toEqual({ scenario: "honest" });
    expect((init.headers as Record<string, string>).accept).toBe("text/event-stream");
  });

  it("says the run stopped when a live stream ends without a decision", async () => {
    const actions: TimelineAction[] = [];
    const fetchImpl = vi.fn(
      async () => new Response(streamOf([sse("start", {})]), { status: 200 }),
    );
    await runReview("honest", (a) => actions.push(a), { fetchImpl });
    expect(actions.at(-1)?.type).toBe("fail");
  });
});

describe("tool lines", () => {
  it("shortens addresses and summarises a decoded call", () => {
    expect(shortArguments({ address: "0x46F159DA1aD40A78526d35ea1Adb8531aDa52158" })).toBe(
      "address 0x46F1...2158",
    );
    const step = RECORDED.honest.review?.transcript?.steps?.[0];
    expect(step && toolSummary(step)).toBe("pay: amount 100000 to 0x1365...ff49");
  });
});
