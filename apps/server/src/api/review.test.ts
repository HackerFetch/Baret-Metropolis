import { PAYMENT_GUARD_ABI } from "@baret/agent-kit/abi";
import type { Reviewer } from "@baret/agent-kit/reviewer";
import type { AnalyzeRequest, AnalyzeResponse } from "@baret/guard";
import { decodeFunctionData, type Hex, keccak256, stringToHex } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  type PaymentSender,
  qwenReviewerFactory,
  type ReviewEvent,
  type ReviewerFactory,
  ReviewService,
  type StepSink,
  scenarioCall,
} from "../application/review.js";
import {
  DEMO_AGENT,
  DEMO_MERCHANT,
  DEMO_VAULT,
  loadConfig,
  type ReviewConfig,
} from "../config/env.js";
import { deps, FakeRpc } from "../testing/fake.js";
import { buildApp } from "./app.js";

const HASH = `0x${"ab".repeat(32)}` as Hex;
const KEY = `0x${"11".repeat(32)}` as Hex;

const reviewConfig: ReviewConfig = {
  apiKey: "test-key",
  baseUrl: null,
  model: null,
  selfUrl: "http://127.0.0.1:0",
  dailyLimit: 200,
  vault: DEMO_VAULT,
  merchant: DEMO_MERCHANT,
  agent: DEMO_AGENT,
  agentPrivateKey: KEY,
};

function verdict(decision: AnalyzeResponse["decision"]): AnalyzeResponse {
  return {
    decision,
    findings:
      decision === "safe"
        ? []
        : [{ code: "UNKNOWN_CONTRACT_EXPOSURE", severity: "medium", values: {}, blocking: false }],
    firedRules: [],
    suggestions: [],
    confidence: "high",
    estimatedChanges: [],
    approvals: [],
    sources: [{ name: "alchemy", status: "ok" }],
    expiresAt: "2026-10-09T00:00:30.000Z",
    meta: {
      requestId: "r-1",
      analysisVersion: "1",
      network: "testnet",
      chainId: 10143,
      analyzedAt: "2026-10-09T00:00:00.000Z",
      blockNumber: "1",
      traced: true,
    },
  } as AnalyzeResponse;
}

/** A reviewer that reports one plan and one tool step, then answers. */
function fakeReviewer(answer: "approve" | "veto" | "throw"): ReviewerFactory & { calls: number } {
  const factory = ((sink: StepSink) => {
    const reviewer: Reviewer = {
      async review() {
        factory.calls += 1;
        sink.plan(["Decode the call.", "Read Baret's verdict."]);
        sink.tool({
          tool: "decode_transaction",
          arguments: {},
          ok: true,
          result: { functionName: "pay", long: "x".repeat(5_000) },
          ms: 3,
        });
        if (answer === "throw") throw new Error("model down");
        return {
          decision: answer,
          reason: answer === "approve" ? "The call matches the intent." : "The amount is 9x.",
          mismatches: answer === "approve" ? [] : ["amount 900000, intent 100000"],
        };
      },
    };
    return reviewer;
  }) as unknown as ReviewerFactory & { calls: number };
  factory.calls = 0;
  return factory;
}

function setup(
  options: {
    decision?: AnalyzeResponse["decision"];
    answer?: "approve" | "veto" | "throw";
    send?: boolean;
    config?: Partial<ReviewConfig>;
    analyzeDelayMs?: number;
  } = {},
) {
  const analyze = vi.fn(async (_request: AnalyzeRequest) => {
    if (options.analyzeDelayMs) await new Promise((r) => setTimeout(r, options.analyzeDelayMs));
    return verdict(options.decision ?? "safe");
  });
  const reviewer = fakeReviewer(options.answer ?? "approve");
  const send = vi.fn<PaymentSender>(async () => ({ hash: HASH, status: "confirmed" }));
  const service = new ReviewService({
    config: { ...reviewConfig, ...options.config },
    analyze,
    reviewer,
    model: { provider: "qwen", name: "qwen-test" },
    send: options.send === false ? null : send,
  });
  return { service, analyze, reviewer, send };
}

