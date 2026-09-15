import { checkRegistry, matchesPattern, navRoutes } from "@baret/routes";
import { describe, expect, it } from "vitest";
import { OPTIONS_LINKS } from "../popup/navigation.js";
import { routes } from "./routes.js";

describe("options registry", () => {
  it("has no duplicate, uppercase or trailing-slash paths", () => {
    expect(checkRegistry(routes)).toEqual([]);
  });

  it("lists seven pages in the sidebar", () => {
    expect(navRoutes(routes, "main").map((route) => route.label)).toEqual([
      "Overview",
      "Activity",
      "Permissions",
      "Rules",
      "Payments",
      "Sites",
      "Settings",
    ]);
  });

  it("keeps onboarding outside the sidebar", () => {
    expect(routes.onboarding.group).toBe("setup");
  });

  /**
   * The popup is too small for the rule editor, the payments dashboard and the
   * per-site detail, so it links out. If a path here is renamed without the
   * link being updated, the popup opens a 404 and the only symptom is a
   * confused user, so this is the check that catches it.
   */
  it("serves every deep link the popup points at", () => {
    const patterns = Object.values(routes).map((route) => route.path);

    for (const [name, link] of Object.entries(OPTIONS_LINKS)) {
      const path = link.replace("options.html#", "");
      const served = patterns.some((pattern) => matchesPattern(pattern, path));
      expect(served, `the popup links to ${path} (${name}) and no route serves it`).toBe(true);
    }
  });

  it("matches a site detail path with its parameter", () => {
    expect(matchesPattern(routes.siteDetail.path, "/sites/example.com")).toBe(true);
    expect(matchesPattern(routes.siteDetail.path, "/sites")).toBe(false);
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
