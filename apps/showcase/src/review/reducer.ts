import type { ReviewScenarioId } from "@baret/content";

/**
 * The review's timeline, built one server event at a time.
 *
 * The shapes follow the POST /v1/review contract (M45 spec S1). The reducer
 * is pure so the stream, the cached answer and the recorded run all land in
 * the same state, and the tests can replay any order of events.
 */

export type ReviewDecision = "approve" | "veto";
export type SendStatus = "confirmed" | "failed" | "timeout";

export interface ReviewCall {
  readonly to: string;
  readonly valueWei: string;
  readonly data: string;
  readonly merchant?: string;
  readonly amount?: string;
}

export interface ReviewFinding {
  readonly code: string;
  readonly severity?: string;
}

export interface ToolStep {
  readonly tool: string;
  readonly arguments: Record<string, unknown>;
  readonly ok: boolean;
  readonly result: unknown;
  readonly ms: number;
}

export interface ReviewVerdict {
  readonly decision: ReviewDecision;
  readonly reason: string;
  readonly mismatches: readonly string[];
}

export interface SentPayment {
  /** Null when signing or broadcast failed: the payment never left the server. */
  readonly hash: string | null;
  readonly status: SendStatus;
}

/** The full JSON answer of POST /v1/review, as `done` carries it. */
export interface ReviewAnswer {
  readonly scenario: ReviewScenarioId;
  readonly intent: string;
  readonly call: ReviewCall;
  readonly baret: { readonly decision: string; readonly findings: readonly ReviewFinding[] };
  readonly review:
    | (ReviewVerdict & {
        readonly transcript?: {
          readonly plan?: readonly string[];
          readonly steps?: readonly ToolStep[];
        };
      })
    | null;
  readonly sent: SentPayment | null;
  readonly model?: { readonly provider: string; readonly name: string };
  readonly ranAt: string;
  readonly cached: boolean;
}

export type ReviewSource = "live" | "recorded";
export type ReviewPhase = "idle" | "running" | "done" | "error";

export interface TimelineState {
  readonly phase: ReviewPhase;
  readonly source: ReviewSource;
  readonly scenario: ReviewScenarioId | null;
  readonly intent: string | null;
  readonly call: ReviewCall | null;
  readonly baret: { readonly decision: string; readonly findings: readonly ReviewFinding[] } | null;
  readonly plan: readonly string[] | null;
  readonly tools: readonly ToolStep[];
  readonly decision: ReviewVerdict | null;
  readonly sent: SentPayment | null;
  /** Set when the answer came from the server's 30-minute cache. */
  readonly cachedAt: string | null;
  readonly ranAt: string | null;
  readonly error: string | null;
}

export const IDLE: TimelineState = {
  phase: "idle",
  source: "live",
  scenario: null,
  intent: null,
  call: null,
  baret: null,
  plan: null,
  tools: [],
  decision: null,
  sent: null,
  cachedAt: null,
  ranAt: null,
  error: null,
};

export type TimelineAction =
  | { readonly type: "begin"; readonly scenario: ReviewScenarioId }
  | { readonly type: "event"; readonly event: string; readonly data: unknown }
  | { readonly type: "recorded"; readonly answer: ReviewAnswer }
  | { readonly type: "fail"; readonly message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** The live `tool` event sends the result as JSON text cut to 2000 chars. */
function parseResult(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function toolStep(value: Record<string, unknown>): ToolStep {
  return {
    tool: typeof value.tool === "string" ? value.tool : "unknown",
    arguments: isRecord(value.arguments) ? value.arguments : {},
    ok: value.ok === true,
    result: parseResult(value.result),
    ms: typeof value.ms === "number" ? value.ms : 0,
  };
}

function verdict(value: Record<string, unknown>): ReviewVerdict | null {
  // Fail-closed: anything but an explicit approve reads as a veto.
  if (typeof value.decision !== "string") return null;
  return {
    decision: value.decision === "approve" ? "approve" : "veto",
    reason: typeof value.reason === "string" ? value.reason : "",
    mismatches: strings(value.mismatches),
  };
}

function sent(value: unknown): SentPayment | null {
  if (!isRecord(value)) return null;
  // No hash: the send never left the server, which is a failure.
  if (typeof value.hash !== "string") return { hash: null, status: "failed" };
  const status = value.status;
  return {
    hash: value.hash,
    status: status === "confirmed" || status === "failed" ? status : "timeout",
  };
}

/** The whole answer as one state: a cached `done`, or a recorded run. */
export function fromAnswer(
  answer: ReviewAnswer,
  source: ReviewSource,
  prev: TimelineState = IDLE,
): TimelineState {
  const transcript = answer.review?.transcript;
  return {
    ...prev,
    phase: "done",
    source,
    scenario: answer.scenario,
    intent: answer.intent,
    call: answer.call,
    baret: answer.baret,
    // A streamed run already holds its plan and tools; `done` only fills gaps.
    plan: prev.plan ?? (transcript?.plan ? [...transcript.plan] : null),
    tools:
      prev.tools.length > 0 ? prev.tools : (transcript?.steps ?? []).map((s) => toolStep({ ...s })),
    decision: answer.review ? verdict({ ...answer.review }) : null,
    sent: sent(answer.sent),
    cachedAt: answer.cached ? answer.ranAt : null,
    ranAt: answer.ranAt,
    error: null,
  };
}

export function reduce(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case "begin":
      return { ...IDLE, phase: "running", scenario: action.scenario };
    case "recorded":
      return fromAnswer(action.answer, "recorded");
    case "fail":
      return { ...state, phase: "error", error: action.message };
    case "event": {
      const data = isRecord(action.data) ? action.data : {};
      switch (action.event) {
        case "start":
          return {
            ...state,
            intent: typeof data.intent === "string" ? data.intent : state.intent,
            call: isRecord(data.call) ? (data.call as unknown as ReviewCall) : state.call,
          };
        case "baret":
          return {
            ...state,
            baret: {
              decision: typeof data.decision === "string" ? data.decision : "blocked",
              findings: Array.isArray(data.findings) ? (data.findings as ReviewFinding[]) : [],
            },
          };
        case "plan":
          return { ...state, plan: strings(data.plan) };
        case "tool":
          return { ...state, tools: [...state.tools, toolStep(data)] };
        case "decision":
          return { ...state, decision: verdict(data) ?? state.decision };
        case "sent":
          return { ...state, sent: sent(data) };
        case "done":
          return isRecord(action.data)
            ? fromAnswer(action.data as unknown as ReviewAnswer, "live", state)
            : { ...state, phase: "error", error: "the answer was not readable" };
        case "error":
          return {
            ...state,
            phase: "error",
            error: typeof data.message === "string" ? data.message : "unknown error",
          };
        default:
          return state;
      }
    }
  }
}
