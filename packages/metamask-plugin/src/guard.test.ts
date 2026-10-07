import { analyzeRequestSchema } from "@baret/guard";
import { describe, expect, it, vi } from "vitest";
import {
  activeAddress,
  buildAnalyzeRequest,
  checkProposal,
  gate,
  guardedSend,
  NoVerdictError,
  type Proposal,
  parseVerdict,
  proposalProblem,
  reasons,
  type Verdict,
} from "./guard";

const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";

const proposal: Proposal = { chainId: 10143, from: FROM, to: TO, value: "1000", data: "0x" };

const FUTURE = "2999-01-01T00:00:00.000Z";

function answer(decision: string, extra: Record<string, unknown> = {}) {
  return {
    decision,
    findings:
      decision === "safe"
        ? []
        : [
            {
              code: "ERC20_APPROVAL_UNLIMITED",
              severity: "high",
              values: { spender: TO, asset: "USDC" },
              blocking: decision === "blocked",
            },
          ],
    firedRules:
      decision === "blocked"
        ? [
            {
              rule: "allowUnlimitedApprovals",
              code: "ERC20_APPROVAL_UNLIMITED",
              limit: null,
              actual: null,
            },
          ]
        : [],
    suggestions: [],
    confidence: "high",
    estimatedChanges: [],
    approvals: [],
    sources: [],
    expiresAt: FUTURE,
    meta: { requestId: "req-1", network: "testnet", chainId: 10143 },
    ...extra,
  };
}

function verdict(decision: Verdict["decision"], expiresAt = FUTURE): Verdict {
  return { ...parseVerdict(answer(decision)), expiresAt };
}

