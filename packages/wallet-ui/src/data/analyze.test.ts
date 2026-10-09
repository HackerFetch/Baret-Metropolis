import { describe, expect, it } from "vitest";
import type { AnalyzeResponse } from "../../../guard/src/analyze.js";
import { fromAnalyze, type SignContext, unreachable } from "./analyze.js";

const WALLET = "0x1111111111111111111111111111111111111111";
const SPENDER = "0x2222222222222222222222222222222222222222";
const USDC = "0x3333333333333333333333333333333333333333";
const NOW = Date.parse("2026-10-03T16:00:00Z");

const CONTEXT: SignContext = {
  id: "local-1",
  wallet: WALLET,
  origin: "https://swap.example",
  action: "approvalUnlimited",
  values: { asset: "USDC" },
  claim: null,
  impact: "approvalUnlimited",
  fee: "0.002",
  raw: { to: USDC, value: "0", data: "0x095ea7b3", decoded: null },
  expires: 120,
};

function answer(over: Partial<AnalyzeResponse> = {}): AnalyzeResponse {
  return {
    decision: "blocked",
    findings: [
      {
        code: "ERC20_APPROVAL_UNLIMITED",
        severity: "high",
        values: { asset: "USDC", amount: "50" },
        blocking: true,
      },
    ],
    firedRules: [
      {
        rule: "blockUnlimitedApprovals",
        code: "ERC20_APPROVAL_UNLIMITED",
        limit: null,
        actual: null,
      },
    ],
    suggestions: [{ code: "ERC20_APPROVAL_UNLIMITED", values: { amount: "50", asset: "USDC" } }],
    confidence: "high",
    estimatedChanges: [
      {
        account: WALLET.toUpperCase().replace("0X", "0x"),
        asset: { kind: "erc20", address: USDC, symbol: "USDC", decimals: 6 },
        before: "100000000",
        after: "87500000",
        delta: "-12500000",
      },
      {
        account: SPENDER,
        asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
        before: null,
        after: null,
        delta: "1000000000000000000",
      },
    ],
    approvals: [
      {
        owner: WALLET,
        kind: "erc20",
        contract: USDC,
        symbol: null,
        decimals: 6,
        spender: SPENDER,
        amount: null,
        unlimited: true,
      },
    ],
    sources: [
      { name: "alchemy", status: "ok" },
      { name: "nansen", status: "unavailable" },
    ],
    expiresAt: "2026-10-03T16:01:00Z",
    meta: {
      requestId: "req-42",
      analysisVersion: "1",
      network: "testnet",
      chainId: 10143,
      analyzedAt: "2026-10-03T16:00:00Z",
      blockNumber: null,
      traced: true,
    },
    ...over,
  };
}

