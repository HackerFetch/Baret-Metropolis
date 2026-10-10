import * as content from "@baret/content";
import { describe, expect, it } from "vitest";

/**
 * G-02, option (a), decided 2026-10-10: the web wallet is the working
 * product, so it is the first button everywhere, the header included, and
 * the demo is the second. The extension is a preview on sample data and
 * appears only on /install.
 */
const WALLET = "https://baret-wallet.vercel.app";

describe("calls to action", () => {
  const pairs = {
    "the landing hero": content.home.hero.actions,
    "the landing close": content.home.cta.actions,
    "the showcase hero": content.hub.hero.actions,
    "the showcase close": content.hub.cta.actions,
    "the docs close": content.docs.cta.actions,
  };

  it.each(Object.entries(pairs))("%s: the web wallet first, the demo second", (_, actions) => {
    expect(actions.primary.href).toBe(WALLET);
    expect(actions.secondary.href).toBe("/novaswap");
  });

  it("the header action is the web wallet", () => {
    expect(content.common.nav.cta.href).toBe(WALLET);
  });

  it("no page calls the extension preview a working wallet", () => {
    const copy = JSON.stringify({
      home: content.home,
      hub: content.hub,
      docs: content.docs,
      install: content.install,
      common: content.common,
    });
    expect(copy).not.toMatch(/Install the extension/);
    expect(copy).not.toMatch(/a Monad wallet that simulates/);
    expect(copy).not.toMatch(/beside the wallets you already use/);
    expect(copy).not.toMatch(/keeps its key encrypted/);
    expect(copy).not.toMatch(/Back up your recovery phrase/);
    expect(copy).not.toMatch(/pay per check/);
  });
});
