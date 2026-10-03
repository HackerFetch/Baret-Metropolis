// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WALLET_VERSION } from "./version.js";

describe("the wallet version", () => {
  it("matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as {
      version: string;
    };
    expect(WALLET_VERSION).toBe(pkg.version);
  });
});