function fetchReturning(status: number, body: unknown): typeof fetch {
  return vi.fn(
    async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

describe("proposalProblem", () => {
  it("passes a well-formed Monad transaction", () => {
    expect(proposalProblem(proposal)).toBeNull();
    expect(proposalProblem({ ...proposal, chainId: 143, data: "0xa9059cbb" })).toBeNull();
  });

  it.each([
    ["a chain that is not Monad", { chainId: 1 }],
    ["a short address", { to: "0x1234" }],
    ["no sender", { from: "" }],
    ["a value with a decimal point", { value: "0.5" }],
    ["a negative value", { value: "-1" }],
    ["hex with an odd number of digits", { data: "0xabc" }],
    ["data without 0x", { data: "abcd" }],
  ])("names the problem with %s", (_name, change) => {
    expect(proposalProblem({ ...proposal, ...change })).toEqual(expect.any(String));
  });
});

describe("buildAnalyzeRequest", () => {
  it("is a request the server's schema accepts", () => {
    const body = buildAnalyzeRequest(proposal, "strict");
    expect(analyzeRequestSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({ network: "testnet", userWallet: FROM, policyTemplate: "strict" });
  });

  it("maps chain 143 to mainnet", () => {
    expect(buildAnalyzeRequest({ ...proposal, chainId: 143 }, "balanced").network).toBe("mainnet");
  });
});

describe("parseVerdict", () => {
  it("reads a verdict", () => {
    const v = parseVerdict(answer("blocked"));
    expect(v.decision).toBe("blocked");
    expect(v.findings[0]).toMatchObject({ code: "ERC20_APPROVAL_UNLIMITED", blocking: true });
    expect(v.firedRules[0]?.rule).toBe("allowUnlimitedApprovals");
    expect(v.requestId).toBe("req-1");
  });

  it.each([
    ["a string", "ok"],
    ["an unknown decision", answer("fine")],
    ["no findings", answer("safe", { findings: undefined })],
    ["a finding without a code", answer("safe", { findings: [{ severity: "low" }] })],
    ["a rule of the wrong shape", answer("safe", { firedRules: [{ rule: 1 }] })],
    ["no expiry", answer("safe", { expiresAt: undefined })],
    ["an expiry that is not a date", answer("safe", { expiresAt: "soon" })],
    ["no request id", answer("safe", { meta: {} })],
  ])("refuses %s", (_name, body) => {
    expect(() => parseVerdict(body)).toThrow(NoVerdictError);
  });
});

describe("checkProposal", () => {
  it("posts the proposal and returns the verdict", async () => {
    const doFetch = fetchReturning(200, answer("safe"));
    const v = await checkProposal(proposal, { apiUrl: "https://baret.example/", fetch: doFetch });
    expect(v.decision).toBe("safe");
    const [url, init] = vi.mocked(doFetch).mock.calls[0] ?? [];
    expect(url).toBe("https://baret.example/v1/analyze");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      network: "testnet",
      policyTemplate: "balanced",
      transaction: { from: FROM, to: TO, value: "1000", data: "0x" },
    });
  });

  it.each([
    ["a server error", fetchReturning(503, { error: "down" })],
    ["a rate limit", fetchReturning(429, "slow down")],
    ["a page that is not JSON", fetchReturning(200, "<html>")],
    ["an answer of the wrong shape", fetchReturning(200, { safe: true })],
  ])("has no verdict on %s", async (_name, doFetch) => {
    await expect(checkProposal(proposal, { fetch: doFetch })).rejects.toThrow(NoVerdictError);
  });

  it("has no verdict when the request fails", async () => {
    const doFetch = vi.fn(async () => {
      throw new Error("connection refused");
    }) as unknown as typeof fetch;
    await expect(checkProposal(proposal, { fetch: doFetch })).rejects.toThrow(/connection refused/);
  });
});

describe("gate", () => {
  const open = { acceptCaution: false, nowMs: 0 };

  it("lets Safe through", () => {
    expect(gate(verdict("safe"), open)).toEqual({ allowed: true, reason: "safe" });
  });

  it("never lets Blocked through, whatever the caller accepts", () => {
    expect(gate(verdict("blocked"), open)).toEqual({ allowed: false, reason: "blocked" });
    expect(gate(verdict("blocked"), { acceptCaution: true, nowMs: 0 }).allowed).toBe(false);
  });

  it("holds Caution unless a person accepted it", () => {
    expect(gate(verdict("caution"), open)).toEqual({ allowed: false, reason: "caution" });
    expect(gate(verdict("caution"), { acceptCaution: true, nowMs: 0 })).toEqual({
      allowed: true,
      reason: "caution-accepted",
    });
  });

  it("does not act on an expired verdict", () => {
    const old = verdict("safe", "2026-01-01T00:00:00.000Z");
    expect(
      gate(old, { acceptCaution: true, nowMs: Date.parse("2026-01-01T00:00:01.000Z") }),
    ).toEqual({ allowed: false, reason: "expired" });
  });
});

describe("guardedSend", () => {
  const sent = { status: "SUBMITTED", hash: "0xabc" };

  it("submits a Safe proposal once", async () => {
    const submit = vi.fn(async () => sent);
    const result = await guardedSend(
      proposal,
      { check: async () => verdict("safe"), submit },
      { acceptCaution: false },
    );
    expect(result).toMatchObject({ sent: true, outcome: sent, gate: { reason: "safe" } });
    expect(submit).toHaveBeenCalledExactlyOnceWith(proposal);
  });

  it("does not call the wallet for a Blocked proposal", async () => {
    const submit = vi.fn(async () => sent);
    const result = await guardedSend(
      proposal,
      { check: async () => verdict("blocked"), submit },
      { acceptCaution: true },
    );
    expect(result.sent).toBe(false);
    expect(result.outcome).toBeUndefined();
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not call the wallet for a Caution nobody accepted", async () => {
    const submit = vi.fn(async () => sent);
    const result = await guardedSend(
      proposal,
      { check: async () => verdict("caution"), submit },
      { acceptCaution: false },
    );
    expect(result.gate.reason).toBe("caution");
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not call the wallet when Baret gives no verdict", async () => {
    const submit = vi.fn(async () => sent);
    await expect(
      guardedSend(
        proposal,
        {
          check: async () => {
            throw new NoVerdictError("Baret answered 503");
          },
          submit,
        },
        { acceptCaution: true },
      ),
    ).rejects.toThrow(NoVerdictError);
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not call the wallet when the verdict expired on the way", async () => {
    const submit = vi.fn(async () => sent);
    const result = await guardedSend(
      proposal,
      {
        check: async () => verdict("safe", "2026-01-01T00:00:00.000Z"),
        submit,
        now: () => Date.parse("2026-06-01T00:00:00.000Z"),
      },
      { acceptCaution: false },
    );
    expect(result.gate.reason).toBe("expired");
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("reasons", () => {
  it("gives the agent the code and the values, not a sentence", () => {
    expect(reasons(verdict("blocked"))).toEqual([
      `ERC20_APPROVAL_UNLIMITED (blocks) spender=${TO} asset=USDC`,
    ]);
    expect(reasons(verdict("safe"))).toEqual([]);
  });
});

describe("activeAddress", () => {
  it("prefers the selected wallet", () => {
    expect(
      activeAddress({
        selectedWallet: { ref: { address: ` ${TO} ` } },
        remoteWallets: [{ address: FROM }],
      }),
    ).toBe(TO);
  });

  it("falls back to the first wallet with an address", () => {
    expect(activeAddress({ byokWallets: [], remoteWallets: [{ address: FROM }] })).toBe(FROM);
    expect(
      activeAddress({ selectedWallet: { ref: { index: 0 } }, byokWallets: [{ address: FROM }] }),
    ).toBe(FROM);
  });

  it("has no address in an empty or unreadable state", () => {
    expect(activeAddress({ byokWallets: [], remoteWallets: [] })).toBeNull();
    expect(activeAddress(null)).toBeNull();
    expect(activeAddress({ remoteWallets: [{ address: "not-an-address" }] })).toBeNull();
  });
});
