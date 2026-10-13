import { sign } from "@baret/content";
import { describe, expect, it } from "vitest";
import { SIGN_REQUESTS } from "../data/sample.js";
import type { SignRequest } from "../data/types.js";
import { fillParts } from "../lib/parts.js";
import {
  actionParts,
  actionText,
  blockedSummary,
  fixFor,
  impactText,
  logFor,
  overrideBody,
  ruleRows,
  simulationFailed,
} from "./sign.js";

function sample(id: SignRequest["id"]): SignRequest {
  const request = SIGN_REQUESTS.find((r) => r.id === id);
  if (!request) throw new Error(`no sample ${id}`);
  return request;
}

const AT = "2026-10-03T16:00:00Z";

describe("the request's words", () => {
  it("names the action with the address shortened, and keeps the address's case", () => {
    expect(actionText(sample("safe"))).toBe("Send 0.50 MON to 0x5b0e...e2f4");
    const kept = actionParts(sample("blocked")).filter((part) => part.keep);
    expect(kept.map((part) => part.text)).toEqual(["0xa61f...7f30"]);
  });

  it("says what moves if you sign, with the address whole", () => {
    expect(impactText(sample("safe"))).toBe(
      "0.50 MON leaves your wallet for 0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4.",
    );
    expect(impactText(sample("unreachable"))).toBe(
      "Baret could not tell what moves. Treat that as a reason to stop.",
    );
  });

  describe("when the trial run failed", () => {
    const contract = "0x4a7c000000000000000000000000000000009e21";
    const call: SignRequest = {
      ...sample("blocked"),
      action: "contractCall",
      impact: "contractCall",
      values: { contract },
      changes: [],
      approvals: [],
      findings: [{ code: "SIMULATION_FAILED", values: {} }],
      rules: [{ rule: "requireSuccessfulSimulation" }],
    };

    it("knows a failed trial run by its finding", () => {
      expect(simulationFailed(call)).toBe(true);
      expect(simulationFailed(sample("blocked"))).toBe(false);
    });

    it("says why instead of pointing at a list that is not there", () => {
      expect(impactText(call)).toBe(sign.impact.failed);
      expect(impactText(call)).not.toMatch(/listed below/);
      // A transfer that would fail does not claim the amount leaves either.
      expect(impactText({ ...sample("safe"), findings: call.findings })).toBe(sign.impact.failed);
    });

    it("names the empty balance, the faucet's line, when the account holds no MON", () => {
      expect(impactText(call, true)).toBe(sign.findings.noMon);
    });

    it("keeps the list line once the trial run passed", () => {
      expect(impactText({ ...call, findings: [] }, true)).toBe(
        `This runs a call on ${contract}. What changes is listed below.`,
      );
    });

    it("says no check ran on a site's call under Can't reach Baret", () => {
      const down: SignRequest = { ...call, verdict: "unreachable", findings: [], rules: [] };
      expect(impactText(down, true)).toBe(
        `This runs a call on ${contract}. No check ran, so what it changes is unknown.`,
      );
    });
  });

  it("sums up a block by its first rule and counts the rest", () => {
    expect(blockedSummary(sample("blocked"))).toBe(
      "Block unlimited allowances and 1 more rule stopped this request. Nothing was signed.",
    );
    expect(ruleRows(sample("blocked")).map((row) => row.label)).toEqual([
      "Block unlimited allowances",
      "Block listed addresses",
    ]);
  });

  it("counts three or more fired rules in the plural", () => {
    const blocked = sample("blocked");
    const first = blocked.rules[0];
    if (!first) throw new Error("no rule");
    expect(blockedSummary({ ...blocked, rules: [first, first, first] })).toBe(
      "Block unlimited allowances and 2 more rules stopped this request. Nothing was signed.",
    );
  });

  it("never prints an empty rule when a block has no fired rule", () => {
    const blocked = { ...sample("blocked"), rules: [] };
    expect(blockedSummary(blocked)).toBe("A check stopped this request. Nothing was signed.");
    expect(overrideBody(blocked)).toMatch(/^Your rules stay on\./);
    expect(overrideBody(sample("blocked"))).toMatch(/^Block unlimited allowances stays on\./);
  });

  it("never names a toggle when only a fail-closed finding fired its rule", () => {
    // SIGNATURE_NOT_UNDERSTOOD and ACCOUNT_CODE_DELEGATION block under every
    // rule set, so their field may be switched off: no line may name it.
    for (const [code, rule] of [
      ["SIGNATURE_NOT_UNDERSTOOD", "blockPermit"],
      ["ACCOUNT_CODE_DELEGATION", "blockDelegatecall"],
    ] as const) {
      const request: SignRequest = {
        ...sample("blocked"),
        findings: [{ code, values: {} }],
        rules: [{ rule }],
      };
      expect(blockedSummary(request)).toBe("A check stopped this request. Nothing was signed.");
      expect(overrideBody(request)).toMatch(/^Your rules stay on\./);
      expect(ruleRows(request)).toEqual([]);
    }
  });

  it("still names a toggle that a toggle finding fired next to a fail-closed one", () => {
    const request: SignRequest = {
      ...sample("blocked"),
      findings: [
        { code: "SIGNATURE_NOT_UNDERSTOOD", values: {} },
        { code: "PERMIT_SIGNATURE_DETECTED", values: {} },
      ],
      rules: [{ rule: "blockPermit" }],
    };
    expect(blockedSummary(request)).toBe(
      "Block signed allowances stopped this request. Nothing was signed.",
    );
    expect(overrideBody(request)).toMatch(/^Block signed allowances stays on\./);
  });

  it("suggests the fallback fix when the allowance carries no amount", () => {
    expect(fixFor(sample("blocked"))).toBe(sign.verdict.blocked.fix.fallback);
  });

  it("prefers the server's first suggestion for the fix", () => {
    const blocked = sample("blocked");
    expect(
      fixFor({
        ...blocked,
        suggestions: [
          { code: "ERC20_APPROVAL_UNLIMITED", values: { amount: "25", asset: "USDC" } },
        ],
      }),
    ).toBe("Allow only 25 USDC, the amount this request needs.");
    expect(
      fixFor({
        ...blocked,
        suggestions: [{ code: "POST_BALANCE_TOO_LOW", values: { limit: "5", asset: "MON" } }],
      }),
    ).toBe("Send less, so you keep at least 5 MON after this.");
  });

  it("falls back to the findings when no suggestion can be worded", () => {
    const blocked = sample("blocked");
    expect(
      fixFor({ ...blocked, suggestions: [{ code: "KNOWN_MALICIOUS_ADDRESS", values: {} }] }),
    ).toBe(sign.verdict.blocked.fix.fallback);
    expect(
      fixFor({
        ...blocked,
        suggestions: [],
        findings: [{ code: "NFT_OPERATOR_GRANTED", values: {} }],
      }),
    ).toBe("Allow the one item this needs, not the whole collection.");
  });

  it("splits any template so chosen values keep their case", () => {
    expect(
      fillParts("{origin} wants to connect", { origin: "novaswap.example" }, new Set(["origin"])),
    ).toEqual([
      { text: "novaswap.example", keep: true },
      { text: " wants to connect", keep: false },
    ]);
  });
});

