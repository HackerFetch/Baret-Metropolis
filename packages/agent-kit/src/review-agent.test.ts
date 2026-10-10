import type { AnalyzeResponse } from "@baret/guard";
import { type AgentRequest, type AgentStep, type LlmClient, QWEN } from "@baret/llm";
import {
  type Address,
  encodeFunctionData,
  erc20Abi,
  keccak256,
  maxUint256,
  stringToHex,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import { payCall } from "./agent-wallet.js";
import {
  AGENT_REVIEWER_SYSTEM_PROMPT,
  agentReviewer,
  planSchema,
  qwenAgentReviewer,
  reviewTools,
} from "./review-agent.js";
import { type Review, ReviewerVetoError, type ReviewInput, requireApproval } from "./reviewer.js";

const AGENT: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const VAULT: Address = "0x0a8243F1Bd4a3B5d6CA5d0dB0a8A7e1c3fB71a35";
const MERCHANT: Address = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const USDC: Address = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const SPENDER: Address = "0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888";
const BARET = "https://api.baret.test";
const NOW = 1_791_223_100;

function verdict(decision: AnalyzeResponse["decision"] = "safe"): AnalyzeResponse {
  const usdc = { kind: "erc20" as const, address: USDC, symbol: "USDC", decimals: 6 };
  return {
    decision,
    findings: [],
    firedRules: [],
    suggestions: [],
    confidence: "high",
    estimatedChanges: [
      { account: VAULT, asset: usdc, before: "5000000", after: "4000000", delta: "-1000000" },
      { account: MERCHANT, asset: usdc, before: "0", after: "1000000", delta: "1000000" },
    ],
    approvals: [],
    sources: [
      { name: "alchemy", status: "ok" },
      { name: "nansen", status: "unavailable" },
    ],
    expiresAt: "2026-10-09T12:00:00.000Z",
    meta: {
      requestId: "req-1",
      analysisVersion: "1",
      network: "testnet",
      chainId: 10143,
      analyzedAt: "2026-10-09T11:59:00.000Z",
      blockNumber: null,
      traced: true,
    },
  };
}

function input(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    intent: "Pay 1 USDC from my vault to the merchant for order 42.",
    from: AGENT,
    call: payCall({ vault: VAULT, merchant: MERCHANT, amount: 1_000_000n, reference: "order-42" }),
    verdict: verdict(),
    ...overrides,
  };
}

function toolStep(name: string, ok = true, args: unknown = {}): AgentStep {
  return {
    kind: "tool",
    id: name,
    name,
    arguments: args,
    ok,
    result: ok ? {} : { error: "down" },
    ms: 5,
  };
}

/** A client that answers the plan and the act phase from fixtures; no HTTP. */
function stubClient(answer: Review, steps: AgentStep[]) {
  const json = vi.fn().mockResolvedValue({ plan: ["Read the verdict.", "Decode the call."] });
  const agent = vi.fn(async (request: AgentRequest<unknown>) => {
    for (const step of steps) request.onStep?.(step);
    return { answer, steps };
  });
  const client = { json, agent, provider: QWEN } as unknown as Pick<
    LlmClient,
    "json" | "agent" | "provider"
  >;
  return { client, json, agent };
}

const APPROVE: Review = { decision: "approve", reason: "It matches.", mismatches: [] };
const BOTH = [toolStep("decode_transaction"), toolStep("get_baret_verdict")];

