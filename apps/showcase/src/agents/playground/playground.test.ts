import { findings as findingCopy } from "@baret/content";
import { CLEANVERSE } from "@baret/demo";
import { bodyOf } from "@baret/web-ui/components/CheckBlocks";
import { fill } from "@baret/web-ui/lib/util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTIONS, randomAddress, SAMPLE_AUSDC, SAMPLES, verdictFor } from "./sample.js";
import {
  agentAddress,
  isAddress,
  isNotSent,
  parseTransaction,
  requestFor,
  sampleResult,
  senderOf,
  sourceFor,
} from "./source.js";
import { outcomeOf, terminalLines } from "./terminal.js";

describe("the Cleanverse sample reads like the live answer", () => {
  it("names aUSDC by the address the server sends in details.asset", () => {
    expect(SAMPLE_AUSDC).toBe(CLEANVERSE.aUsdc);
  });

  it("reads the asset's rule, not the user's, and never prints the asset's address", () => {
    const finding = SAMPLES.cleanverseNoCredential.findings.find(
      (f) => f.code === "COMPLIANCE_NO_CREDENTIAL",
    );
    expect(finding).toBeDefined();
    if (!finding) return;
    const { template, values } = bodyOf(findingCopy.COMPLIANCE_NO_CREDENTIAL, finding);
    const sentence = fill(template, values);
    expect(sentence).toContain("this asset only moves between verified wallets");
    expect(sentence).not.toContain("your rules");
    expect(sentence).not.toContain("{");
    expect(sentence.toLowerCase()).not.toContain(CLEANVERSE.aUsdc.toLowerCase());
  });
});

describe("the playground's verdicts follow the engine's rule", () => {
  /** Expected from the templates: toggles block when on, warnings only when allowWarnings is off. */
  const EXPECTED = {
    pay: { strict: "safe", balanced: "safe", permissive: "safe" },
    unlimitedAllowance: { strict: "blocked", balanced: "blocked", permissive: "caution" },
    wrongPayee: { strict: "blocked", balanced: "caution", permissive: "caution" },
    lookalikeToken: { strict: "blocked", balanced: "blocked", permissive: "blocked" },
    operatorApproval: { strict: "blocked", balanced: "blocked", permissive: "caution" },
    flaggedAddress: { strict: "blocked", balanced: "blocked", permissive: "blocked" },
    cleanverseVerified: { strict: "safe", balanced: "safe", permissive: "safe" },
    cleanverseNoCredential: { strict: "blocked", balanced: "blocked", permissive: "blocked" },
  } as const;

  for (const action of ACTIONS) {
    it(`${action} under each template`, () => {
      for (const policy of ["strict", "balanced", "permissive"] as const) {
        expect(verdictFor(SAMPLES[action].findings, policy).verdict, policy).toBe(
          EXPECTED[action][policy],
        );
      }
    });
  }

  it("names the rule that blocked", () => {
    expect(verdictFor(SAMPLES.unlimitedAllowance.findings, "balanced").rule).toBe(
      "blockUnlimitedApprovals",
    );
    expect(verdictFor(SAMPLES.wrongPayee.findings, "strict").rule).toBe("allowWarnings");
    expect(verdictFor(SAMPLES.flaggedAddress.findings, "permissive").rule).toBe(
      "blockKnownMalicious",
    );
  });
});

describe("parseTransaction", () => {
  it("reads raw hex", () => {
    expect(parseTransaction("0x02f86b0182")).toEqual({ raw: "0x02f86b0182" });
  });

  it("reads JSON with a to address", () => {
    expect(
      parseTransaction(
        '{ "to": "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4", "data": "0x095ea7b3" }',
      ),
    ).toEqual({ to: "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4", value: "0", data: "0x095ea7b3" });
  });

  it("keeps the request's own from and a value in base units", () => {
    expect(
      parseTransaction(
        '{ "from": "0x1111111111111111111111111111111111111111", "to": "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4", "value": 250000 }',
      ),
    ).toEqual({
      from: "0x1111111111111111111111111111111111111111",
      to: "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4",
      value: "250000",
      data: "0x",
    });
    expect(
      parseTransaction('{ "to": "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4", "value": "0x3e8" }'),
    ).toMatchObject({ value: "0x3e8" });
  });

  it("rejects anything else", () => {
    expect(parseTransaction("")).toBeNull();
    expect(parseTransaction("send it")).toBeNull();
    expect(parseTransaction('{ "to": "nowhere" }')).toBeNull();
    expect(parseTransaction("0x12")).toBeNull();
    expect(parseTransaction("[1, 2]")).toBeNull();
    // A decimal amount is not base units, and a from must be an address.
    const to = '"to": "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4"';
    expect(parseTransaction(`{ ${to}, "value": 1.5 }`)).toBeNull();
    expect(parseTransaction(`{ ${to}, "value": "1.5" }`)).toBeNull();
    expect(parseTransaction(`{ ${to}, "from": "me" }`)).toBeNull();
  });
});

