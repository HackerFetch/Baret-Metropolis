import { describe, expect, it } from "vitest";
import { PROBLEMS } from "../../../data/sample.js";
import type { Problem } from "../../../data/types.js";
import { problemBody } from "./x402-problem.js";

/** A block as the live wallet records it (live/records.ts problemFrom). */
function live(kind: Problem["kind"]): Problem {
  return {
    id: `problem-${kind}`,
    kind,
    at: "2026-10-11T10:00:00Z",
    merchant: "0x1111111111111111111111111111111111111111",
    values: { amount: "0.80", asset: "USDC", origin: "https://scrybe.example" },
  };
}

describe("the payments page's problem lines", () => {
  it("never shows a placeholder for a live block", () => {
    for (const kind of ["declined", "overCap", "mismatch", "asset"] as const) {
      expect(problemBody(live(kind))).not.toMatch(/\{\w+\}/);
    }
  });

  it("keeps the token with a live amount", () => {
    expect(problemBody(live("declined"))).toContain("asked for 0.80 USDC. Baret blocked it.");
  });

  it("falls back to a line without the rule when the rule was not read", () => {
    expect(problemBody(live("overCap"))).toMatch(/Baret blocked it\. Nothing was sent\.$/);
    expect(problemBody(live("mismatch"))).toMatch(/Baret blocked it\. Nothing was sent\.$/);
  });

  it("uses the full line when every value is there", () => {
    const line = problemBody(live("asset"));
    expect(line).toContain("asked for USDC from a contract");
  });

  it("keeps the sample's lines as they were", () => {
    const [overCap, mismatch] = PROBLEMS;
    expect(overCap && problemBody(overCap)).toMatch(
      /asked for 0\.80 USDC, which goes over .+ \(0\.50 USDC\)/,
    );
    expect(mismatch && problemBody(mismatch)).toContain("but the payment would have gone to");
    for (const problem of PROBLEMS) expect(problemBody(problem)).not.toMatch(/\{\w+\}/);
  });
});