describe("agentReviewer", () => {
  it("plans, then acts with the tools, and keeps a transcript", async () => {
    const { client, json, agent } = stubClient(APPROVE, [
      ...BOTH,
      toolStep("read_vault", true, { address: VAULT }),
    ]);
    const lines: string[] = [];
    const review = await agentReviewer(client, {
      baretUrl: BARET,
      onStep: (l) => lines.push(l),
    }).review(input());

    const plan = json.mock.calls[0]?.[0];
    expect(plan.schema).toBe(planSchema);
    expect(JSON.parse(plan.user)).toMatchObject({
      phase: "plan",
      transaction: { network: "Monad testnet" },
    });
    const act = agent.mock.calls[0]?.[0] as AgentRequest<unknown>;
    expect(JSON.parse(act.user).phase).toBe("act");
    expect(act.history?.[0]).toEqual({
      role: "assistant",
      content: JSON.stringify({ plan: ["Read the verdict.", "Decode the call."] }),
    });
    expect(act.tools.map((t) => t.name)).toEqual([
      "decode_transaction",
      "get_baret_verdict",
      "read_vault",
      "check_reputation",
    ]);
    expect(act.requiredTools).toEqual(["decode_transaction", "get_baret_verdict"]);

    expect(review.decision).toBe("approve");
    expect(review.transcript?.model).toEqual({ provider: QWEN.name, name: QWEN.model });
    expect(review.transcript?.plan).toHaveLength(2);
    expect(review.transcript?.steps.map((s) => s.tool)).toEqual([
      "decode_transaction",
      "get_baret_verdict",
      "read_vault",
    ]);
    expect(lines[0]).toBe("plan: 1. Read the verdict. 2. Decode the call.");
    expect(lines).toContain("tool read_vault 0x0a82...a35 -> ok (5 ms)");
    expect(lines.at(-1)).toBe("decision: approve: It matches.");
  });

  it("turns an approval that never read the verdict into a veto", async () => {
    const { client } = stubClient(APPROVE, [
      toolStep("decode_transaction"),
      toolStep("get_baret_verdict", false),
    ]);
    const review = await agentReviewer(client, { baretUrl: BARET }).review(input());
    expect(review.decision).toBe("veto");
    expect(review.reason).toBe("approved without reading Baret's verdict");
  });

  it("turns an approval of a call Baret blocked into a veto", async () => {
    const { client } = stubClient(APPROVE, BOTH);
    const review = await agentReviewer(client, { baretUrl: BARET }).review(
      input({ verdict: verdict("blocked") }),
    );
    expect(review.decision).toBe("veto");
  });

  it("passes the model's veto through", async () => {
    const veto: Review = { decision: "veto", reason: "Wrong merchant.", mismatches: ["merchant"] };
    const { client } = stubClient(veto, []);
    const review = await agentReviewer(client, { baretUrl: BARET }).review(input());
    expect(review).toMatchObject(veto);
  });

  it("ends in ReviewerVetoError when the reviewer throws", async () => {
    const { client, agent } = stubClient(APPROVE, BOTH);
    agent.mockRejectedValueOnce(new Error("did not finish"));
    await expect(
      requireApproval(agentReviewer(client, { baretUrl: BARET }), input()),
    ).rejects.toBeInstanceOf(ReviewerVetoError);
  });

  it("keeps the plan and the tool calls made before the reviewer threw", async () => {
    const { client, agent } = stubClient(APPROVE, BOTH);
    agent.mockImplementationOnce(async (request: AgentRequest<unknown>) => {
      request.onStep?.(toolStep("decode_transaction"));
      throw new Error("qwen did not finish");
    });
    const err = await requireApproval(agentReviewer(client, { baretUrl: BARET }), input()).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ReviewerVetoError);
    const review = (err as ReviewerVetoError).review;
    expect(review.reason).toContain("qwen did not finish");
    expect(review.transcript?.plan).toEqual(["Read the verdict.", "Decode the call."]);
    expect(review.transcript?.steps.map((s) => s.tool)).toEqual(["decode_transaction"]);
  });

  it("cuts a long plan instead of refusing it", () => {
    const parsed = planSchema.parse({ plan: Array.from({ length: 9 }, () => "x".repeat(300)) });
    expect(parsed.plan).toHaveLength(6);
    expect(parsed.plan.every((step) => step.length === 200)).toBe(true);
    expect(() => planSchema.parse({ plan: [] })).toThrow();
  });

  it("builds a Qwen reviewer whose tools use the same fetch", () => {
    expect(() => qwenAgentReviewer({ apiKey: "k", baretUrl: BARET, fetch: vi.fn() })).not.toThrow();
  });
});

