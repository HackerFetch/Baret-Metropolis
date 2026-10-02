import { describe, expect, it } from "vitest";
import { routes } from "../routes.js";
import { headFor } from "./RootLayout.js";

/**
 * The built site is served from dist/<route>/index.html, so a static host
 * answers "/agents/" as often as "/agents". Both must get the same head.
 */
describe("headFor", () => {
  it("drops a trailing slash before the title lookup", () => {
    expect(headFor("/agents/").title).toBe(routes.agents.title);
    expect(headFor("/agents/").path).toBe("/agents");
    expect(headFor("/docs//").title).toBe(routes.docs.title);
  });

  it("keeps the demo sites noindex with or without the slash", () => {
    for (const path of ["/scrybe", "/scrybe/", "/novaswap/"]) {
      const head = headFor(path);
      expect(head.demo, path).toBe(true);
      expect(head.noindex, path).toBe(true);
    }
  });

  it("marks an unknown URL noindex and leaves real pages indexable", () => {
    expect(headFor("/does-not-exist").noindex).toBe(true);
    expect(headFor("/does-not-exist").title).toBe(routes.notFound.title);
    expect(headFor("/").noindex).toBe(false);
    expect(headFor("/agents/").noindex).toBe(false);
  });
});
