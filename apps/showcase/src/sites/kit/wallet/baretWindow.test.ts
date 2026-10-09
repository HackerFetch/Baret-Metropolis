import { WINDOW_CHANNEL, WINDOW_NAME } from "@baret/wallet-core/window";
import { afterEach, describe, expect, it } from "vitest";
import {
  askBaret,
  focusBaretWindow,
  type Host,
  POLL_MS,
  type Popup,
  resetBaretWindowForTests,
  WALLET_URL,
} from "./baretWindow.js";

// Each test starts with no ask waiting: one request at a time is the rule.
afterEach(() => resetBaretWindowForTests());

const ORIGIN = new URL(WALLET_URL).origin;
const ADDRESS = `0x${"11".repeat(20)}` as const;
const HASH = `0x${"ab".repeat(32)}` as const;
const CALL = { to: `0x${"22".repeat(20)}`, value: "0", data: "0x095ea7b3" } as const;

class FakePopup implements Popup {
  closed = false;
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
  readonly sent: { message: unknown; origin: string }[] = [];
  postMessage(message: unknown, origin: string): void {
    this.sent.push({ message, origin });
  }
}

/** A stand-in for the page's window: one listener, one timer, a popup or a blocker. */
function fakeHost(popup: FakePopup | null) {
  let listener: ((event: MessageEvent) => void) | null = null;
  let tick: (() => void) | null = null;
  const opened: { url: string; name: string; features: string }[] = [];
  const host: Host = {
    open: (url, name, features) => {
      opened.push({ url, name, features });
      return popup;
    },
    addEventListener: (_type, fn) => {
      listener = fn;
    },
    removeEventListener: (_type, fn) => {
      if (listener === fn) listener = null;
    },
    setInterval: (fn, ms) => {
      expect(ms).toBe(POLL_MS);
      tick = fn;
      return 1;
    },
    clearInterval: () => {
      tick = null;
    },
    randomId: () => "req-1",
  };
  return {
    host,
    opened,
    send(data: unknown, source: unknown = popup, origin = ORIGIN): void {
      listener?.({ data, source, origin } as unknown as MessageEvent);
    },
    tick: () => tick?.(),
    listening: () => listener !== null,
  };
}

const ready = { channel: WINDOW_CHANNEL, type: "ready" };

describe("askBaret", () => {
  it("opens the wallet's page in its named window", () => {
    const popup = new FakePopup();
    const fake = fakeHost(popup);
    void askBaret("connect", undefined, fake.host);
    expect(fake.opened).toEqual([
      { url: `${WALLET_URL}/connect`, name: WINDOW_NAME, features: "popup,width=440,height=780" },
    ]);
  });

  it("answers ready by posting the request to the wallet's origin", () => {
    const popup = new FakePopup();
    const fake = fakeHost(popup);
    void askBaret("sign", CALL, fake.host);
    fake.send(ready);
    expect(popup.sent).toEqual([
      {
        message: { channel: WINDOW_CHANNEL, type: "sign", id: "req-1", chainId: 10143, call: CALL },
        origin: ORIGIN,
      },
    ]);
  });

  it("ignores a ready from another source or origin", () => {
    const popup = new FakePopup();
    const fake = fakeHost(popup);
    void askBaret("connect", undefined, fake.host);
    fake.send(ready, {});
    fake.send(ready, popup, "https://evil.example");
    expect(popup.sent).toEqual([]);
  });

  it("resolves on the matching answer and ignores the rest", async () => {
    const popup = new FakePopup();
    const fake = fakeHost(popup);
    const asked = askBaret("connect", undefined, fake.host);
    const answer = { channel: WINDOW_CHANNEL, type: "connected", id: "req-1", address: ADDRESS };
    fake.send(answer, {});
    fake.send(answer, popup, "https://evil.example");
    fake.send({ ...answer, id: "other" });
    fake.send({ ...answer, extra: true });
    expect(fake.listening()).toBe(true);
    fake.send(answer);
    await expect(asked).resolves.toEqual({ type: "connected", id: "req-1", address: ADDRESS });
    expect(fake.listening()).toBe(false);
  });

  it("passes a refusal with its findings, and a signature with its hash", async () => {
    const refused = fakeHost(new FakePopup());
    const no = askBaret("sign", CALL, refused.host);
    refused.send({
      channel: WINDOW_CHANNEL,
      type: "refused",
      id: "req-1",
      reason: "blocked",
      // A refusal never carries the address: the site was not given it.
      address: null,
      findings: [{ code: "UNLIMITED_APPROVAL", values: { asset: "dUSDC" } }],
    });
    await expect(no).resolves.toMatchObject({
      type: "refused",
      findings: [{ code: "UNLIMITED_APPROVAL", values: { asset: "dUSDC" } }],
    });

    const signed = fakeHost(new FakePopup());
    const yes = askBaret("sign", CALL, signed.host);
    signed.send({
      channel: WINDOW_CHANNEL,
      type: "signed",
      id: "req-1",
      address: ADDRESS,
      hash: HASH,
    });
    await expect(yes).resolves.toEqual({
      type: "signed",
      id: "req-1",
      address: ADDRESS,
      hash: HASH,
    });
  });

  it("resolves closed when the window closes before it answers", async () => {
    const popup = new FakePopup();
    const fake = fakeHost(popup);
    const asked = askBaret("connect", undefined, fake.host);
    fake.tick();
    popup.closed = true;
    fake.tick();
    await expect(asked).resolves.toEqual({ type: "closed" });
    expect(fake.listening()).toBe(false);
  });

  it("answers busy to a second ask while the first waits, and brings the window back", async () => {
    const popup = new FakePopup();
    const first = fakeHost(popup);
    void askBaret("sign", CALL, first.host);
    const second = fakeHost(new FakePopup());
    await expect(askBaret("connect", undefined, second.host)).resolves.toEqual({ type: "busy" });
    // The open window was not navigated: no second open, and it came to the front.
    expect(second.opened).toHaveLength(0);
    expect(popup.focused).toBe(1);
    expect(focusBaretWindow()).toBe(true);
    expect(popup.focused).toBe(2);
  });

  it("resolves blocked when the browser opens no window", async () => {
    const fake = fakeHost(null);
    await expect(askBaret("connect", undefined, fake.host)).resolves.toEqual({ type: "blocked" });
    expect(fake.listening()).toBe(false);
  });
});
