import { describe, expect, it } from "vitest";
import { ACTIONS, randomAddress, SAMPLES, verdictFor } from "./sample.js";
import {
  isAddress,
  isNotSent,
  parseTransaction,
  requestFor,
  sampleResult,
  senderOf,
  sourceFor,
} from "./source.js";
import { outcomeOf, terminalLines } from "./terminal.js";

describe("the playground's verdicts follow the engine's rule", () => {
  /** Expected from the templates: toggles block when on, warnings only when allowWarnings is off. */
  const EXPECTED = {
    pay: { strict: "safe", balanced: "safe", permissive: "safe" },
    unlimitedAllowance: { strict: "blocked", balanced: "blocked", permissive: "caution" },
    wrongPayee: { strict: "blocked", balanced: "caution", permissive: "caution" },
    lookalikeToken: { strict: "blocked", balanced: "blocked", permissive: "blocked" },
    operatorApproval: { strict: "blocked", balanced: "blocked", permissive: "caution" },
    flaggedAddress: { strict: "blocked", balanced: "blocked", permissive: "blocked" },
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

  it("answers the six actions from the samples", async () => {
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
  it("swaps the template in the SDK and CLI samples only", async () => {
    const { agents } = await import("@baret/content");
    const { withPolicy } = await import("../code.js");
    expect(withPolicy(agents.quickstart.sdk.code, "strict")).toContain('policy: "strict"');
    const cli = withPolicy(agents.quickstart.cli.code, "permissive");
    expect(cli).toContain("--policy permissive");
    expect(cli).toContain("# Strict, Balanced, Permissive");
    expect(withPolicy(agents.quickstart.mcp.code, "strict")).toBe(
      agents.quickstart.mcp.code.join("\n"),
    );
  });
});
