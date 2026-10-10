import { describe, expect, it } from "vitest";
import { PAGE_CHANNEL, parsePageRequest, READ_METHODS, siteOf } from "./protocol.js";

const good = { channel: PAGE_CHANNEL, dir: "request", id: "abc123", method: "eth_chainId" };

describe("a page's request", () => {
  it("is read when it is exactly one", () => {
    expect(parsePageRequest(good)).toEqual({ ...good, params: [] });
    expect(parsePageRequest({ ...good, params: [{ to: "0x1" }] })?.params).toEqual([{ to: "0x1" }]);
  });

  it("is ignored when anything about it is off", () => {
    expect(parsePageRequest(null)).toBeNull();
    expect(parsePageRequest("eth_chainId")).toBeNull();
    expect(parsePageRequest({ ...good, channel: "other" })).toBeNull();
    expect(parsePageRequest({ ...good, dir: "response" })).toBeNull();
    expect(parsePageRequest({ ...good, id: "" })).toBeNull();
    expect(parsePageRequest({ ...good, id: "has space" })).toBeNull();
    expect(parsePageRequest({ ...good, id: "x".repeat(65) })).toBeNull();
    expect(parsePageRequest({ ...good, method: "" })).toBeNull();
    expect(parsePageRequest({ ...good, method: 7 })).toBeNull();
    expect(parsePageRequest({ ...good, params: { to: "0x1" } })).toBeNull();
  });

  it("carries nothing a page says about who it is", () => {
    const parsed = parsePageRequest({ ...good, origin: "https://bank.example", tabId: 1 });
    expect(parsed && Object.keys(parsed).sort()).toEqual([
      "channel",
      "dir",
      "id",
      "method",
      "params",
    ]);
  });
});

describe("what the wallet passes to the node unasked", () => {
  it("is reads only: nothing that signs, sends or changes an account", () => {
    for (const method of READ_METHODS)
      expect(method).toMatch(/^eth_(get|call|block|gas|estimate|fee|max)/);
    for (const method of [
      "eth_sendTransaction",
      "eth_sendRawTransaction",
      "eth_sign",
      "personal_sign",
    ]) {
      expect(READ_METHODS.has(method)).toBe(false);
    }
  });
});

describe("a site's name", () => {
  it("is its origin without the scheme, as the sites list keeps it", () => {
    expect(siteOf("https://novaswap.example")).toBe("novaswap.example");
    expect(siteOf("http://localhost:5173")).toBe("localhost:5173");
  });
});
