/**
 * The MAIN-world provider. Declared in the manifest rather than registered at
 * runtime, which is what MetaMask switched to and what Chrome schedules
 * earliest. Chrome 111 and Firefox 128 both support it.
 *
 * Timing honesty: document_start guarantees this runs before other DOM is
 * constructed, but neither Chrome nor Firefox documents a guarantee that it
 * beats every page script. Capture the globals this file needs before touching
 * anything a page can reach.
 *
 * What it is: an EIP-1193 provider that holds nothing. No key, no account, no
 * rule lives in the page. Every request is posted to the isolated content
 * script and answered from the background; the page can only ask.
 */
export default defineContentScript({
  matches: ["file://*/*", "http://*/*", "https://*/*"],
  world: "MAIN",
  registration: "manifest",
  runAt: "document_start",
  allFrames: true,
  matchOriginAsFallback: true,
  main() {
    const CHANNEL = "baret-extension/1";
    const post = window.postMessage.bind(window);
    const listen = window.addEventListener.bind(window);
    const dispatch = window.dispatchEvent.bind(window);
    const randomId = () =>
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    const origin = window.location.origin;

    type Handler = (...args: unknown[]) => void;
    const waiting = new Map<
      string,
      { resolve: (value: unknown) => void; reject: (error: Error) => void; method: string }
    >();
    const handlers = new Map<string, Set<Handler>>();
    let accounts: readonly string[] = [];

    function emit(event: string, ...args: unknown[]): void {
      for (const handler of handlers.get(event) ?? []) {
        try {
          handler(...args);
        } catch {
          // A page's own handler threw: not the wallet's to report.
        }
      }
    }

    function rpcError(code: number, message: string): Error {
      return Object.assign(new Error(message), { code });
    }

    listen("message", (event: MessageEvent) => {
      if (event.source !== window || event.origin !== origin) return;
      const data = event.data as Record<string, unknown> | null;
      if (typeof data !== "object" || data === null) return;
      if (data.channel !== CHANNEL || data.dir !== "response") return;
      const entry = typeof data.id === "string" ? waiting.get(data.id) : undefined;
      if (!entry) return;
      waiting.delete(data.id as string);
      const error = data.error as { code?: unknown; message?: unknown } | undefined;
      if (error) {
        entry.reject(
          rpcError(
            typeof error.code === "number" ? error.code : -32603,
            typeof error.message === "string" ? error.message : "Baret could not answer.",
          ),
        );
        return;
      }
      if (entry.method === "eth_requestAccounts" || entry.method === "eth_accounts") {
        const next = Array.isArray(data.result) ? (data.result as string[]) : [];
        if (next.join() !== accounts.join()) {
          accounts = next;
          emit("accountsChanged", [...next]);
        }
      }
      entry.resolve(data.result);
    });

    function request(args: {
      method: string;
      params?: readonly unknown[] | object;
    }): Promise<unknown> {
      if (typeof args !== "object" || args === null || typeof args.method !== "string") {
        return Promise.reject(rpcError(-32602, "The request is not valid."));
      }
      const params = Array.isArray(args.params)
        ? args.params
        : args.params === undefined
          ? []
          : [args.params];
      return new Promise((resolve, reject) => {
        const id = randomId();
        waiting.set(id, { resolve, reject, method: args.method });
        post({ channel: CHANNEL, dir: "request", id, method: args.method, params }, origin);
      });
    }

    const provider = Object.freeze({
      isBaret: true,
      request,
      on(event: string, handler: Handler) {
        let set = handlers.get(event);
        if (!set) {
          set = new Set();
          handlers.set(event, set);
        }
        set.add(handler);
        return provider;
      },
      removeListener(event: string, handler: Handler) {
        handlers.get(event)?.delete(handler);
        return provider;
      },
      /** The call older sites still make instead of eth_requestAccounts. */
      enable: () => request({ method: "eth_requestAccounts" }),
    });

    // EIP-6963: the wallet announces itself and every site that lists wallets
    // shows it beside the others. Announced now and on every request, frozen.
    const MARK =
      "data:image/svg+xml;base64," +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#e9e7e1"/><path d="M20 62h56v8H20z" fill="#16150f"/><path d="M26 58c0-14 9-26 22-26s22 12 22 26z" fill="#f25c05"/></svg>',
      );
    const detail = Object.freeze({
      info: Object.freeze({
        uuid: crypto.randomUUID(),
        name: "Baret",
        icon: MARK,
        rdns: "dev.baret.wallet",
      }),
      provider,
    });
    const announce = () => dispatch(new CustomEvent("eip6963:announceProvider", { detail }));
    listen("eip6963:requestProvider", announce);
    announce();

    // The old global, only where no other wallet took it: Baret does not push
    // a wallet the reader already uses out of the way.
    const host = window as unknown as { ethereum?: unknown };
    if (host.ethereum === undefined) {
      try {
        Object.defineProperty(host, "ethereum", { value: provider, configurable: true });
      } catch {
        // Another script locked the name first.
      }
    }
  },
});
