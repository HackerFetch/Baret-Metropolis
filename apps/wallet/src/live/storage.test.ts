import { initialLive, reduce } from "@baret/wallet-ui/data/store";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearStored,
  isLive,
  readCredential,
  readRules,
  USDC,
  writeCredential,
  writeRules,
} from "./storage.js";

afterEach(() => window.localStorage.clear());

describe("isLive", () => {
  it("keeps the sample whenever the URL names one", () => {
    expect(isLive("?sample=empty")).toBe(false);
    expect(isLive("?sample=")).toBe(false);
  });
});

describe("what the browser keeps", () => {
  it("reads back a stored credential and nothing else", () => {
    expect(readCredential()).toBeNull();
    writeCredential({ credentialId: "abc" });
    expect(readCredential()).toEqual({ credentialId: "abc" });
    window.localStorage.setItem("baret.wallet.credential", "{not json");
    expect(readCredential()).toBeNull();
    window.localStorage.setItem("baret.wallet.credential", JSON.stringify({ credentialId: "" }));
    expect(readCredential()).toBeNull();
  });

  it("drops rules with an unknown template", () => {
    const start = initialLive("Main account", USDC);
    writeRules({ policy: start.policy, template: "balanced" });
    expect(readRules()?.template).toBe("balanced");
    window.localStorage.setItem(
      "baret.wallet.rules",
      JSON.stringify({ policy: start.policy, template: "anything" }),
    );
    expect(readRules()).toBeNull();
  });

  it("forgets everything on clear", () => {
    writeCredential({ credentialId: "abc" });
    clearStored();
    expect(readCredential()).toBeNull();
  });
});

describe("a live wallet's starting state", () => {
  it("is locked, has no account and trusts nothing it has not read", () => {
    const start = initialLive("Main account", USDC);
    expect(start.live).toBe(true);
    expect(start.locked).toBe(true);
    expect(start.address).toBe("");
    expect(start.assets).toEqual([]);
    expect(start.status).toEqual({
      analyzer: "loading",
      balances: "loading",
      activity: "loading",
      vault: "loading",
    });
    expect(start.policy.allowedAssets).toEqual([USDC]);
  });

  it("takes live data as a patch and resets to locked, not to the sample", () => {
    const start = initialLive("Main account", USDC);
    const open = reduce(start, { type: "patch", patch: { address: "0xabc", locked: false } });
    expect(open.address).toBe("0xabc");
    expect(open.live).toBe(true);
    const again = reduce(open, { type: "reset" }, (name) => initialLive(name, USDC));
    expect(again.locked).toBe(true);
    expect(again.address).toBe("");
  });
});
