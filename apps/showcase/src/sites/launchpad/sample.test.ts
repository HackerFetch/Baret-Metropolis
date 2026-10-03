import { findings, launchpad } from "@baret/content";
import { hasValues } from "@baret/web-ui/components/CheckBlocks";
import { describe, expect, it } from "vitest";
import { VIEWS } from "./Glyph.js";
import { limitOf, SAMPLE, saleOf, sampleCheck, tokensFor } from "./sample.js";
import { SOURCE } from "./source.js";

describe("LaunchPad contribution", () => {
  it("buys LNTL at 0.001 MON each, grouped", () => {
    expect(tokensFor(0.5)).toBe("500");
    expect(tokensFor(1)).toBe("1,000");
    expect(tokensFor(0.01)).toBe("10");
  });

  it("keeps a contribution between the sale's minimum and maximum", () => {
    expect(limitOf(0.005)).toBe("tooLow");
    expect(limitOf(1.5)).toBe("tooHigh");
    expect(limitOf(SAMPLE.min)).toBeNull();
    expect(limitOf(SAMPLE.max)).toBeNull();
  });
});

describe("LaunchPad sample", () => {
  it("passes the honest sale: Safe, MON out and LNTL in", () => {
    expect(sampleCheck("safe", 0.5)).toEqual({
      source: "sample",
      verdict: "safe",
      findings: [],
      changes: [
        { direction: "out", value: "0.50", unit: "MON" },
        { direction: "in", value: "500", unit: "LNTL" },
      ],
      approvals: [],
    });
  });

  it("marks the attack Caution: borrowed code in a sale Baret does not know, LNTL still in", () => {
    const result = sampleCheck("danger", 0.5);
    expect(result.verdict).toBe("caution");
    expect(result.findings.map((f) => f.code)).toEqual([
      "DELEGATECALL_DETECTED",
      "UNKNOWN_CONTRACT_EXPOSURE",
    ]);
    for (const finding of result.findings) {
      expect(hasValues(findings[finding.code].body, finding.values)).toBe(true);
    }
    expect(result.changes).toEqual(sampleCheck("safe", 0.5).changes);
  });

  it("pays the plain sale when honest and the proxy in the attack", () => {
    expect(saleOf("safe")).toBe(SAMPLE.sale);
    expect(saleOf("danger")).toBe(SAMPLE.proxy);
  });

  it("answers from the sample", async () => {
    const result = await SOURCE({ mode: "danger", amount: 1 }, new AbortController().signal);
    expect(result).toEqual(sampleCheck("danger", 1));
  });
});

describe("LaunchPad pages", () => {
  it("has one page per nav item after the first, in nav order", () => {
    expect(launchpad.site.nav).toHaveLength(VIEWS.length);
    expect(launchpad.site.pages.views.map((v) => v.id)).toEqual(VIEWS.slice(1));
  });

  it("splits the supply into shares that add up to 100", () => {
    const tokenomics = launchpad.site.pages.views.find((v) => v.id === "tokenomics");
    const total =
      tokenomics?.kind === "shares" ? tokenomics.items.reduce((sum, i) => sum + i.value, 0) : 0;
    expect(total).toBe(100);
  });
});
