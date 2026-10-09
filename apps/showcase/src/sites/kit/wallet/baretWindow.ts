import {
  parseWalletAnswer,
  type SiteRequest,
  type WalletAnswer,
  WINDOW_CHAIN_ID,
  WINDOW_CHANNEL,
  WINDOW_NAME,
  type WindowCall,
} from "@baret/wallet-core/window";

/**
 * The Baret wallet, opened in its own window. A passkey only works on the
 * domain it was made on, so the wallet never runs in a frame here: a site
 * opens it with window.open and the two talk over postMessage, with the
 * protocol in @baret/wallet-core/window (it imports nothing heavy).
 *
 * The site trusts a message only from the window it opened and from the
 * wallet's origin, parsed against the protocol's strict shapes. It sends
 * its request once the wallet says "ready", to the wallet's origin only.
 * Fail closed: a window that closes before it answers signed nothing.
 */

const envUrl: unknown = import.meta.env.VITE_BARET_WALLET_URL;

/** Where the Baret wallet lives; a developer can point it at a local wallet. */
export const WALLET_URL: string =
  typeof envUrl === "string" && envUrl !== ""
    ? envUrl.replace(/\/+$/, "")
    : "https://baret-wallet.vercel.app";

/** How often the site looks whether the wallet window is still open. */
export const POLL_MS = 500;

type Answer<T extends WalletAnswer["type"]> = Omit<Extract<WalletAnswer, { type: T }>, "channel">;

/** What one ask ended with: the wallet's answer, or why there was none. */
export type BaretAnswer =
  | Answer<"connected">
  | Answer<"signed">
  | Answer<"refused">
  /** The window closed before it answered. */
  | { readonly type: "closed" }
  /** The browser refused to open the window (a pop-up blocker). */
  | { readonly type: "blocked" }
  /** Another request is still open in the wallet window; it was brought to the front, not replaced. */
  | { readonly type: "busy" };

/** The window the site opened, as far as the site uses it. */
export interface Popup {
  readonly closed: boolean;
  postMessage(message: unknown, targetOrigin: string): void;
  focus?(): void;
}

/** The parts of the page's window an ask uses, so a test can stand in for them. */
export interface Host {
  open(url: string, name: string, features: string): Popup | null;
  addEventListener(type: "message", fn: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", fn: (event: MessageEvent) => void): void;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
  randomId(): string;
}

const browser: Host = {
  open: (url, name, features) => window.open(url, name, features),
  addEventListener: (type, fn) => window.addEventListener(type, fn),
  removeEventListener: (type, fn) => window.removeEventListener(type, fn),
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id),
  randomId: () => crypto.randomUUID(),
};

/** The ask still waiting, if any, and its window. */
let pending: (() => void) | null = null;
let current: Popup | null = null;

/** Brings the wallet window of the waiting ask to the front; false when there is none. */
export function focusBaretWindow(): boolean {
  if (current === null || current.closed) return false;
  current.focus?.();
  return true;
}

/** For tests: forgets an ask that is still waiting. */
export function resetBaretWindowForTests(): void {
  pending?.();
  pending = null;
  current = null;
}

/**
 * Opens the Baret wallet for one request and resolves with its answer. Call
 * it straight from a click: the window opens synchronously, or the browser
 * blocks it.
 */
export function askBaret(
  kind: "connect" | "sign",
  call?: WindowCall,
  host: Host = browser,
): Promise<BaretAnswer> {
  // One request at a time: opening again would navigate the window and drop
  // the first request, so a second ask brings the open window back instead.
  if (pending !== null && current !== null && !current.closed) {
    current.focus?.();
    return Promise.resolve({ type: "busy" });
  }
  pending?.();
  const walletOrigin = new URL(WALLET_URL).origin;
  const popup = host.open(`${WALLET_URL}/${kind}`, WINDOW_NAME, "popup,width=440,height=780");
  if (popup === null) return Promise.resolve({ type: "blocked" });

  const id = host.randomId();
  const request: SiteRequest | null =
    kind === "connect"
      ? { channel: WINDOW_CHANNEL, type: "connect", id }
      : call
        ? { channel: WINDOW_CHANNEL, type: "sign", id, chainId: WINDOW_CHAIN_ID, call }
        : null;
  // A sign with no call has nothing to send: the window answers nothing.
  if (request === null) return Promise.resolve({ type: "closed" });

  return new Promise<BaretAnswer>((resolve) => {
    let done = false;

    function settle(answer: BaretAnswer): void {
      if (done) return;
      done = true;
      host.removeEventListener("message", onMessage);
      host.clearInterval(timer);
      if (pending === end) {
        pending = null;
        current = null;
      }
      resolve(answer);
    }

    function onMessage(event: MessageEvent): void {
      if (event.source !== (popup as unknown) || event.origin !== walletOrigin) return;
      const answer = parseWalletAnswer(event.data);
      if (!answer) return;
      if (answer.type === "ready") {
        popup?.postMessage(request, walletOrigin);
        return;
      }
      if (answer.id !== id) return;
      const { channel: _channel, ...rest } = answer;
      settle(rest);
    }

    const end = (): void => settle({ type: "closed" });
    pending = end;
    current = popup;
    host.addEventListener("message", onMessage);
    const timer = host.setInterval(() => {
      if (popup.closed) end();
    }, POLL_MS);
  });
}
