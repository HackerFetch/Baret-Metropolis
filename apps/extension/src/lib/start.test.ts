import { describe, expect, it } from "vitest";
import { readStart, scenarioQuery } from "./start.js";

describe("the reachability preview", () => {
  it("answers by default", () => {
    expect(readStart("").reachable).toBe(true);
    expect(readStart("?sample=empty").reachable).toBe(true);
  });

  it("reads offline as unreachable and loading as unknown", () => {
    expect(readStart("?offline=1").reachable).toBe(false);
    expect(readStart("?sample=loading").reachable).toBeNull();
    // Loading is a preview of the full wallet, not a new one.
    expect(readStart("?sample=loading").scenario).toBe("full");
  });

  it("keeps the empty wallet alongside offline", () => {
    expect(readStart("?sample=empty&offline=1")).toMatchObject({
      scenario: "empty",
      reachable: false,
    });
  });

  it("ignores any other offline value", () => {
    expect(readStart("?offline=0").reachable).toBe(true);
    expect(readStart("?offline=yes").reachable).toBe(true);
  });
});

describe("the query carried to the other page", () => {
  it("is empty for the full wallet that answers", () => {
    expect(scenarioQuery("full")).toBe("");
    expect(scenarioQuery("full", true)).toBe("");
  });

  it("carries the scenario and the preview", () => {
    expect(scenarioQuery("empty")).toBe("?sample=empty");
    expect(scenarioQuery("full", false)).toBe("?offline=1");
    expect(scenarioQuery("full", null)).toBe("?sample=loading");
    expect(scenarioQuery("empty", false)).toBe("?sample=empty&offline=1");
  });

  it("round-trips through readStart", () => {
    for (const [scenario, reachable] of [
      ["full", true],
      ["full", false],
      ["full", null],
      ["empty", true],
      ["empty", false],
    ] as const) {
      expect(readStart(scenarioQuery(scenario, reachable))).toMatchObject({ scenario, reachable });
    }
  });
});
