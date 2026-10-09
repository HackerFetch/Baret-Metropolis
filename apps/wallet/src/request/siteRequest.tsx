import {
  parseSiteRequest,
  type SiteRequest,
  type WalletAnswer,
  WINDOW_CHANNEL,
} from "@baret/wallet-core/window";
import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLive } from "../live/live.js";

/**
 * The request a site sent to this window, live only. A site opens /connect or
 * /sign with window.open (a passkey only works on the wallet's own domain, so
 * never in an iframe), the window says "ready", and the site posts its request
 * (@baret/wallet-core/window).
 *
 * Fail-closed, and nothing the page claims is trusted:
 *  - only messages from the window that opened this one are read
 *    (`event.source === window.opener`), and each is parsed against the
 *    protocol's strict shape;
 *  - the site is the origin the browser reports (`event.origin`), never one
 *    the message names;
 *  - the first valid request of the route's kind is kept, every later one is
 *    ignored: one request per window load;
 *  - the answer goes once, to that origin exactly. "ready" carries nothing,
 *    so it alone goes to any origin.
 *
 * On the sample, with no opener, or outside a request window, `site` is false
 * and the pages keep their sample behaviour.
 */

/** An answer without its channel, which reply() adds. */
export type SiteAnswer = WalletAnswer extends infer A
  ? A extends { readonly type: "ready" }
    ? never
    : A extends WalletAnswer
      ? Omit<A, "channel">
      : never
  : never;

export interface SiteRequestValue {
  /** This window serves a site: live, a request window, and opened by a page. */
  readonly site: boolean;
  /** The site's request, once it is in; null while waiting. */
  readonly request: SiteRequest | null;
  /** The site's origin as the browser reports it; null until the request is in. */
  readonly origin: string | null;
  /** The answer went back; nothing more is sent from this window. */
  readonly answered: boolean;
  /** Sends the answer to the site, once. */
  reply(answer: SiteAnswer): void;
}

const NONE: SiteRequestValue = {
  site: false,
  request: null,
  origin: null,
  answered: false,
  reply: () => {},
};

const SiteRequestContext = createContext<SiteRequestValue>(NONE);

/** The site's request for this window, or the inactive value. */
export function useSiteRequest(): SiteRequestValue {
  return use(SiteRequestContext);
}

/** The window that opened this one, read once; null when there is none. */
function openerOf(): Window | null {
  if (typeof window === "undefined") return null;
  try {
    return (window.opener as Window | null) ?? null;
  } catch {
    return null;
  }
}

export function SiteRequestProvider({
  kind,
  children,
}: {
  /** The request window's kind, from the matched route; null outside one. */
  kind: SiteRequest["type"] | null;
  children: ReactNode;
}): JSX.Element {
  const live = useLive() !== null;
  const [opener] = useState(openerOf);
  const active = kind !== null && live && opener !== null;
  const [got, setGot] = useState<{ request: SiteRequest; origin: string } | null>(null);
  const [answered, setAnswered] = useState(false);
  // Read by the listener and reply() without waiting for a render.
  const kept = useRef<{ request: SiteRequest; origin: string } | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (!active || !opener) return;
    const onMessage = (event: MessageEvent) => {
      if (kept.current || event.source !== opener) return;
      // An opaque origin cannot be answered to exactly.
      if (!event.origin || event.origin === "null") return;
      const request = parseSiteRequest(event.data);
      if (!request || request.type !== kind) return;
      kept.current = { request, origin: event.origin };
      setGot(kept.current);
    };
    window.addEventListener("message", onMessage);
    try {
      // Contentless, so any origin may hear it: the site answers with its request.
      opener.postMessage({ channel: WINDOW_CHANNEL, type: "ready" }, "*");
    } catch {
      // The opener is gone: no request will come.
    }
    return () => window.removeEventListener("message", onMessage);
  }, [active, opener, kind]);

  const reply = useCallback(
    (answer: SiteAnswer) => {
      const to = kept.current;
      if (!active || !opener || !to || sent.current) return;
      sent.current = true;
      setAnswered(true);
      try {
        // The id is the request's own, whatever the page passed.
        opener.postMessage({ channel: WINDOW_CHANNEL, ...answer, id: to.request.id }, to.origin);
      } catch {
        // The site closed or moved on: it reads a closed window as nothing signed.
      }
    },
    [active, opener],
  );

  const value = useMemo<SiteRequestValue>(
    () =>
      active
        ? {
            site: true,
            request: got?.request ?? null,
            origin: got?.origin ?? null,
            answered,
            reply,
          }
        : NONE,
    [active, got, answered, reply],
  );

  return <SiteRequestContext value={value}>{children}</SiteRequestContext>;
}
