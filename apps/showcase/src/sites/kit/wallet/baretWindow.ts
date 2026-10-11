import {
  parseWalletAnswer,
  type SiteRequest,
  type WalletAnswer,
  WINDOW_CHAIN_ID,
  WINDOW_CHANNEL,
  WINDOW_NAME,
  type WindowCall,
  type WindowTyped,
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
  | Answer<"signedTyped">
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
  close?(): void;
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
  if (kind === "sign" && !call) return ask("sign", () => null, host);
  return ask(
    kind,
    (id) =>
      kind === "connect"
        ? { channel: WINDOW_CHANNEL, type: "connect", id }
        : call
          ? { channel: WINDOW_CHANNEL, type: "sign", id, chainId: WINDOW_CHAIN_ID, call }
          : null,
    host,
  );
}

/**
 * Opens the Baret wallet for one typed message (EIP-712) and resolves with
 * its answer: "signedTyped" carries the signature. The window has to open
 * inside the click, so the message may still be on its way: `typed` is
 * awaited once the wallet is ready, and null (the page found nothing to
 * sign after all) closes the window with nothing asked.
 */
export function askBaretTyped(
  typed: Promise<WindowTyped | null>,
  host: Host = browser,
): Promise<BaretAnswer> {
  return ask(
    "sign",
    async (id) => {
      const message = await typed.catch(() => null);
      return message
        ? {
            channel: WINDOW_CHANNEL,
            type: "signTyped",
            id,
            chainId: WINDOW_CHAIN_ID,
            typed: message,
          }
        : null;
    },
    host,
  );
}

function ask(
  path: "connect" | "sign",
  build: (id: string) => SiteRequest | null | Promise<SiteRequest | null>,
  host: Host,
): Promise<BaretAnswer> {
  // One request at a time: opening again would navigate the window and drop
  // the first request, so a second ask brings the open window back instead.
  if (pending !== null && current !== null && !current.closed) {
    current.focus?.();
    return Promise.resolve({ type: "busy" });
  }
  pending?.();
  const walletOrigin = new URL(WALLET_URL).origin;
  const popup = host.open(`${WALLET_URL}/${path}`, WINDOW_NAME, "popup,width=440,height=780");
  if (popup === null) return Promise.resolve({ type: "blocked" });

  const id = host.randomId();
  const built = build(id);
  // A sign with no call has nothing to send: the window answers nothing.
  if (built === null) return Promise.resolve({ type: "closed" });

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
        const send = (request: SiteRequest | null): void => {
          if (done) return;
          if (request === null) {
            // Nothing to sign after all: the window is not left waiting.
            popup?.close?.();
            end();
            return;
          }
          popup?.postMessage(request, walletOrigin);
        };
        // A request that is already known goes at once; a typed message may still be on its way.
        if (built instanceof Promise) void built.then(send);
        else send(built);
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