function tools(
  fetch?: typeof globalThis.fetch,
  overrides: Partial<ReviewInput> = {},
  apiKey?: string,
) {
  const list = reviewTools(input(overrides), {
    baretUrl: `${BARET}/`,
    now: () => NOW * 1000,
    ...(fetch ? { fetch } : {}),
    ...(apiKey ? { baretApiKey: apiKey } : {}),
  });
  return (name: string, args: unknown = {}) => {
    const tool = list.find((t) => t.name === name);
    if (!tool) throw new Error(`no tool ${name}`);
    return tool.run(args, new AbortController().signal);
  };
}

function respond(status: number, body: unknown = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("reviewTools", () => {
  it("decodes a vault payment with named arguments", async () => {
    const decoded = await tools()("decode_transaction");
    expect(decoded).toMatchObject({
      to: VAULT,
      valueWei: "0",
      function: "pay",
      args: { merchant: MERCHANT, amount: "1000000", ref: keccak256(stringToHex("order-42")) },
    });
  });

  it("reports refCheck.matches true when the ref is the keccak256 of the reference", async () => {
    const decoded = await tools(undefined, { reference: "order-42" })("decode_transaction");
    expect(decoded).toMatchObject({ refCheck: { reference: "order-42", matches: true } });
  });

  it("reports refCheck.matches false for another reference", async () => {
    const decoded = await tools(undefined, { reference: "order-43" })("decode_transaction");
    expect(decoded).toMatchObject({ refCheck: { reference: "order-43", matches: false } });
  });

  it("adds no refCheck when no reference is known", async () => {
    const decoded = await tools()("decode_transaction");
    expect(decoded).not.toHaveProperty("refCheck");
  });

  it("tells the model the ref is a keccak256 hash checked in code", () => {
    expect(AGENT_REVIEWER_SYSTEM_PROMPT).toContain("keccak256");
    expect(AGENT_REVIEWER_SYSTEM_PROMPT).toContain("refCheck.matches");
  });

  it("decodes an ERC-20 approve", async () => {
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [SPENDER, maxUint256],
    });
    const decoded = await tools(undefined, { call: { to: USDC, data } })("decode_transaction");
    expect(decoded).toMatchObject({
      function: "approve",
      args: { spender: SPENDER, amount: maxUint256.toString() },
    });
  });

  it("calls empty data a plain transfer of MON", async () => {
    const decoded = await tools(undefined, { call: { to: MERCHANT, value: 5n } })(
      "decode_transaction",
    );
    expect(decoded).toEqual({
      to: MERCHANT,
      valueWei: "5",
      function: null,
      note: "a plain transfer of MON",
    });
  });

  it("names no function for an unknown selector", async () => {
    const decoded = await tools(undefined, { call: { to: USDC, data: "0xdeadbeef00" } })(
      "decode_transaction",
    );
    expect(decoded).toMatchObject({ selector: "0xdeadbeef", function: null });
    expect((decoded as { note?: string }).note).toBeTruthy();
  });

  it("gives every account's balance change, the vault's included", async () => {
    const facts = (await tools()("get_baret_verdict")) as {
      balanceChanges: { account: string; isAgent: boolean; deltaBaseUnits: string }[];
      checksUnavailable: string[];
    };
    expect(facts.balanceChanges).toContainEqual(
      expect.objectContaining({
        account: VAULT,
        isAgent: false,
        asset: "USDC",
        deltaBaseUnits: "-1000000",
      }),
    );
    expect(facts.checksUnavailable).toEqual(["nansen"]);
  });

  it("reads a vault with the API key and keeps the 5 newest activities", async () => {
    const fetch = respond(200, {
      vault: { id: VAULT },
      activity: [1, 2, 3, 4, 5, 6, 7],
      payments: [],
    });
    const result = await tools(fetch, {}, "secret")("read_vault", { address: VAULT });
    expect(result).toEqual({
      now: NOW,
      vault: { id: VAULT },
      recentActivity: [1, 2, 3, 4, 5],
      paidByMerchant: {},
      windowsComplete: true,
      // The vault lists no merchant, so this call's payment cannot fit.
      thisPayment: {
        merchant: MERCHANT.toLowerCase(),
        amountBaseUnits: "1000000",
        listed: false,
        fits: false,
      },
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BARET}/v1/audit/vault/${VAULT}?limit=100`);
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("secret");
  });

  it("sums what the vault paid each merchant in the rolling hour and 24 hours", async () => {
    const paid = (amount: string, age: number, merchant: string = MERCHANT) => ({
      merchant,
      amount,
      timestamp: NOW - age,
    });
    const fetch = respond(200, {
      vault: { id: VAULT },
      activity: [],
      payments: [
        paid("250000", 61),
        paid("250000", 3_599),
        paid("500000", 3_600),
        paid("100000", 86_399),
        paid("900000", 86_400),
        paid("70000", 10, SPENDER),
      ],
    });
    const result = (await tools(fetch)("read_vault", { address: VAULT })) as {
      paidByMerchant: Record<string, { lastHour: string; lastDay: string }>;
    };
    expect(result.paidByMerchant).toEqual({
      [MERCHANT.toLowerCase()]: { lastHour: "500000", lastDay: "1100000" },
      [SPENDER.toLowerCase()]: { lastHour: "70000", lastDay: "70000" },
    });
  });

  it("works out in code whether this call's payment fits the merchant's caps now", async () => {
    // The call pays 1 USDC (1_000_000). Caps: 1.5 per payment, 2 per hour, 5 per day.
    const vault = (paused = false) => ({
      id: VAULT,
      merchants: [
        {
          address: MERCHANT.toLowerCase(),
          perTxCap: "1500000",
          hourlyCap: "2000000",
          dailyCap: "5000000",
          paused,
          active: true,
        },
      ],
    });
    const paidLastHour = (amount: string) => [{ merchant: MERCHANT, amount, timestamp: NOW - 60 }];
    type Result = {
      thisPayment: { fits: boolean; roomBaseUnits?: string; listed: boolean } | null;
    };
    const read = async (body: unknown, overrides: Partial<ReviewInput> = {}) =>
      (await tools(respond(200, body), overrides)("read_vault", { address: VAULT })) as Result;

    const fits = await read({ vault: vault(), activity: [], payments: paidLastHour("500000") });
    expect(fits.thisPayment).toMatchObject({ fits: true, roomBaseUnits: "1500000", listed: true });

    const overHour = await read({
      vault: vault(),
      activity: [],
      payments: paidLastHour("1500000"),
    });
    expect(overHour.thisPayment).toMatchObject({ fits: false, roomBaseUnits: "500000" });

    const paused = await read({ vault: vault(true), activity: [], payments: [] });
    expect(paused.thisPayment?.fits).toBe(false);

    const unlisted = await read({
      vault: { id: VAULT, merchants: [] },
      activity: [],
      payments: [],
    });
    expect(unlisted.thisPayment).toMatchObject({ listed: false, fits: false });

    const notThisVault = await read(
      { vault: vault(), activity: [], payments: [] },
      { call: { to: SPENDER, data: "0x" } },
    );
    expect(notThisVault.thisPayment).toBeNull();
  });

  it("names the registry, not a vault, when the reputation read fails", async () => {
    await expect(tools(respond(503))("check_reputation", { address: MERCHANT })).rejects.toThrow(
      "the reputation registry is unavailable",
    );
  });

  it("turns a missing vault and an unavailable indexer into errors", async () => {
    await expect(tools(respond(404))("read_vault", { address: VAULT })).rejects.toThrow(
      "the indexer has no vault at this address",
    );
    await expect(tools(respond(503))("read_vault", { address: VAULT })).rejects.toThrow(
      "vault history is unavailable",
    );
    await expect(tools(respond(500))("read_vault", { address: VAULT })).rejects.toThrow("HTTP 500");
  });

  it("reports whether an address is in the reputation registry", async () => {
    const unlisted = await tools(respond(200, { entry: null, history: [] }))("check_reputation", {
      address: MERCHANT,
    });
    expect(unlisted).toEqual({ listed: false });
    const listed = await tools(respond(200, { entry: { score: -5 }, history: [1, 2, 3, 4, 5, 6] }))(
      "check_reputation",
      { address: MERCHANT },
    );
    expect(listed).toEqual({ listed: true, entry: { score: -5 }, history: [1, 2, 3, 4, 5] });
  });

  it("refuses an address that is not one", async () => {
    const fetch = respond(200);
    await expect(tools(fetch)("check_reputation", { address: "0x123" })).rejects.toThrow(
      "0x address",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
