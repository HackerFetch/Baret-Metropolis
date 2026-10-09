import type { AnalyzeResponse } from "@baret/guard";
import { type LlmClient, LlmUnavailableError } from "@baret/llm";
import { type Address, keccak256 } from "viem";
import { describe, expect, it, vi } from "vitest";
import { AgentWallet, type ChainClient } from "./agent-wallet.js";
import { GuardBlockedError } from "./errors.js";
import {
  llmReviewer,
  qwenReviewer,
  REVIEWER_SYSTEM_PROMPT,
  type Review,
  type Reviewer,
  ReviewerVetoError,
  type ReviewInput,
  reviewPayload,
} from "./reviewer.js";
import { localSigner } from "./signer.js";

// A throwaway test key (the first Anvil account); it guards nothing.
const KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const MERCHANT: Address = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const USDC: Address = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const SPENDER = "0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888";
const AGENT = localSigner(KEY).address;

function verdict(decision: AnalyzeResponse["decision"]): AnalyzeResponse {
  return {
    decision,
    findings:
      decision === "blocked"
        ? [{ code: "KNOWN_MALICIOUS_ADDRESS", severity: "critical", values: {}, blocking: true }]
        : [],
    firedRules: [],
    suggestions: [],
    confidence: "high",
    estimatedChanges: [
      {
        account: AGENT,
        asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
        before: "5000000000000000000",
        after: "4000000000000000000",
        delta: "-1000000000000000000",
      },
      {
        account: MERCHANT,
        asset: { kind: "native", address: null, symbol: "MON", decimals: 18 },
        before: "0",
        after: "1000000000000000000",
        delta: "1000000000000000000",
      },
    ],
    approvals: [
      {
        owner: AGENT,
        kind: "erc20",
        contract: USDC,
        symbol: "USDC",
        decimals: 6,
        spender: SPENDER,
        amount: null,
        unlimited: true,
      },
    ],
    sources: [],
    expiresAt: new Date().toISOString(),
    meta: {
      requestId: "t",
      analysisVersion: "1",
      network: "testnet",
      chainId: 10143,
      analyzedAt: new Date().toISOString(),
      blockNumber: "1",
      traced: true,
    },
  } as AnalyzeResponse;
}

const approve: Review = { decision: "approve", reason: "Matches the intent.", mismatches: [] };
const veto: Review = {
  decision: "veto",
  reason: "The call also grants an unlimited USDC approval the intent does not mention.",
  mismatches: ["unlimited USDC approval to 0xeB9E…3888"],
};

function setup(answer: AnalyzeResponse, reviewer?: Reviewer) {
  const signed: unknown[] = [];
  const sent: string[] = [];
  const inner = localSigner(KEY);
  const chain: ChainClient = {
    prepare: async (_from, call) => ({
      chainId: 10143,
      type: "eip1559",
      to: call.to,
      data: call.data ?? "0x",
      value: call.value ?? 0n,
      nonce: 1,
      gas: 21_000n,
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 1n,
    }),
    send: async (raw) => {
      sent.push(raw);
      return keccak256(raw);
    },
  };
  const wallet = new AgentWallet({
    signer: {
      address: inner.address,
      signTransaction: (tx) => {
        signed.push(tx);
        return inner.signTransaction(tx);
      },
    },
    baretUrl: "http://unused",
    chain,
    guard: { evaluate: async () => answer },
    ...(reviewer ? { reviewer } : {}),
  });
  return { wallet, signed, sent };
}

const call = { to: MERCHANT, value: 10n ** 18n } as const;

