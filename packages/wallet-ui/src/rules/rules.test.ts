import { policy } from "@baret/content";
import { describe, expect, it } from "vitest";
import { fromTemplate } from "../data/rules.js";
import { ACTIVITY, POLICY } from "../data/sample.js";
import {
  FIELDS,
  fromJson,
  groupsOf,
  inputText,
  kindOf,
  parseInput,
  preview,
  valueText,
} from "./fields.js";

describe("the rule editor's fields", () => {
  it("covers all 25 rules, each once, in the ten groups", () => {
    expect(FIELDS).toHaveLength(25);
    const grouped = groupsOf().flatMap((entry) => entry.fields);
    expect(new Set(grouped)).toEqual(new Set(FIELDS));
    expect(groupsOf()).toHaveLength(Object.keys(policy.groups).length);
  });

  it("gives every rule the control its value needs", () => {
    for (const field of FIELDS) {
      const value = POLICY[field];
      const kind = kindOf(field);
      if (typeof value === "boolean") expect(kind).toBe("switch");
      if (Array.isArray(value)) expect(kind).toBe("list");
    }
    expect(kindOf("maxLossPercent")).toBe("number");
    expect(kindOf("maxDailyCap")).toBe("amount");
    expect(kindOf("minNansenTrustLevel")).toBe("level");
  });

  it("reads typed text: empty is no limit, a list takes a line each, junk is refused", () => {
    expect(parseInput("maxLossPercent", "")).toBeNull();
    expect(parseInput("maxLossPercent", " 25 ")).toBe(25);
    expect(parseInput("maxLossPercent", "2.5")).toBeUndefined();
    expect(parseInput("maxDailyCap", "12.5")).toBe("12.5");
    expect(parseInput("maxDailyCap", "12,5")).toBeUndefined();
    expect(parseInput("allowedCountries", "DE\nFR, TR\n")).toEqual(["DE", "FR", "TR"]);
    expect(inputText(["DE", "FR"])).toBe("DE\nFR");
  });

  it("writes values in the content's words", () => {
    expect(valueText("blockDelegatecall", true)).toBe("On");
    expect(valueText("maxLossPercent", null)).toBe("No limit");
    expect(valueText("maxLossPercent", 50)).toBe("50 percent of balance");
    expect(valueText("allowedMerchantOrigins", [])).toBe("Any site, within your caps");
    expect(valueText("allowedCountries", ["DE", "FR"])).toBe("2 countries");
    expect(valueText("minComplianceTier", null)).toBe("Any level");
    expect(valueText("minComplianceTier", 2)).toBe("Level 2 or higher");
    expect(valueText("minNansenTrustLevel", "established")).toBe(
      policy.fields.minNansenTrustLevel.options.established.label,
    );
  });

  it("accepts JSON only with all 25 rules and nothing else", () => {
    expect(fromJson(JSON.stringify(POLICY))).toEqual(POLICY);
    expect(fromJson(JSON.stringify({ ...POLICY, extra: 1 }))).toBeNull();
    const { allowWarnings: _dropped, ...partial } = POLICY;
    expect(fromJson(JSON.stringify(partial))).toBeNull();
    expect(fromJson("not json")).toBeNull();
  });
});

describe("the preview", () => {
  it("counts the recent checked requests a stricter draft would now block", () => {
    const strict = { ...POLICY, blockUnknownContractExposure: true };
    const result = preview(ACTIVITY, POLICY, strict);
    expect(result.count).toBe(
      ACTIVITY.filter((item) => item.verdict && item.verdict !== "unreachable").length,
    );
    expect(result.stricter).toBe(1);
    expect(result.looser).toBe(0);
  });

  it("counts the blocked ones a looser draft would let through", () => {
    const loose = {
      ...fromTemplate("balanced", []),
      blockUnlimitedApprovals: false,
      blockKnownMalicious: false,
    };
    expect(preview(ACTIVITY, POLICY, loose).looser).toBeGreaterThan(0);
  });
});
