/**
 * Popup navigation. Deliberately not a router.
 *
 * The popup is 360 by 600 and it has one hard rule from docs/WALLET.md
 * section 2: while a signature is being decided, nothing else is on screen.
 * No tabs, no balance, no back button. A router makes that rule easy to break,
 * because any link anywhere can navigate out of a pending request. A state
 * machine makes it impossible: in the signing phase there are no tabs to
 * render, and the only exits are approve, decline and the timeout.
 *
 * The phases come from the wallet state machine in the background. The popup
 * does not choose them; it renders whichever one it is told about. Tabs and
 * overlays are the popup's own state and reset when it closes, which is
 * correct: a popup is not a place you leave something half done.
 */

/** What the wallet is doing. Owned by the background, mirrored here. */
export type Phase = "uninitialized" | "locked" | "ready" | "signing" | "connecting" | "alert";

/** The bottom tab bar. Only ever rendered in the ready and alert phases. */
export const TABS = ["home", "activity", "allowances", "settings"] as const;
export type Tab = (typeof TABS)[number];

/** Screens that cover the tab content but keep the tab bar underneath. */
export type Overlay = "send" | "receive" | "accounts" | null;

export interface PopupState {
  readonly phase: Phase;
  readonly tab: Tab;
  readonly overlay: Overlay;
}

export const INITIAL_STATE: PopupState = {
  phase: "uninitialized",
  tab: "home",
  overlay: null,
};

export type PopupAction =
  | { type: "phase"; phase: Phase }
  | { type: "tab"; tab: Tab }
  | { type: "overlay"; overlay: Overlay };

/**
 * The transition rules, in one place so they can be read and tested.
 *
 * Two invariants the tests assert:
 *  1. Entering signing or connecting closes any overlay. A send form must not
 *     sit behind a sign request.
 *  2. Tab changes are ignored while a request is pending. The tab bar is not
 *     rendered then, but a stray message must not move it either.
 */
export function reducePopup(state: PopupState, action: PopupAction): PopupState {
  switch (action.type) {
    case "phase": {
      if (isRequestPhase(action.phase)) {
        return { ...state, phase: action.phase, overlay: null };
      }
      return { ...state, phase: action.phase };
    }
    case "tab": {
      if (isRequestPhase(state.phase)) return state;
      return { ...state, tab: action.tab, overlay: null };
    }
    case "overlay": {
      if (isRequestPhase(state.phase)) return state;
      return { ...state, overlay: action.overlay };
    }
  }
}

/** A phase where the popup is showing a decision and nothing else. */
export function isRequestPhase(phase: Phase): boolean {
  return phase === "signing" || phase === "connecting";
}

/** Whether the tab bar and the header should render at all. */
export function showsChrome(phase: Phase): boolean {
  return phase === "ready" || phase === "alert";
}

/**
 * Deep links from the popup into the options page.
 *
 * The popup is too small for the rule editor, the payments dashboard and the
 * per-site detail, so those live in the options page and the popup links out.
 * Hash routing is what makes these work after a reload.
 */
export const OPTIONS_LINKS = {
  onboarding: "options.html#/onboarding",
  home: "options.html#/",
  activity: "options.html#/activity",
  allowances: "options.html#/permissions",
  policies: "options.html#/rules",
  payments: "options.html#/payments",
  sites: "options.html#/sites",
  settings: "options.html#/settings",
} as const;

export type OptionsLink = keyof typeof OPTIONS_LINKS;

/** Opens an options page route in a tab. The popup closes as it loses focus. */
export function openOptions(link: OptionsLink): void {
  void browser.tabs.create({ url: browser.runtime.getURL(`/${OPTIONS_LINKS[link]}`) });
}