describe("what each outcome leaves in the activity log", () => {
  it("logs a declined Safe or Caution request as declined, never as Blocked", () => {
    expect(logFor(sample("caution"), "declined", AT, "1").kind).toBe("declined");
    expect(logFor(sample("unreachable"), "declined", AT, "1").kind).toBe("declined");
  });

  it("logs a declined Blocked request as blocked, with the rule that stopped it", () => {
    const item = logFor(sample("blocked"), "declined", AT, "1");
    expect(item.kind).toBe("blocked");
    expect(item.rule).toBe("blockUnlimitedApprovals");
  });

  it("logs an override with the rule it went past, or as unchecked when Baret was unreachable", () => {
    expect(logFor(sample("blocked"), "overridden", AT, "1")).toMatchObject({
      kind: "overridden",
      rule: "blockUnlimitedApprovals",
    });
    expect(logFor(sample("unreachable"), "overridden", AT, "1").kind).toBe("unchecked");
  });

  it("logs a signed transfer as sent and any other signed call as signed", () => {
    expect(logFor(sample("safe"), "sent", AT, "48212045")).toMatchObject({
      kind: "sent",
      values: { amount: "0.50", asset: "MON" },
      block: "48212045",
    });
    expect(logFor(sample("caution"), "sent", AT, "1").kind).toBe("signed");
    expect(logFor(sample("safe"), "expired", AT, "1").kind).toBe("expired");
  });
});

describe("the rule rows", () => {
  it("words a floor rule as a minimum, with its unit, never as an allowance", () => {
    const request: SignRequest = {
      ...sample("blocked"),
      verdict: "blocked",
      findings: [
        { code: "POST_BALANCE_TOO_LOW", values: { actual: "0", limit: "0.1", asset: "MON" } },
      ],
      rules: [{ rule: "minPostNativeBalance", actual: "0", limit: "0.1" }],
    };
    expect(ruleRows(request)).toEqual([
      {
        label: "Keep at least this much MON",
        detail: "Keeps at least 0.1 MON in the account; this request would leave 0 MON.",
      },
    ]);
    expect(ruleRows(request)[0]?.detail).not.toMatch(/allows/);
  });

  it("keeps the allowance wording for a ceiling, and leaves a worded unit off", () => {
    const request: SignRequest = {
      ...sample("blocked"),
      verdict: "blocked",
      findings: [{ code: "ESTIMATED_LOSS_EXCEEDS_MAX", values: { actual: "62%", limit: "50%" } }],
      rules: [{ rule: "maxLossPercent", actual: "62%", limit: "50%" }],
    };
    expect(ruleRows(request)[0]?.detail).toBe("Requested 62%. Your rule allows 50%.");
  });
});

describe("a fee that was not estimated", () => {
  it("leaves no fee on the activity row instead of 0", () => {
    const request: SignRequest = { ...sample("safe"), fee: null };
    const row = logFor(request, "sent", "2026-10-12T00:00:00Z", "1");
    expect("fee" in row).toBe(false);
    const estimated = logFor(sample("safe"), "sent", "2026-10-12T00:00:00Z", "1");
    expect(estimated.fee).toBe(sample("safe").fee);
  });
});
