import { findings, orbityield } from "@baret/content";
import { hasValues } from "@baret/web-ui/components/CheckBlocks";
import { describe, expect, it } from "vitest";
import { format, LOSS_LIMIT, parseAmount, percent } from "../kit/amount.js";
import { VIEWS } from "./Glyph.js";
import { overLimit, poolOf, SAMPLE, sampleCheck } from "./sample.js";
import { SOURCE } from "./source.js";

describe("the amount on a demo card", () => {
  it("reads dots, commas and spaces, and refuses anything that is not positive", () => {
    expect(parseAmount("2.5")).toBe(2.5);
    expect(parseAmount(" 12,5 ")).toBe(12.5);
    for (const raw of ["", " ", "0", "-1", "abc", "1e400"]) expect(parseAmount(raw)).toBeNull();
  });

  it("prints percentages with at most one decimal", () => {
    expect(percent(60)).toBe("60%");
    expect(percent(50.4)).toBe("50.4%");
    expect(percent(LOSS_LIMIT)).toBe("50%");
  });
});

describe("OrbitYield sample", () => {
  it("passes the honest stake: Safe, MON out and the same oMON in", () => {
    expect(sampleCheck("safe", 5)).toEqual({
      source: "sample",
      verdict: "safe",
      findings: [],
      changes: [
        { direction: "out", value: "5.00", unit: "MON" },
        { direction: "in", value: "5.00", unit: "oMON" },
      ],
      approvals: [],
    });
  });

  it("marks the attack Caution: an unknown pool, MON out and nothing back", () => {
    const result = sampleCheck("danger", 5);
    expect(result.verdict).toBe("caution");
    expect(result.findings).toEqual([
      { code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract: SAMPLE.other } },
    ]);
    expect(result.changes).toEqual([{ direction: "out", value: format(5), unit: "MON" }]);
  });

  it("blocks the attack above the loss limit, with the share it would cost", () => {
    expect(overLimit("danger", 12.5)).toBe(false);
    expect(overLimit("danger", 15)).toBe(true);
    expect(overLimit("safe", 20)).toBe(false);
    const result = sampleCheck("danger", 15);
    expect(result.verdict).toBe("blocked");
    expect(result.findings.at(-1)).toEqual({
      code: "ESTIMATED_LOSS_EXCEEDS_MAX",
      values: { actual: "60%", limit: "50%" },
    });
    for (const finding of result.findings) {
      expect(hasValues(findings[finding.code].body, finding.values)).toBe(true);
    }
  });

  it("calls the pool Baret knows when honest and the other one in the attack", () => {
    expect(poolOf("safe")).toBe(SAMPLE.pool);
    expect(poolOf("danger")).toBe(SAMPLE.other);
  });

  it("answers from the sample", async () => {
    const result = await SOURCE({ mode: "danger", amount: 5 }, new AbortController().signal);
    expect(result).toEqual(sampleCheck("danger", 5));
  });
});

describe("OrbitYield pages", () => {
  it("has one page per nav item after the first, in nav order", () => {
    expect(orbityield.site.nav).toHaveLength(VIEWS.length);
    expect(orbityield.site.pages.views.map((v) => v.id)).toEqual(VIEWS.slice(1));
  });
});