async function appWith(service: ReviewService | null) {
  return buildApp({ ...deps(new FakeRpc()), review: service });
}

function events(body: string) {
  return body
    .trim()
    .split("\n\n")
    .map((block) => {
      const [eventLine, dataLine] = block.split("\n");
      return {
        event: eventLine?.replace("event: ", ""),
        data: JSON.parse(dataLine?.replace("data: ", "") ?? "null"),
      };
    });
}

describe("scenarioCall", () => {
  it.each([
    ["honest", 100_000n, false],
    ["overpay", 900_000n, false],
    ["injected", 100_000n, true],
  ] as const)("%s builds PaymentGuard.pay for the demo vault", (scenario, amount, injected) => {
    const { intent, call } = scenarioCall(reviewConfig, scenario);
    expect(call.to).toBe(DEMO_VAULT);
    expect(call.merchant).toBe(DEMO_MERCHANT);
    expect(call.amount).toBe(amount.toString());
    expect(call.valueWei).toBe("0");
    const decoded = decodeFunctionData({ abi: PAYMENT_GUARD_ABI, data: call.data });
    expect(decoded.functionName).toBe("pay");
    expect(decoded.args).toEqual([DEMO_MERCHANT, amount, keccak256(stringToHex("inv-2001"))]);
    expect(intent.startsWith("Pay 0.10 dUSDC (100000 base units) from vault")).toBe(true);
    expect(intent).toContain(`merchant ${DEMO_MERCHANT} for invoice inv-2001.`);
    expect(intent.includes("SYSTEM NOTE TO REVIEWER")).toBe(injected);
  });
});

