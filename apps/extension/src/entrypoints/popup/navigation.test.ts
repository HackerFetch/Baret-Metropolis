import { describe, expect, it } from "vitest";
import {
  INITIAL_STATE,
  isRequestPhase,
  OPTIONS_LINKS,
  type PopupState,
  reducePopup,
  showsChrome,
  TABS,
} from "./navigation.js";

/**
 * The popup navigation rules.
 *
 * These are the tests that matter most in the whole extension, because the
 * thing they protect is the product's one promise: while a signature is being
 * decided, the popup shows the signature and nothing else. Every other screen
 * can be wrong and be fixed later. This one being wrong means a user approves
 * something while looking at something else.
 */

const ready: PopupState = { phase: "ready", tab: "home", overlay: null };

describe("chrome visibility", () => {
  it("hides the tab bar during a request", () => {
    expect(showsChrome("signing")).toBe(false);
    expect(showsChrome("connecting")).toBe(false);
  });

  it("hides the tab bar before setup and while locked", () => {
    expect(showsChrome("uninitialized")).toBe(false);
    expect(showsChrome("locked")).toBe(false);
  });

  it("shows the tab bar when the wallet is usable", () => {
    expect(showsChrome("ready")).toBe(true);
    expect(showsChrome("alert")).toBe(true);
  });
});

describe("entering a request phase", () => {
  it("closes an open overlay", () => {
    const sending: PopupState = { ...ready, overlay: "send" };
    const next = reducePopup(sending, { type: "phase", phase: "signing" });

    expect(next.overlay).toBeNull();
    expect(next.phase).toBe("signing");
  });

  it("closes an overlay when a connection request arrives too", () => {
    const receiving: PopupState = { ...ready, overlay: "receive" };
    expect(reducePopup(receiving, { type: "phase", phase: "connecting" }).overlay).toBeNull();
  });

  it("leaves the overlay alone for a phase that is not a request", () => {
    const sending: PopupState = { ...ready, overlay: "send" };
    expect(reducePopup(sending, { type: "phase", phase: "alert" }).overlay).toBe("send");
  });
});

describe("while a request is pending", () => {
  const signing: PopupState = { phase: "signing", tab: "home", overlay: null };

  it("ignores a tab change", () => {
    expect(reducePopup(signing, { type: "tab", tab: "settings" })).toEqual(signing);
  });

  it("ignores an attempt to open an overlay", () => {
    expect(reducePopup(signing, { type: "overlay", overlay: "send" })).toEqual(signing);
  });

  it("still allows the phase to change, which is how a request resolves", () => {
    expect(reducePopup(signing, { type: "phase", phase: "ready" }).phase).toBe("ready");
  });
});

describe("normal navigation", () => {
  it("switches tabs", () => {
    expect(reducePopup(ready, { type: "tab", tab: "allowances" }).tab).toBe("allowances");
  });

  it("closes an overlay when the tab changes", () => {
    const sending: PopupState = { ...ready, overlay: "send" };
    expect(reducePopup(sending, { type: "tab", tab: "activity" }).overlay).toBeNull();
  });

  it("starts on home with nothing open", () => {
    expect(INITIAL_STATE).toEqual({ phase: "uninitialized", tab: "home", overlay: null });
  });
});

describe("deep links into the options page", () => {
  /**
   * These are hash links on purpose. An extension page has no server to
   * rewrite a path, so options.html/rules would 404 after a reload while
   * options.html#/rules survives it.
   */
  it("are all hash links", () => {
    for (const [name, link] of Object.entries(OPTIONS_LINKS)) {
      expect(link, `${name} is not a hash link`).toMatch(/^options\.html#\//);
    }
  });

  it("cover every tab that has a fuller screen elsewhere", () => {
    expect(Object.keys(OPTIONS_LINKS)).toEqual(
      expect.arrayContaining(["policies", "payments", "sites", "settings"]),
    );
  });
});

describe("tabs", () => {
  it("are the four from the wallet spec, in order", () => {
    expect(TABS).toEqual(["home", "activity", "allowances", "settings"]);
  });

  it("agree with isRequestPhase about which phases are requests", () => {
    expect(isRequestPhase("signing")).toBe(true);
    expect(isRequestPhase("connecting")).toBe(true);
    expect(isRequestPhase("ready")).toBe(false);
  });
});
