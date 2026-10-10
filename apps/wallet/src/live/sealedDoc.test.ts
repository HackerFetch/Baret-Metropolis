import { describe, expect, it } from "vitest";
import { parseSealed, sealedText } from "./sealedDoc.js";
import type { StoredRules } from "./storage.js";

const rules = {
  policy: { blockUnlimitedApprovals: true, maxLossPercent: 10 },
  template: "strict",
} as unknown as StoredRules;
const A = `0x${"a".repeat(40)}`;
const B = `0x${"b".repeat(40)}`;

describe("the sealed document", () => {
  it("reads back what was written", () => {
    const text = sealedText({ rules, merchants: { [A]: "Scrybe" }, name: "Main" });
    expect(parseSealed(text)).toEqual({ v: 1, rules, merchants: { [A]: "Scrybe" }, name: "Main" });
  });

  it("writes the same settings as the same text, whatever order they were added in", () => {
    const one = sealedText({ rules, merchants: { [A]: "One", [B]: "Two" }, name: "Main" });
    const two = sealedText({ rules, merchants: { [B]: "Two", [A]: "One" }, name: "Main" });
    expect(one).toBe(two);
    expect(sealedText({ rules, merchants: { [A]: "Other" }, name: "Main" })).not.toBe(one);
  });

  it("is null for anything that is not one", () => {
    const good = JSON.parse(sealedText({ rules, merchants: { [A]: "Scrybe" }, name: "Main" }));
    const bad = (over: Record<string, unknown>) =>
      parseSealed(JSON.stringify({ ...good, ...over }));
    expect(parseSealed("not json")).toBeNull();
    expect(parseSealed("[]")).toBeNull();
    expect(parseSealed("null")).toBeNull();
    expect(bad({ v: 2 })).toBeNull();
    expect(bad({ name: 7 })).toBeNull();
    expect(bad({ name: "x".repeat(81) })).toBeNull();
    expect(bad({ rules: null })).toBeNull();
    expect(bad({ rules: { policy: [], template: "strict" } })).toBeNull();
    expect(bad({ rules: { policy: {}, template: "loose" } })).toBeNull();
    expect(bad({ merchants: [] })).toBeNull();
    expect(bad({ merchants: { "0xABC": "x" } })).toBeNull();
    expect(bad({ merchants: { [A.toUpperCase()]: "x" } })).toBeNull();
    expect(bad({ merchants: { [A]: 5 } })).toBeNull();
    const many = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`0x${i.toString(16).padStart(40, "0")}`, "m"]),
    );
    expect(bad({ merchants: many })).toBeNull();
  });
});
