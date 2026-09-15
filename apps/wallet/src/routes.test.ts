import { checkRegistry, navRoutes } from "@baret/routes";
import { describe, expect, it } from "vitest";
import { routes } from "./routes.js";

describe("wallet registry", () => {
  it("has no duplicate, uppercase or trailing-slash paths", () => {
    expect(checkRegistry(routes)).toEqual([]);
  });

  it("lists seven screens in the sidebar", () => {
    expect(navRoutes(routes, "app").map((route) => route.label)).toEqual([
      "Home",
      "Send",
      "Receive",
      "Activity",
      "Rules",
      "Agents",
      "Settings",
    ]);
  });

  /**
   * A dApp opens these in their own window. If one of them ever inherits the
   * sidebar it becomes possible to click away from a pending request, which
   * is the one thing the wallet must never allow.
   */
  it("keeps connect and sign out of the sidebar layout", () => {
    expect(routes.connect.group).toBe("popup");
    expect(routes.sign.group).toBe("popup");
    expect(routes.connect.label).toBeUndefined();
    expect(routes.sign.label).toBeUndefined();
  });

  it("keeps onboarding out of the sidebar layout", () => {
    expect(routes.onboarding.group).toBe("setup");
    expect(routes.onboarding.hidden).toBe(true);
  });

  it("every route loads and exports a Component", async () => {
    for (const [key, route] of Object.entries(routes)) {
      const module = await route.load();
      expect(
        (module as { Component?: unknown }).Component,
        `${key} has no Component export`,
      ).toBeTypeOf("function");
    }
  });
});
