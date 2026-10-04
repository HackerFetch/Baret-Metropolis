import { fromTemplate } from "@baret/wallet-ui/data/rules";
import { describe, expect, it } from "vitest";
import { checkJson, direction } from "./rules.js";

const balanced = fromTemplate("balanced", []);

describe("which way a change goes", () => {
  it("reads a blocking switch turned on as stricter, and warnings let through as looser", () => {
    expect(direction("blockPermit", false, true)).toBe("stricter");
    expect(direction("blockPermit", true, false)).toBe("looser");
    expect(direction("allowWarnings", false, true)).toBe("looser");
    expect(direction("requireMemo", false, true)).toBe("stricter");
  });

  it("reads a lower max and a higher min as stricter", () => {
    expect(direction("maxLossPercent", 50, 20)).toBe("stricter");
    expect(direction("maxDailyCap", "5.00", "10.00")).toBe("looser");
    expect(direction("minPostNativeBalance", "0.1", "0.5")).toBe("stricter");
    expect(direction("minNansenTrustLevel", "new", "identified")).toBe("stricter");
  });

  it("reads a limit set where there was none as stricter, and removing it as looser", () => {
    expect(direction("maxGas", null, 500000)).toBe("stricter");
    expect(direction("maxGas", 500000, null)).toBe("looser");
  });

  it("gives a list or an unchanged value no direction", () => {
    expect(direction("allowedCountries", [], ["TR"])).toBeNull();
    expect(direction("maxLossPercent", 20, 20)).toBeNull();
  });
});

describe("rules typed as JSON", () => {
  it("returns the rule set when every field is there and the right kind", () => {
    const result = checkJson(JSON.stringify(balanced));
    expect(result.ok).toBe(true);
  });

  it("names the line of a syntax error", () => {
    const result = checkJson('{\n  "blockPermit": true,\n  oops\n}');
    expect(result).toMatchObject({ ok: false, issue: { kind: "syntax", line: 3 } });
  });

  it("names a key Baret does not know", () => {
    const result = checkJson(JSON.stringify({ ...balanced, blockEverything: true }));
    expect(result).toMatchObject({
      ok: false,
      issue: { kind: "unknownKey", key: "blockEverything" },
    });
  });

  it("names a missing key", () => {
    const { blockPermit: _, ...rest } = balanced;
    expect(checkJson(JSON.stringify(rest))).toMatchObject({
      ok: false,
      issue: { kind: "missingKey", key: "blockPermit" },
    });
  });

  it("names a value of the wrong kind and what it must be", () => {
    expect(checkJson(JSON.stringify({ ...balanced, blockPermit: "yes" }))).toMatchObject({
      ok: false,
      issue: { kind: "invalidValue", key: "blockPermit", expected: "switch" },
    });
    expect(checkJson(JSON.stringify({ ...balanced, minNansenTrustLevel: "famous" }))).toMatchObject(
      {
        ok: false,
        issue: { kind: "invalidValue", key: "minNansenTrustLevel", expected: "level" },
      },
    );
  });
});
