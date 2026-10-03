import { findings } from "@baret/content";
import { type AnalyzeResponse, FINDING_CODES } from "@baret/guard";
import { FAILED, runCheck } from "@baret/web-ui/lib/check";
import type { CheckResult } from "@baret/web-ui/lib/check-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeCall, displayAmount, fromAnalyzeResponse } from "./live.js";
import { advance, type CheckState, settle } from "./useCheck.js";

const WALLET = "0x7a3f9e21c84b5d06f13a2e9b7c40d58e6f21c21e";
const OTHER = "0xac9517a70c88480c9fA7E9a280DA485F7f552C29";
const SPENDER = "0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888";
const SAFE: CheckResult = {
  source: "sample",
  verdict: "safe",
  findings: [],
  changes: [],
  approvals: [],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("panel phases", () => {
  const checking = (step: number, result: CheckResult | null = null): CheckState => ({
    phase: "checking",
    step,
    result,
  });

  it("walks every phase, then waits on the last one until the answer is in", () => {
    expect(advance(checking(0), 4)).toEqual(checking(1));
    const waiting = checking(3);
    expect(advance(waiting, 4)).toBe(waiting);
    expect(settle(waiting, SAFE, 4)).toEqual({ phase: "done", result: SAFE });
  });

  it("holds a fast answer until the walk is over", () => {
    const early = settle(checking(1), SAFE, 4);
    expect(early).toEqual(checking(1, SAFE));
    expect(advance(advance(early, 4), 4)).toEqual(checking(3, SAFE));
    expect(advance(checking(3, SAFE), 4)).toEqual({ phase: "done", result: SAFE });
  });

  it("ignores ticks and answers outside a check", () => {
    const idle: CheckState = { phase: "idle" };
    expect(advance(idle, 4)).toBe(idle);
    expect(settle(idle, SAFE, 4)).toBe(idle);
  });
});

describe("runCheck fails closed", () => {
  it("passes an answer through", async () => {
    await expect(runCheck(async () => SAFE, null, new AbortController())).resolves.toBe(SAFE);
  });

  it("turns a rejection into Blocked", async () => {
    const result = await runCheck(
      async () => {
        throw new Error("offline");
      },
      null,
      new AbortController(),
    );
    expect(result).toBe(FAILED);
    expect(result.verdict).toBe("blocked");
  });

  it("turns a source that never answers into Blocked, and aborts it", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pending = runCheck(() => new Promise<CheckResult>(() => {}), null, controller, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBe(FAILED);
    expect(controller.signal.aborted).toBe(true);
  });
});

function response(over: Partial<AnalyzeResponse> = {}): AnalyzeResponse {
  return {
    decision: "blocked",
    findings: [
      {
        code: "ERC20_APPROVAL_UNLIMITED",
        severity: "high",
        values: { spender: SPENDER, asset: "dUSDC", amount: "20" },
        blocking: true,
      },
    ],
    firedRules: [],
    suggestions: [],
    confidence: "high",
    estimatedChanges: [
      {
        account: WALLET.toUpperCase().replace("0X", "0x"),
        asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
        before: null,
        after: null,
        delta: "-2500000000000000000",
      },
      {
        account: WALLET,
        asset: { kind: "erc20", address: OTHER, symbol: "dUSDC", decimals: 6 },
        before: null,
        after: null,
        delta: "8000000",
      },
      {
        account: OTHER,
        asset: { kind: "erc20", address: OTHER, symbol: "dUSDC", decimals: 6 },
        before: null,
        after: null,
        delta: "-8000000",
      },
    ],
    approvals: [
      {
        owner: WALLET,
        kind: "erc20",
        contract: OTHER,
        symbol: "dUSDC",
        decimals: 6,
        spender: SPENDER,
        amount: null,
        unlimited: true,
      },
    ],
    sources: [],
    expiresAt: "2026-10-03T12:00:00Z",
    meta: {
      requestId: "r1",
      analysisVersion: "1",
      network: "testnet",
      chainId: 10143,
      analyzedAt: "2026-10-03T11:59:00Z",
      blockNumber: null,
      traced: true,
    },
    ...over,
  } as AnalyzeResponse;
}

describe("live answer", () => {
  it("shows amounts short: up to four decimals, no trailing zeros", () => {
    expect(displayAmount(2_500_000_000_000_000_000n, 18)).toBe("2.5");
    expect(displayAmount(8_000_000n, 6)).toBe("8");
    expect(displayAmount(1_234_567n, 6)).toBe("1.2345");
  });

  it("keeps the visitor's own changes and allowances, whatever the address case", () => {
    const result = fromAnalyzeResponse(response(), WALLET);
    expect(result).toMatchObject({ source: "live", verdict: "blocked" });
    expect(result.findings).toEqual([
      {
        code: "ERC20_APPROVAL_UNLIMITED",
        values: { spender: SPENDER, asset: "dUSDC", amount: "20" },
      },
    ]);
    expect(result.changes).toEqual([
      { direction: "out", value: "2.5", unit: "MON" },
      { direction: "in", value: "8", unit: "dUSDC" },
    ]);
    expect(result.approvals).toEqual([
      { unit: "dUSDC", spender: SPENDER, unlimited: true, amount: null },
    ]);
  });

  it("posts the call to /api/v1/analyze and maps a valid answer", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(response({ decision: "safe" }))));
    vi.stubGlobal("fetch", fetch);
    const call = { from: WALLET, to: OTHER, value: "0", data: "0x" };
    const result = await analyzeCall(call, new AbortController().signal);
    expect(result.verdict).toBe("safe");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/analyze");
    expect(JSON.parse(String(init.body))).toEqual({
      network: "testnet",
      transaction: call,
      userWallet: WALLET,
    });
  });

  it("treats an error status or an answer off the contract as Blocked", async () => {
    const call = { from: WALLET, to: OTHER, value: "0", data: "0x" };
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 }));
    expect(await analyzeCall(call, new AbortController().signal)).toBe(FAILED);
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ decision: "safe" })));
    expect(await analyzeCall(call, new AbortController().signal)).toBe(FAILED);
  });

  it("has words for every finding code the server can send", () => {
    for (const code of FINDING_CODES) expect(findings[code], code).toBeDefined();
  });
});