describe("the live request", () => {
  const agent = "0x2222222222222222222222222222222222222222";
  const json = parseTransaction(
    '{ "from": "0x1111111111111111111111111111111111111111", "to": "0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4" }',
  );
  const raw = parseTransaction("0x02f86b0182");
  if (!json || !raw) throw new Error("unreadable");

  it("sends as the pasted from, else as the agent", () => {
    expect(senderOf(json, agent)).toBe("0x1111111111111111111111111111111111111111");
    expect(senderOf(raw, agent)).toBe(agent);
    expect(isAddress(agent)).toBe(true);
    expect(isAddress("0x22")).toBe(false);
  });

  it("matches the server's request schema, with the template as full rules", async () => {
    const { analyzeRequestSchema, createPolicy } = await import("@baret/guard");
    for (const transaction of [json, raw]) {
      const from = senderOf(transaction, agent);
      const body = requestFor(transaction, from, "strict");
      expect(analyzeRequestSchema.safeParse(body).success).toBe(true);
      expect(body.policy).toEqual(createPolicy("strict", { allowedAssets: [] }));
      expect(body.userWallet).toBe(from);
    }
  });
});

describe("the playground source", () => {
  const signal = new AbortController().signal;

  it("answers an action from the samples", async () => {
    const result = await sourceFor(false)(
      { kind: "action", action: "pay", policy: "strict" },
      signal,
    );
    expect(result).toEqual(sampleResult("pay", "strict"));
    expect(result.source).toBe("sample");
  });

  it("sends nothing for a pasted transaction without the live flag, and fails closed", async () => {
    const tx = parseTransaction("0x02f86b0182");
    if (!tx) throw new Error("unreadable");
    const result = await sourceFor(false)(
      { kind: "custom", transaction: tx, from: randomAddress(), policy: "balanced" },
      signal,
    );
    expect(result.source).toBe("failed");
    expect(result.verdict).toBe("blocked");
    expect(isNotSent(result)).toBe(true);
    expect(outcomeOf(result)).toBe("notSent");
    expect(terminalLines(result, "balanced")[1]).toBe("baret > not sent, nothing checked");
  });

  it("makes a 0x address of 40 hex digits", () => {
    expect(randomAddress()).toMatch(/^0x[0-9a-f]{40}$/);
  });
});

/** A stand-in for VITE_BARET_PLAYGROUND_AGENT, the funded agent wallet. */
const FUNDED = "0x7105Fb53bA2a9d96c4587280F2696438Aca51d9d";

