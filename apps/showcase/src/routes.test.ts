import * as content from "@baret/content";
import { buildHref, checkRegistry, findBrokenHrefs, navRoutes } from "@baret/routes";
import { describe, expect, it } from "vitest";
import { DEMO_PATHS, routes } from "./routes.js";

/**
 * Route tests for the showcase.
 *
 * These exist because the three failure modes they cover are all silent. A
 * duplicate path shadows a page and nobody notices until someone opens it. A
 * link written in the copy points at a route that was renamed, and it 404s for
 * a visitor rather than for us. A page module fails to import, and the only
 * symptom is a blank screen behind an error boundary.
 */

describe("registry", () => {
  it("has no duplicate, uppercase or trailing-slash paths", () => {
    expect(checkRegistry(routes)).toEqual([]);
  });

  it("gives every route a title", () => {
    for (const [key, route] of Object.entries(routes)) {
      expect(route.title, `${key} has no title`).not.toBe("");
    }
  });

  it("puts the five marketing pages in the header nav", () => {
    expect(navRoutes(routes, "marketing").map((route) => route.label)).toEqual([
      "Showcase",
      "Agents",
      "Docs",
      "Install",
    ]);
  });

  it("knows all six demo paths", () => {
    expect(DEMO_PATHS.size).toBe(6);
    expect(DEMO_PATHS.has("/scrybe")).toBe(true);
    expect(DEMO_PATHS.has("/showcase")).toBe(false);
  });
});

describe("links in the copy", () => {
  /**
   * The content package holds hrefs as plain strings, because it must not
   * depend on a router. This is the check that keeps them honest.
   */
  it("point at routes that exist", () => {
    const showcaseCopy = {
      home: content.home,
      hub: content.hub,
      agents: content.agents,
      docs: content.docs,
      install: content.install,
      common: content.common,
    };

    // Nine internal links live in the copy today, including anchors such as
    // /docs#contracts. The check strips the anchor and resolves the path.
    expect(findBrokenHrefs(routes, showcaseCopy)).toEqual([]);
  });
});

describe("buildHref", () => {
  it("returns the declared path", () => {
    expect(buildHref(routes, "install")).toBe("/install");
  });

  it("appends a query string when given one", () => {
    expect(buildHref(routes, "showcase", undefined, { filter: "drainer" })).toBe(
      "/showcase?filter=drainer",
    );
  });
});

describe("page modules", () => {
  it("every route loads", async () => {
    for (const [key, route] of Object.entries(routes)) {
      const module = await route.load();
      expect(module, `${key} exported nothing`).toBeTruthy();
      expect(
        (module as { Component?: unknown }).Component,
        `${key} has no Component export, so the router cannot render it`,
      ).toBeTypeOf("function");
    }
  });
});
