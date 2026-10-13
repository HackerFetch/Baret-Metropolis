import { describe, expect, it } from "vitest";
import { now } from "./derive.js";
import { SAMPLE_NOW } from "./sample.js";

describe("now on a live page", () => {
  it("reads the real clock when the page runs inside the installed extension", () => {
    const g = globalThis as { chrome?: unknown };
    const before = g.chrome;
    g.chrome = { runtime: { id: "test-extension-id" } };
    try {
      const at = Date.parse(now());
      expect(Math.abs(at - Date.now())).toBeLessThan(5_000);
    } finally {
      g.chrome = before;
    }
  });

  it("keeps the sample's fixed present elsewhere", () => {
    expect(now()).toBe(SAMPLE_NOW);
  });
});
