import * as content from "@baret/content";
import { describe, expect, it } from "vitest";

/**
 * Claims the pages must not make. The extension is a real wallet since D-040,
 * but its x402 payments page and its alerts are not live, and nothing
 * settles an x402 payment (G-05).
 */
describe("claims", () => {
  it("no page says developers pay per check over x402", () => {
    const copy = JSON.stringify({ home: content.home, hub: content.hub, docs: content.docs });
    expect(copy).not.toMatch(/pay per check/i);
  });

  it("the install page promises no x402 payments and no alerts", () => {
    const can = content.install.trust.can.points.join(" ");
    expect(can).not.toMatch(/x402/i);
    expect(can).not.toMatch(/alert/i);
  });

  it("the demo panel's failed line holds for a 429 too", () => {
    expect(content.hub.frame.panel.failed.body).toContain("busy or out of reach");
  });
});