describe("fromAnalyze", () => {
  it("maps a full answer onto the sign request", () => {
    const request = fromAnalyze(answer(), CONTEXT, NOW);
    expect(request.id).toBe("req-42");
    expect(request.verdict).toBe("blocked");
    expect(request.findings).toEqual([
      { code: "ERC20_APPROVAL_UNLIMITED", values: { asset: "USDC", amount: "50" } },
    ]);
    expect(request.rules).toEqual([{ rule: "blockUnlimitedApprovals" }]);
    expect(request.suggestions).toEqual([
      { code: "ERC20_APPROVAL_UNLIMITED", values: { amount: "50", asset: "USDC" } },
    ]);
    expect(request.confidence).toBe("high");
    expect(request.sources).toEqual([
      { name: "alchemy", status: "ok" },
      { name: "nansen", status: "unavailable" },
    ]);
    expect(request.fee).toBe("0.002");
    expect("wallet" in request).toBe(false);
  });

  it("shows only the wallet's own changes and allowances, in display units", () => {
    const request = fromAnalyze(answer(), CONTEXT, NOW);
    expect(request.changes).toEqual([{ direction: "out", value: "12.5", unit: "USDC" }]);
    expect(request.approvals).toEqual([
      { unit: "0x3333...3333", spender: SPENDER, unlimited: true, amount: null },
    ]);
  });

  it("shows the MON a transfer sends, not the amount plus gas", () => {
    const request = fromAnalyze(
      answer({
        estimatedChanges: [
          {
            account: WALLET,
            asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
            before: null,
            after: null,
            // 1 MON plus 0.002 MON of gas.
            delta: "-1002000000000000000",
          },
        ],
      }),
      { ...CONTEXT, raw: { ...CONTEXT.raw, value: "1000000000000000000" } },
      NOW,
    );
    expect(request.changes).toEqual([{ direction: "out", value: "1", unit: "MON" }]);
    expect(request.fee).toBe("0.002");
  });

  it("drops the MON row of a token transfer, which is only the fee", () => {
    const request = fromAnalyze(
      answer({
        estimatedChanges: [
          ...answer().estimatedChanges,
          {
            account: WALLET,
            asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
            before: null,
            after: null,
            delta: "-2000000000000000",
          },
        ],
      }),
      CONTEXT,
      NOW,
    );
    expect(request.changes).toEqual([{ direction: "out", value: "12.5", unit: "USDC" }]);
  });

  it("keeps a rule's limit and observed value when the server sends them", () => {
    const request = fromAnalyze(
      answer({
        firedRules: [
          { rule: "maxLossPercent", code: "SIMULATION_FAILED", limit: "5%", actual: "12%" },
        ],
      }),
      CONTEXT,
      NOW,
    );
    expect(request.rules).toEqual([{ rule: "maxLossPercent", limit: "5%", actual: "12%" }]);
  });

  it("turns expiresAt into seconds, capped by the request's own limit", () => {
    expect(fromAnalyze(answer(), CONTEXT, NOW).expires).toBe(60);
    expect(fromAnalyze(answer({ expiresAt: "2026-10-03T17:00:00Z" }), CONTEXT, NOW).expires).toBe(
      120,
    );
    expect(fromAnalyze(answer({ expiresAt: "2026-10-03T15:00:00Z" }), CONTEXT, NOW).expires).toBe(
      0,
    );
  });

  it("keeps a Safe answer with no findings", () => {
    const request = fromAnalyze(
      answer({ decision: "safe", findings: [], firedRules: [], suggestions: [] }),
      CONTEXT,
      NOW,
    );
    expect(request.verdict).toBe("safe");
    expect(request.findings).toEqual([]);
  });
});

describe("fromAnalyze fails closed", () => {
  const cases: [string, AnalyzeResponse][] = [
    ["an unknown decision", answer({ decision: "fine" as AnalyzeResponse["decision"] })],
    [
      "an unknown finding code",
      answer({
        findings: [
          {
            code: "NOT_A_CODE" as AnalyzeResponse["findings"][number]["code"],
            severity: "low",
            values: {},
            blocking: false,
          },
        ],
      }),
    ],
    [
      "an unknown rule",
      answer({
        firedRules: [
          { rule: "noSuchRule", code: "ERC20_APPROVAL_UNLIMITED", limit: null, actual: null },
        ],
      }),
    ],
    ["a date that does not parse", answer({ expiresAt: "soon" })],
    [
      "an amount that is not a number",
      answer({
        estimatedChanges: [
          {
            account: WALLET,
            asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
            before: null,
            after: null,
            delta: "lots",
          },
        ],
      }),
    ],
    ["a Safe answer with a blocking finding", answer({ decision: "safe" })],
    ["a missing list", { ...answer(), findings: undefined } as unknown as AnalyzeResponse],
  ];

  it.each(cases)("%s becomes Can't reach Baret", (_name, response) => {
    expect(fromAnalyze(response, CONTEXT, NOW)).toEqual(unreachable(CONTEXT));
  });

  it("the unreachable request keeps the context and shows nothing as checked", () => {
    const request = unreachable(CONTEXT);
    expect(request).toMatchObject({ id: "local-1", verdict: "unreachable", expires: 120 });
    expect(request.findings).toEqual([]);
    expect(request.rules).toEqual([]);
    expect("wallet" in request).toBe(false);
  });
});
