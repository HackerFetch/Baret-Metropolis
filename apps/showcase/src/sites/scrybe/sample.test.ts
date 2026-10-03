import { findings, scrybe } from "@baret/content";
import { hasValues } from "@baret/web-ui/components/CheckBlocks";
import { describe, expect, it } from "vitest";
import { VIEWS } from "./Glyph.js";
import { CAPS, runOf, SAMPLE, sampleCheck, usdc } from "./sample.js";
import { SOURCE } from "./source.js";

describe("Scrybe amounts", () => {
  it("prints base units as USDC with two decimals", () => {
    expect(usdc(50_000n)).toBe("0.05");
    expect(usdc(250_000n)).toBe("0.25");
    expect(usdc(1_500_000n)).toBe("1.50");
    expect(usdc(0n)).toBe("0.00");
  });
});

describe("the agent loop", () => {
  it("pays while the hour stays inside the cap and stops the first payment that would cross it", () => {
    const counts = CAPS.map((cap) => runOf(cap).filter((p) => p.paid).length);
    expect(counts).toEqual([3, 5, 10]);
    for (const cap of CAPS) {
      const run = runOf(cap);
      const stopped = run.at(-1);
      expect(stopped?.paid).toBe(false);
      expect(run.filter((p) => !p.paid)).toHaveLength(1);
      expect(stopped && stopped.total > cap).toBe(true);
      expect(run.filter((p) => p.paid).every((p) => p.total <= cap)).toBe(true);
    }
  });

  it("counts the hour exactly, with no floating-point cents", () => {
    expect(runOf(250_000n).map((p) => usdc(p.total))).toEqual([
      "0.05",
      "0.10",
      "0.15",
      "0.20",
      "0.25",
      "0.30",
    ]);
  });
});

describe("Scrybe sample", () => {
  it("passes one answer: Safe, no findings, the price out", () => {
    expect(sampleCheck("safe", 250_000n)).toEqual({
      source: "sample",
      verdict: "safe",
      findings: [],
      changes: [{ direction: "out", value: usdc(SAMPLE.price), unit: "USDC" }],
      approvals: [],
    });
  });

  it("blocks the loop at the hourly cap, with every value the finding's sentence needs", () => {
    const result = sampleCheck("danger", 250_000n);
    expect(result.verdict).toBe("blocked");
    expect(result.changes).toEqual([]);
    const [finding] = result.findings;
    expect(finding).toEqual({
      code: "X402_HOURLY_CAP_EXCEEDED",
      values: { amount: "0.05 USDC", actual: "0.30 USDC", cap: "0.25 USDC" },
    });
    if (finding) expect(hasValues(findings[finding.code].body, finding.values)).toBe(true);
  });

  it("answers from the sample and never fails closed on its own", async () => {
    const result = await SOURCE({ mode: "danger", cap: 150_000n }, new AbortController().signal);
    expect(result).toEqual(sampleCheck("danger", 150_000n));
  });
});

describe("Scrybe pages", () => {
  it("has one page per nav item after the first, in nav order", () => {
    expect(scrybe.site.nav).toHaveLength(VIEWS.length);
    expect(scrybe.site.pages.views.map((v) => v.id)).toEqual(VIEWS.slice(1));
  });
});
