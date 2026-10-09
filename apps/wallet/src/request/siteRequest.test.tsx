import { WINDOW_CHANNEL } from "@baret/wallet-core/window";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteRequestProvider, type SiteRequestValue, useSiteRequest } from "./siteRequest.js";

// Live: the provider serves a site only when the wallet is live.
vi.mock("../live/live.js", () => ({ useLive: () => ({}) }));

const SITE = "https://novaswap.example";
const CONNECT = { channel: WINDOW_CHANNEL, type: "connect", id: "req-1" };
const SIGN = {
  channel: WINDOW_CHANNEL,
  type: "sign",
  id: "req-2",
  chainId: 10143,
  call: { to: `0x${"11".repeat(20)}`, value: "0", data: "0x" },
};

let opener: { postMessage: ReturnType<typeof vi.fn> };
let seen: SiteRequestValue;

function Probe(): null {
  seen = useSiteRequest();
  return null;
}

function mount(kind: "connect" | "sign" | null = "connect") {
  return render(
    <SiteRequestProvider kind={kind}>
      <Probe />
    </SiteRequestProvider>,
  );
}

/** A message as the browser delivers it: the sender's window and its origin. */
function deliver(data: unknown, source: unknown = opener, origin = SITE): void {
  const event = new MessageEvent("message", { data, origin });
  Object.defineProperty(event, "source", { value: source });
  act(() => {
    window.dispatchEvent(event);
  });
}

beforeEach(() => {
  opener = { postMessage: vi.fn() };
  Object.defineProperty(window, "opener", { value: opener, configurable: true });
});

afterEach(() => {
  Object.defineProperty(window, "opener", { value: null, configurable: true });
});

describe("a site's request in a request window", () => {
  it('says "ready" to the opener, with nothing in it', () => {
    mount();
    expect(opener.postMessage).toHaveBeenCalledWith(
      { channel: WINDOW_CHANNEL, type: "ready" },
      "*",
    );
    expect(seen.site).toBe(true);
    expect(seen.request).toBeNull();
  });

  it("keeps a valid request from the opener, with the origin the browser reports", () => {
    mount();
    deliver(CONNECT);
    expect(seen.request).toEqual(CONNECT);
    expect(seen.origin).toBe(SITE);
  });

  it("ignores a message from another window", () => {
    mount();
    deliver(CONNECT, { postMessage: vi.fn() });
    deliver(CONNECT, null);
    expect(seen.request).toBeNull();
  });

  it("ignores a message with a bad shape or another route's type", () => {
    mount();
    deliver({ ...CONNECT, extra: true });
    deliver({ ...CONNECT, channel: "other" });
    deliver(SIGN);
    deliver("connect");
    expect(seen.request).toBeNull();
  });

  it("ignores an opaque origin", () => {
    mount();
    deliver(CONNECT, opener, "null");
    expect(seen.request).toBeNull();
  });

  it("keeps the first request and ignores the second", () => {
    mount("sign");
    deliver(SIGN);
    deliver({ ...SIGN, id: "req-3" }, opener, "https://evil.example");
    expect(seen.request?.id).toBe("req-2");
    expect(seen.origin).toBe(SITE);
  });

  it("replies once, to the recorded origin, with the request's own id", () => {
    mount();
    deliver(CONNECT);
    const address = `0x${"22".repeat(20)}` as const;
    act(() => seen.reply({ type: "connected", id: "forged", address }));
    act(() => seen.reply({ type: "connected", id: "req-1", address }));
    expect(opener.postMessage).toHaveBeenLastCalledWith(
      { channel: WINDOW_CHANNEL, type: "connected", id: "req-1", address },
      SITE,
    );
    // "ready", then the one answer.
    expect(opener.postMessage).toHaveBeenCalledTimes(2);
    expect(seen.answered).toBe(true);
  });

  it("does not reply before a request is in", () => {
    mount();
    act(() =>
      seen.reply({ type: "refused", id: "x", reason: "declined", address: null, findings: [] }),
    );
    expect(opener.postMessage).toHaveBeenCalledTimes(1);
    expect(seen.answered).toBe(false);
  });

  it("serves no site with no opener or outside a request window", () => {
    Object.defineProperty(window, "opener", { value: null, configurable: true });
    mount();
    expect(seen.site).toBe(false);
    Object.defineProperty(window, "opener", { value: opener, configurable: true });
    mount(null);
    expect(seen.site).toBe(false);
    expect(opener.postMessage).not.toHaveBeenCalled();
  });
});
