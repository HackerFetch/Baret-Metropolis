import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";
import { routeObjects } from "../routeTree.js";
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
