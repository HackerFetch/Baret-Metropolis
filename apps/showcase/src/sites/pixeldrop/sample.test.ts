import { findings, pixeldrop } from "@baret/content";
import { hasValues } from "@baret/web-ui/components/CheckBlocks";
import { fill } from "@baret/web-ui/lib/util";
import { describe, expect, it } from "vitest";
import { VIEWS } from "./Glyph.js";
import { PIECE, parseQuantity, priceOf, SAMPLE, sampleCheck } from "./sample.js";
import { SOURCE } from "./source.js";

describe("PixelDrop quantity", () => {
  it("takes whole numbers from 1 up and refuses anything else", () => {
    expect(parseQuantity("3")).toBe(3);
    expect(parseQuantity(" 10 ")).toBe(10);
    for (const raw of ["", "0", "-1", "1.5", "two", "1e3"]) expect(parseQuantity(raw)).toBeNull();
  });

  it("prices pieces at 0.01 MON each, to the hundredth", () => {
    expect(priceOf(1)).toBe("0.01");
    expect(priceOf(7)).toBe("0.07");
    expect(priceOf(SAMPLE.perWallet)).toBe("0.10");
  });
});

describe("PixelDrop sample", () => {
  it("passes the honest mint: Safe, the price out and the pieces in", () => {
    expect(sampleCheck("safe", 3)).toEqual({
      source: "sample",
      verdict: "safe",
      findings: [],
      changes: [
        { direction: "out", value: "0.03", unit: "MON" },
        { direction: "in", value: "3", unit: PIECE },
      ],
      approvals: [],
    });
  });

  it("blocks the attack twice and shows the grant over the whole collection", () => {
    const result = sampleCheck("danger", 3);
    expect(result.verdict).toBe("blocked");
    expect(result.findings.map((f) => f.code)).toEqual([
      "NFT_OPERATOR_GRANTED",
      "KNOWN_MALICIOUS_ADDRESS",
    ]);
    for (const finding of result.findings) {
      expect(hasValues(findings[finding.code].body, finding.values)).toBe(true);
    }
    expect(result.changes).toEqual([]);
    expect(result.approvals).toEqual([
      { unit: PIECE, spender: SAMPLE.operator, unlimited: true, amount: null },
    ]);
  });

  it("answers from the sample", async () => {
    const result = await SOURCE({ mode: "safe", count: 2 }, new AbortController().signal);
    expect(result).toEqual(sampleCheck("safe", 2));
  });
});

describe("PixelDrop copy", () => {
  it("asks for several pieces in the plural, with nothing left unfilled", () => {
    const { many } = pixeldrop.analysis.modes.safe;
    const values = { contract: SAMPLE.collection, count: "3", price: priceOf(3) };
    expect(fill(many.asks, values)).not.toMatch(/\{\w+\}/);
    expect(fill(many.expectedBody, values)).toBe(
      "No rule should fire. The simulation should show 0.03 MON out and 3 pieces in.",
    );
    expect(fill(many.call, values)).toBe("mint(3)");
  });

  it("has one page per nav item after the first, in nav order", () => {
    expect(pixeldrop.site.nav).toHaveLength(VIEWS.length);
    expect(pixeldrop.site.pages.views.map((v) => v.id)).toEqual(VIEWS.slice(1));
  });
});
