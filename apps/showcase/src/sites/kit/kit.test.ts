import { findings } from "@baret/content";
import { type AnalyzeResponse, FINDING_CODES } from "@baret/guard";
import { FAILED, runCheck } from "@baret/web-ui/lib/check";
import type { CheckResult } from "@baret/web-ui/lib/check-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SOURCE as NOVASWAP_SOURCE } from "../novaswap/source.js";
import { SOURCE as SCRYBE_SOURCE } from "../scrybe/source.js";
import {
  analyzeCall,
  analyzePayment,
  displayAmount,
  fromAnalyzeResponse,
  shortAddress,
} from "./live.js";
import { advance, type CheckState, demoInput, offersLive, settle } from "./useCheck.js";
import { DEMO_CHECK_FROM } from "./wallet/useDemoWallet.js";

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

  it("formats base units with BigInt maths only", () => {
    expect(displayAmount(0n, 18)).toBe("0");
    expect(displayAmount(1n, 18)).toBe("0");
    expect(displayAmount(999_999n, 6)).toBe("0.9999");
    expect(displayAmount(1_000_100n, 6)).toBe("1.0001");
    expect(displayAmount(42n, 0)).toBe("42");
    expect(displayAmount(-2_500_000n, 6)).toBe("-2.5");
    expect(displayAmount(-1n, 18)).toBe("0");
    expect(displayAmount(123_456_789_012_345_678_901_234_567n, 18)).toBe("123456789.0123");
    expect(() => displayAmount(1n, -1)).toThrow();
    expect(() => displayAmount(1n, 1.5)).toThrow();
  });

  it("names a token with no symbol by its shortened contract", () => {
    expect(shortAddress(SPENDER)).toBe(`${SPENDER.slice(0, 6)}...${SPENDER.slice(-4)}`);
    const base = response();
    const approvals = base.approvals.map((a) => ({ ...a, symbol: null }));
    const result = fromAnalyzeResponse({ ...base, approvals }, WALLET);
    const contract = base.approvals[0]?.contract ?? "";
    expect(result.approvals[0]?.unit).toBe(shortAddress(contract));
    expect(result.approvals[0]?.unit).not.toBe("");
  });

  it("keeps the visitor's own changes and allowances, whatever the address case", () => {
    const result = fromAnalyzeResponse(response(), WALLET);
    expect(result).toMatchObject({ source: "live", verdict: "blocked", requestId: "r1" });
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

  it("posts an x402 payment as typedData with its policy, and reads the signer's changes", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(response({ decision: "safe" }))));
    vi.stubGlobal("fetch", fetch);
    const built = {
      typedData: { signer: WALLET, domain: {}, types: {}, primaryType: "T", message: {} },
      payment: { origin: "https://x.example", payTo: OTHER, asset: OTHER, amount: "50000" },
    };
    const policy = { maxHourlyCap: "0.25" };
    const result = await analyzePayment(built, policy, new AbortController().signal);
    expect(result.verdict).toBe("safe");
    expect(result.changes.length).toBeGreaterThan(0);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      network: "testnet",
      typedData: built.typedData,
      payment: built.payment,
      policy,
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

describe("check it live, with no wallet", () => {
  const done = (result: CheckResult): CheckState => ({ phase: "done", result });

  it("is offered only on a sample answer to an input with no address", () => {
    expect(offersLive(done(SAFE), { from: null })).toBe(true);
    expect(offersLive(done(SAFE), { from: WALLET })).toBe(false);
    expect(offersLive(done({ ...SAFE, source: "live" }), { from: null })).toBe(false);
    expect(offersLive(done(FAILED), { from: null })).toBe(false);
    expect(offersLive({ phase: "idle" }, { from: null })).toBe(false);
    expect(offersLive(done(SAFE), null)).toBe(false);
  });

  it("sends the same input from the demo address, a valid testnet address", () => {
    const input = { mode: "safe", amount: "2.5", wei: 1n, from: null } as const;
    expect(demoInput(input)).toEqual({ ...input, from: DEMO_CHECK_FROM });
    expect(DEMO_CHECK_FROM).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("fetches nothing for the sample, then posts from the demo address on the press", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(response({ decision: "safe" }))));
    vi.stubGlobal("fetch", fetch);
    const input = {
      mode: "safe",
      amount: "2.5",
      wei: 2_500_000_000_000_000_000n,
      from: null,
    } as const;
    const signal = new AbortController().signal;
    expect((await NOVASWAP_SOURCE(input, signal)).source).toBe("sample");
    expect(fetch).not.toHaveBeenCalled();

    const result = await NOVASWAP_SOURCE(demoInput(input), signal);
    expect(result).toMatchObject({ source: "live", verdict: "safe", requestId: "r1" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/v1/analyze");
    const body = JSON.parse(String(init.body));
    expect(body.transaction.from).toBe(DEMO_CHECK_FROM);
    expect(body.userWallet).toBe(DEMO_CHECK_FROM);
  });

  it("works for an x402 payment too: the demo address is the signer", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(response({ decision: "safe" }))));
    vi.stubGlobal("fetch", fetch);
    const input = { mode: "safe", cap: 250_000n, from: null } as const;
    const result = await SCRYBE_SOURCE(demoInput(input), new AbortController().signal);
    expect(result.source).toBe("live");
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).typedData.signer).toBe(DEMO_CHECK_FROM);
  });

  it("fails closed when the server is down: Blocked, not the sample", async () => {
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 }));
    const input = { mode: "danger", amount: "20", wei: 0n, from: null } as const;
    expect(await NOVASWAP_SOURCE(demoInput(input), new AbortController().signal)).toBe(FAILED);
  });
});
