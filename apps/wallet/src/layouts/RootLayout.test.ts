import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";
import { routeObjects } from "../routeTree.js";
import { isNotFound } from "./AppLayout.js";
import { routeFlags } from "./RootLayout.js";

/** The flags the gate sees for a URL, from what the router itself matches. */
function flagsAt(path: string) {
  const matches = matchRoutes(routeObjects, path) ?? [];
  return routeFlags(matches.map((match) => ({ handle: match.route.handle })));
}

describe("the lock gate's request windows", () => {
  // The router matches case-insensitively and decodes escapes, so every one
  // of these renders a request window and must be gated while locked.
  it.each(["/sign", "/Sign", "/SIGN/", "/%73ign", "/connect", "/Connect"])(
    "%s is a request window",
    (path) => {
      expect(flagsAt(path).request).toBe(true);
    },
  );

  it.each(["/", "/send", "/history", "/onboarding", "/nope"])("%s is not", (path) => {
    expect(flagsAt(path).request).toBe(false);
  });
});

describe("the catch-all", () => {
  /** Whether AppLayout sees the 404 at a URL, from the router's own match. */
  const lostAt = (path: string) =>
    isNotFound((matchRoutes(routeObjects, path) ?? []).map((match) => match.route));

  // A new visitor at an unknown path gets the 404, not a redirect to setup.
  it.each(["/nope", "/send/extra", "/agents/x/y"])("%s is the 404", (path) => {
    expect(lostAt(path)).toBe(true);
  });

  it.each(["/", "/send", "/agents", "/onboarding", "/sign"])("%s is not", (path) => {
    expect(lostAt(path)).toBe(false);
  });
});
