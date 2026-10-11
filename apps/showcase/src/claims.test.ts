import * as content from "@baret/content";
import { describe, expect, it } from "vitest";

/**
 * Claims the pages must not make. The extension is a real wallet since D-040,
 * and its alerts are not live. Scrybe settles a real x402 payment since D-046,
 * but the API still charges nothing per check.
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

  it("Scrybe makes a real payment, so its strip does not call it a simulation", () => {
    const strip = JSON.stringify(content.scrybe.frame);
    expect(strip).not.toMatch(/simulat/i);
    expect(content.scrybe.frame.notice).toMatch(/test USDC/);
  });

  it("Scrybe's unreachable line never says Baret checked or blocked the payment", () => {
    const line = content.scrybe.pay.errors.unreachable;
    expect(line).toMatch(/did not finish/);
    expect(line).toMatch(/Nothing was paid/);
    expect(line).not.toMatch(/block|checked/i);
    expect(content.scrybe.pay.errors.blocked).not.toMatch(/checked/i);
  });

  it("the demo panel's failed line holds for a 429 too", () => {
    expect(content.hub.frame.panel.failed.body).toContain("busy or out of reach");
  });
});