describe("the playground source, live (VITE_BARET_PLAYGROUND=live)", () => {
  const signal = new AbortController().signal;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okResponse(decision: "safe" | "caution" | "blocked") {
    return new Response(
      JSON.stringify({
        decision,
        findings: [],
        firedRules: [],
        suggestions: [],
        confidence: "high",
        estimatedChanges: [],
        approvals: [],
        sources: [],
        expiresAt: "2026-10-09T12:00:00Z",
        meta: {
          requestId: "r1",
          analysisVersion: "1",
          network: "testnet",
          chainId: 10143,
          analyzedAt: "2026-10-09T11:59:00Z",
          blockNumber: "1",
          traced: false,
        },
      }),
    );
  }

  it("sends an x402 action as typedData and payment, never under transaction", async () => {
    const fetch = vi.fn(async () => okResponse("safe"));
    vi.stubGlobal("fetch", fetch);
    const result = await sourceFor(true, FUNDED)(
      { kind: "action", action: "pay", policy: "balanced" },
      signal,
    );
    expect(result.verdict).toBe("safe");
    expect(result.source).toBe("live");
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ network: "testnet", policyTemplate: "balanced" });
    expect(body.typedData).toBeDefined();
    expect(body.payment).toBeDefined();
    expect(body.transaction).toBeUndefined();
  });

  it("sends a plain-call action as a transaction, with userWallet and policyTemplate", async () => {
    const fetch = vi.fn(async () => okResponse("blocked"));
    vi.stubGlobal("fetch", fetch);
    const result = await sourceFor(true, FUNDED)(
      { kind: "action", action: "flaggedAddress", policy: "strict" },
      signal,
    );
    expect(result.verdict).toBe("blocked");
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ network: "testnet", policyTemplate: "strict" });
    expect(body.transaction).toBeDefined();
    expect(body.userWallet).toBe(body.transaction.from);
    expect(body.typedData).toBeUndefined();
  });

  it("sends the Cleanverse actions from the real verified holder, not the playground agent", async () => {
    const HOLDER = "0x888895E314BF33CEeBCF5320279061aed3a5E2bd";
    const AUSDC = "0xaC0893567D43C3E7e6e35a72803df05416C1f20D";
    const RECIPIENT = "0xc448042EdAC1899B023CaA0E9Da5e4a8833de873";
    const fetch = vi.fn(async () => okResponse("safe"));
    vi.stubGlobal("fetch", fetch);
    await sourceFor(true, FUNDED)(
      { kind: "action", action: "cleanverseVerified", policy: "balanced" },
      signal,
    );
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    // A plain aUSDC transfer: `to` is always the token contract, the
    // recipient is encoded in `data` (`transfer(address,uint256)`).
    expect(body.transaction.from.toLowerCase()).toBe(HOLDER.toLowerCase());
    expect(body.transaction.to.toLowerCase()).toBe(AUSDC.toLowerCase());
    expect(body.userWallet.toLowerCase()).toBe(HOLDER.toLowerCase());
    expect(String(body.transaction.data).toLowerCase()).toContain(RECIPIENT.slice(2).toLowerCase());
  });

  it("sends the no-credential Cleanverse action to the playground agent as the recipient", async () => {
    const fetch = vi.fn(async () => okResponse("blocked"));
    vi.stubGlobal("fetch", fetch);
    await sourceFor(true, FUNDED)(
      { kind: "action", action: "cleanverseNoCredential", policy: "balanced" },
      signal,
    );
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(String(body.transaction.data).toLowerCase()).toContain(FUNDED.slice(2).toLowerCase());
  });

  it("signs from VITE_BARET_PLAYGROUND_AGENT when it is a valid address", () => {
    expect(agentAddress(FUNDED)).toBe(FUNDED);
    expect(agentAddress(undefined)).toBeNull();
    expect(agentAddress("not an address")).toBeNull();
  });

  it("answers an action from samples when live but no agent is set", async () => {
    const fetch = vi.fn(async () => okResponse("safe"));
    vi.stubGlobal("fetch", fetch);
    const result = await sourceFor(true, null)(
      { kind: "action", action: "pay", policy: "balanced" },
      signal,
    );
    expect(result.source).toBe("sample");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed on a non-2xx status, like the demo sites", async () => {
    vi.stubGlobal("fetch", async () => new Response("down", { status: 503 }));
    const result = await sourceFor(true, FUNDED)(
      { kind: "action", action: "pay", policy: "balanced" },
      signal,
    );
    expect(result.verdict).toBe("blocked");
    expect(result.source).toBe("failed");
  });
});

describe("the terminal", () => {
  it("prints the agent asking while the check runs", () => {
    expect(terminalLines(null, "balanced")).toEqual(["agent > asking Baret before signing"]);
  });

  it("names the rule that blocked", () => {
    const lines = terminalLines(sampleResult("unlimitedAllowance", "balanced"), "balanced");
    expect(lines[1]).toBe("baret > Blocked. Rule: Block unlimited allowances");
  });

  it("names a Caution block as a reason, not as the toggle that would allow it", () => {
    const lines = terminalLines(sampleResult("wrongPayee", "strict"), "strict");
    expect(lines[1]).toBe("baret > Blocked. Rule: Caution not allowed by this policy");
  });

  it("does not re-judge a live block, and never leaves the rule empty", () => {
    const live = { ...sampleResult("unlimitedAllowance", "balanced"), source: "live" as const };
    expect(terminalLines(live, "balanced")[1]).toBe("baret > Blocked. Rule: see the findings");
    const bare = { ...live, findings: [] };
    expect(terminalLines(bare, "balanced")[1]).toBe("baret > Blocked. Rule: see the findings");
  });

  it("counts the findings of a Caution, one and many", () => {
    const one = sampleResult("wrongPayee", "balanced");
    expect(one.findings).toHaveLength(1);
    expect(terminalLines(one, "balanced")[1]).toBe("baret > Caution. 1 finding, no rule broken.");
    const two = { ...one, findings: [...one.findings, ...one.findings] };
    expect(terminalLines(two, "balanced")[1]).toBe("baret > Caution. 2 findings, no rule broken.");
  });

  it("treats a failed check as unreachable", () => {
    const failed = { ...sampleResult("pay", "strict"), source: "failed" as const };
    expect(outcomeOf(failed)).toBe("unreachable");
    expect(isNotSent(failed)).toBe(false);
  });
});

describe("the quickstart code follows the picked policy", () => {
  it("swaps the template in the SDK and CLI samples, leaves the HTTP sample alone", async () => {
    const { agents } = await import("@baret/content");
    const { withPolicy } = await import("../code.js");
    expect(withPolicy(agents.quickstart.sdk.code, "strict")).toContain('policyTemplate: "strict"');
    const cli = withPolicy(agents.quickstart.cli.code, "permissive");
    expect(cli).toContain("BARET_POLICY_TEMPLATE=permissive");
    expect(withPolicy(agents.quickstart.http.code, "strict")).toBe(
      agents.quickstart.http.code.join("\n"),
    );
  });
});