describe("the reviewer in the agent wallet", () => {
  it("signs and sends when the reviewer approves, and returns the review", async () => {
    const review = vi.fn(async () => approve);
    const { wallet, signed, sent } = setup(verdict("safe"), { review });
    const result = await wallet.guardedSubmit(call, { intent: "Pay the merchant 1 MON." });

    expect(result.review).toEqual(approve);
    expect(signed).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(review).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ intent: "Pay the merchant 1 MON.", from: AGENT, call }),
    );
  });

  it("signs nothing when the reviewer vetoes", async () => {
    const { wallet, signed, sent } = setup(verdict("safe"), { review: async () => veto });
    const attempt = wallet.guardedSubmit(call, { intent: "Pay the merchant 1 MON." });

    await expect(attempt).rejects.toThrow(ReviewerVetoError);
    await expect(attempt).rejects.toMatchObject({ review: veto });
    expect(signed).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("vetoes without asking the model when no intent is stated", async () => {
    const review = vi.fn(async () => approve);
    const { wallet, signed } = setup(verdict("safe"), { review });

    await expect(wallet.guardedSubmit(call)).rejects.toThrow(/No intent was stated/);
    await expect(wallet.guardedSubmit(call, { intent: "   " })).rejects.toThrow(ReviewerVetoError);
    expect(review).not.toHaveBeenCalled();
    expect(signed).toHaveLength(0);
  });

  it("treats a reviewer that fails as a veto", async () => {
    const { wallet, signed } = setup(verdict("safe"), {
      review: async () => {
        throw new LlmUnavailableError("qwen answered 503", 503);
      },
    });
    const attempt = wallet.guardedSubmit(call, { intent: "Pay the merchant 1 MON." });

    await expect(attempt).rejects.toThrow(ReviewerVetoError);
    await expect(attempt).rejects.toThrow(/qwen answered 503/);
    expect(signed).toHaveLength(0);
  });

  it("never asks the reviewer about a call Baret blocked", async () => {
    const review = vi.fn(async () => approve);
    const { wallet, signed } = setup(verdict("blocked"), { review });

    await expect(wallet.guardedSubmit(call, { intent: "Pay the merchant." })).rejects.toThrow(
      GuardBlockedError,
    );
    expect(review).not.toHaveBeenCalled();
    expect(signed).toHaveLength(0);
  });

  it("gives a payment an intent of its own", async () => {
    const seen: ReviewInput[] = [];
    const { wallet } = setup(verdict("safe"), {
      review: async (input) => {
        seen.push(input);
        return approve;
      },
    });
    await wallet.pay({ vault: USDC, merchant: MERCHANT, amount: 250_000n, reference: "inv-7" });

    expect(seen[0]?.intent).toContain("250000");
    expect(seen[0]?.intent).toContain(MERCHANT);
    expect(seen[0]?.intent).toContain("inv-7");
  });

  it("works as before without a reviewer", async () => {
    const { wallet, sent } = setup(verdict("safe"));
    const result = await wallet.guardedSubmit(call);
    expect(result.review).toBeUndefined();
    expect(sent).toHaveLength(1);
  });
});

describe("what the model is shown", () => {
  const input: ReviewInput = {
    intent: "Pay the merchant 1 MON.",
    from: AGENT,
    call: { to: MERCHANT, value: 10n ** 18n, data: "0xa9059cbb00" },
    verdict: verdict("safe"),
  };

  it("is the call, the agent's own balance changes and the approvals", () => {
    const payload = reviewPayload(input);
    expect(payload.transaction).toEqual({
      from: AGENT,
      to: MERCHANT,
      valueWei: "1000000000000000000",
      selector: "0xa9059cbb",
      dataBytes: 5,
    });
    expect(payload.simulated.balanceChanges).toEqual([
      { asset: "MON", assetAddress: null, decimals: 18, deltaBaseUnits: "-1000000000000000000" },
    ]);
    expect(payload.simulated.approvals).toEqual([
      expect.objectContaining({ symbol: "USDC", spender: SPENDER, unlimited: true }),
    ]);
    // Bigints must not reach JSON.stringify.
    expect(() => JSON.stringify(payload)).not.toThrow();
  });

  it("has no selector for a plain transfer", () => {
    const payload = reviewPayload({ ...input, call: { to: MERCHANT, value: 1n } });
    expect(payload.transaction).toMatchObject({ selector: null, dataBytes: 0 });
  });

  it("is sent with the adversarial instructions and read back through the schema", async () => {
    const requests: { system: string; user: string }[] = [];
    const client: Pick<LlmClient, "json"> = {
      json: async (request) => {
        requests.push(request);
        return request.schema.parse(veto);
      },
    };
    await expect(llmReviewer(client).review(input)).resolves.toEqual(veto);

    expect(requests[0]?.system).toBe(REVIEWER_SYSTEM_PROMPT);
    expect(JSON.parse(requests[0]?.user ?? "{}").intent).toBe("Pay the merchant 1 MON.");
  });
});

describe("qwenReviewer", () => {
  it("asks Qwen on QwenCloud and accepts only the review shape", async () => {
    const doFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(veto) } }] })),
    ) as unknown as typeof fetch;
    const reviewer = qwenReviewer({ apiKey: "test-key", fetch: doFetch });

    await expect(
      reviewer.review({
        intent: "Swap 1 MON for USDC.",
        from: AGENT,
        call,
        verdict: verdict("safe"),
      }),
    ).resolves.toEqual(veto);
    const [url, init] = vi.mocked(doFetch).mock.calls[0] ?? [];
    expect(String(url)).toContain("maas.qwencloudapi.com/compatible-mode/v1");
    expect(JSON.parse(String(init?.body)).model).toBe("qwen3.8-max");
  });

  it("has no answer when the model adds a field that is not in the contract", async () => {
    const doFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: JSON.stringify({ ...approve, overrideBaret: true }) } },
            ],
          }),
        ),
    ) as unknown as typeof fetch;
    const reviewer = qwenReviewer({ apiKey: "test-key", fetch: doFetch });

    await expect(
      reviewer.review({ intent: "x", from: AGENT, call, verdict: verdict("safe") }),
    ).rejects.toThrow(LlmUnavailableError);
  });
});