describe("ReviewService", () => {
  it("asks Baret with the Balanced template and the agent as the user", async () => {
    const { service, analyze } = setup();
    await service.run("honest");
    const request = analyze.mock.calls[0]?.[0];
    expect(request?.policyTemplate).toBe("balanced");
    expect(request?.userWallet).toBe(DEMO_AGENT);
    expect(request?.network).toBe("testnet");
  });

  it.each(["caution", "blocked"] as const)(
    "does not ask the reviewer when Baret says %s",
    async (decision) => {
      const { service, reviewer, send } = setup({ decision });
      const answer = await service.run("honest");
      expect(answer.baret.decision).toBe(decision);
      expect(answer.review).toBeNull();
      expect(answer.sent).toBeNull();
      expect(reviewer.calls).toBe(0);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it("sends an approved honest payment and reports its hash", async () => {
    const { service, send } = setup();
    const answer = await service.run("honest");
    expect(answer.review?.decision).toBe("approve");
    expect(answer.sent).toEqual({ hash: HASH, status: "confirmed" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].to).toBe(DEMO_VAULT);
    expect(answer.model).toEqual({ provider: "qwen", name: "qwen-test" });
    expect(answer.cached).toBe(false);
  });

  it.each(["overpay", "injected"] as const)(
    "never sends for %s, even when approved",
    async (scenario) => {
      const { service, send } = setup();
      const answer = await service.run(scenario);
      expect(answer.review?.decision).toBe("approve");
      expect(answer.sent).toBeNull();
      expect(send).not.toHaveBeenCalled();
    },
  );

  it("sends nothing without a sender", async () => {
    const { service } = setup({ send: false });
    expect(service.sends).toBe(false);
    expect((await service.run("honest")).sent).toBeNull();
  });

  it("sends nothing after a veto", async () => {
    const { service, send } = setup({ answer: "veto" });
    const answer = await service.run("honest");
    expect(answer.review?.decision).toBe("veto");
    expect(answer.review?.mismatches).toEqual(["amount 900000, intent 100000"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("counts a reviewer that fails as a veto", async () => {
    const { service, send } = setup({ answer: "throw" });
    const answer = await service.run("honest");
    expect(answer.review?.decision).toBe("veto");
    expect(answer.review?.reason).toContain("model down");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not keep a veto that came from a reviewer failure", async () => {
    const { service, analyze } = setup({ answer: "throw" });
    await service.run("honest");
    const again = await service.run("honest");
    expect(again.cached).toBe(false);
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it("keeps a veto the reviewer gave on its own", async () => {
    const { service } = setup({ answer: "veto" });
    await service.run("honest");
    expect((await service.run("honest")).cached).toBe(true);
  });

  it("reports a failed send as failed, never as sent", async () => {
    const { service, send } = setup();
    send.mockRejectedValueOnce(new Error("nonce too low"));
    expect((await service.run("honest")).sent).toEqual({ hash: null, status: "failed" });
  });

  it("keeps one answer per scenario and shares a run already going", async () => {
    const { service, analyze } = setup({ analyzeDelayMs: 20 });
    const [first, second] = await Promise.all([service.run("honest"), service.run("honest")]);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    const third = await service.run("honest");
    expect(third.cached).toBe(true);
    expect(third.ranAt).toBe(first.ranAt);
    expect(analyze).toHaveBeenCalledTimes(1);
    await service.run("overpay");
    expect(analyze).toHaveBeenCalledTimes(2);
  });
});

/** A chat completions endpoint: the plan, one turn of tool calls, then the decision. */
function modelStub() {
  const replies = [
    { content: JSON.stringify({ plan: ["Decode the call.", "Read Baret's verdict."] }) },
    {
      content: null,
      tool_calls: [
        { id: "c1", type: "function", function: { name: "decode_transaction", arguments: "{}" } },
        { id: "c2", type: "function", function: { name: "get_baret_verdict", arguments: "{}" } },
      ],
    },
    {
      content: JSON.stringify({ decision: "approve", reason: "It matches.", mismatches: [] }),
    },
  ];
  return vi.fn<typeof globalThis.fetch>(async (_url, init) => {
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const message = replies.shift();
    if (!message) throw new Error("no more replies");
    return new Response(
      JSON.stringify({ choices: [{ message: { role: "assistant", ...message } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
}

describe("qwenReviewerFactory", () => {
  it("reports the agent reviewer's plan and each tool call as events", async () => {
    const fetch = modelStub();
    const qwen = qwenReviewerFactory({ ...reviewConfig, model: "qwen-test" }, undefined, fetch);
    expect(qwen.model).toEqual({ provider: "qwen", name: "qwen-test" });
    const service = new ReviewService({
      config: reviewConfig,
      analyze: async () => verdict("safe"),
      reviewer: qwen.reviewer,
      model: qwen.model,
      send: null,
    });
    const seen: ReviewEvent[] = [];
    const answer = await service.run("honest", (e) => seen.push(e));
    expect(seen.map((e) => e.event)).toEqual([
      "start",
      "baret",
      "plan",
      "tool",
      "tool",
      "decision",
    ]);
    expect(answer.review?.decision).toBe("approve");
    expect(answer.review?.transcript?.steps.map((s) => s.tool)).toEqual([
      "decode_transaction",
      "get_baret_verdict",
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("POST /v1/review", () => {
  it("answers 503 review_unavailable with no service", async () => {
    const app = await appWith(null);
    const res = await app.inject({
      method: "POST",
      url: "/v1/review",
      payload: { scenario: "honest" },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("review_unavailable");
  });

  it("rejects anything but a known scenario", async () => {
    const app = await appWith(setup().service);
    for (const payload of [{ scenario: "drain" }, { scenario: "honest", intent: "x" }, {}]) {
      const res = await app.inject({ method: "POST", url: "/v1/review", payload });
      expect(res.statusCode).toBe(400);
    }
  });

  it("answers JSON with the whole run", async () => {
    const app = await appWith(setup().service);
    const res = await app.inject({
      method: "POST",
      url: "/v1/review",
      payload: { scenario: "honest" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Object.keys(body).sort()).toEqual(
      ["baret", "cached", "call", "intent", "model", "ranAt", "review", "scenario", "sent"].sort(),
    );
    expect(body.sent.hash).toBe(HASH);
  });

  it("answers 429 over the daily cap of fresh runs", async () => {
    const app = await appWith(setup({ config: { dailyLimit: 1 } }).service);
    const ok = await app.inject({
      method: "POST",
      url: "/v1/review",
      payload: { scenario: "honest" },
    });
    expect(ok.statusCode).toBe(200);
    // A kept answer is not a fresh run.
    const kept = await app.inject({
      method: "POST",
      url: "/v1/review",
      payload: { scenario: "honest" },
    });
    expect(kept.statusCode).toBe(200);
    const over = await app.inject({
      method: "POST",
      url: "/v1/review",
      payload: { scenario: "overpay" },
    });
    expect(over.statusCode).toBe(429);
    const stream = await app.inject({
      method: "POST",
      url: "/v1/review",
      headers: { accept: "text/event-stream" },
      payload: { scenario: "injected" },
    });
    expect(stream.statusCode).toBe(429);
  });

  it("streams the steps of a fresh run in order, and only `done` for a kept one", async () => {
    const app = await appWith(setup().service);
    const request = {
      method: "POST" as const,
      url: "/v1/review",
      headers: { accept: "text/event-stream" },
      payload: { scenario: "honest" },
    };
    const fresh = await app.inject(request);
    expect(fresh.statusCode).toBe(200);
    expect(fresh.headers["content-type"]).toContain("text/event-stream");
    const steps = events(fresh.body);
    expect(steps.map((s) => s.event)).toEqual([
      "start",
      "baret",
      "plan",
      "tool",
      "decision",
      "sent",
      "done",
    ]);
    const tool = steps[3]?.data;
    expect(tool.tool).toBe("decode_transaction");
    expect(tool.result.length).toBe(2_000);
    expect(steps[6]?.data.cached).toBe(false);

    const kept = events((await app.inject(request)).body);
    expect(kept.map((s) => s.event)).toEqual(["done"]);
    expect(kept[0]?.data.cached).toBe(true);
  });

  it("streams `error` when the run fails", async () => {
    const { service, analyze } = setup();
    analyze.mockRejectedValueOnce(new Error("rpc down"));
    const app = await appWith(service);
    const res = await app.inject({
      method: "POST",
      url: "/v1/review",
      headers: { accept: "text/event-stream" },
      payload: { scenario: "honest" },
    });
    expect(events(res.body).map((s) => s.event)).toEqual(["start", "error"]);
  });

  it("shows review and reviewSends on /health/ready, never a key", async () => {
    const on = await (await appWith(setup().service)).inject({ url: "/health/ready" });
    expect(on.json().networks[0].configured).toMatchObject({ review: true, reviewSends: true });
    expect(on.body).not.toContain("test-key");
    const off = await (await appWith(null)).inject({ url: "/health/ready" });
    expect(off.json().networks[0].configured).toMatchObject({ review: false, reviewSends: false });
  });
});

describe("review settings", () => {
  const base = { MONAD_TESTNET_RPC_URL: "http://localhost:8545" };

  it("is off without a Qwen key or with the kill switch", () => {
    expect(loadConfig(base).review).toBeNull();
    expect(loadConfig({ ...base, QWEN_API_KEY: "k", BARET_REVIEW_ENABLED: "0" }).review).toBeNull();
  });

  it("uses the demo vault and agent by default, and never sends without both switches", () => {
    const review = loadConfig({ ...base, QWEN_API_KEY: "k", PORT: "9000" }).review;
    expect(review).toMatchObject({
      vault: DEMO_VAULT,
      merchant: DEMO_MERCHANT,
      agent: DEMO_AGENT,
      agentPrivateKey: null,
      selfUrl: "http://127.0.0.1:9000",
      dailyLimit: 200,
    });
    expect(loadConfig({ ...base, QWEN_API_KEY: "k" }).reviewRateLimitPerMinute).toBe(6);
    const keyOnly = loadConfig({ ...base, QWEN_API_KEY: "k", BARET_DEMO_AGENT_PRIVATE_KEY: KEY });
    expect(keyOnly.review?.agentPrivateKey).toBeNull();
    // The agent is the key's own address when a key is set.
    expect(keyOnly.review?.agent).not.toBe(DEMO_AGENT);
    const sending = loadConfig({
      ...base,
      QWEN_API_KEY: "k",
      BARET_DEMO_AGENT_PRIVATE_KEY: KEY,
      BARET_REVIEW_SEND: "1",
    });
    expect(sending.review?.agentPrivateKey).toBe(KEY);
  });
});
