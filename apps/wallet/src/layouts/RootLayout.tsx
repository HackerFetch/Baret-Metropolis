import { onboarding, walletFrame } from "@baret/content";
import { initialLive, useWallet, WalletProvider } from "@baret/wallet-ui/data/store";
import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { Signature } from "@baret/web-ui/components/Signature";
import type { JSX, ReactNode } from "react";
import { Outlet, ScrollRestoration, useMatches } from "react-router";
import { LiveProvider, useLive } from "../live/live.js";
import { isLive, USDC } from "../live/storage.js";
import { SiteRequestProvider, useSiteRequest } from "../request/siteRequest.js";
import { routes } from "../routes.js";
import * as AppLayout from "./AppLayout.js";
import { Locked } from "./Locked.js";

/**
 * The shell around every wallet screen, the request windows and setup
 * included: the motion features (m.* elements, the BRAND ease-out default and
 * the reduced-motion switch), scroll restoration, the signature layer shared
 * with the showcase (packages/web-ui), and the wallet's state (data/store).
 *
 * The eyelet cursor and Lenis run on every screen except the two request
 * windows, /sign and /connect: there the reader has to land exactly on a
 * finding or on Decline, with the platform's own pointer and scroll
 * (Signature's `quiet`). Signature is mounted once, never keyed by path, so a
 * navigation does not tear the cursor down. Under reduced motion, neither
 * runs (Signature checks the media queries itself).
 *
 * A locked wallet answers a request window with the lock screen, never the
 * request: fail-closed. Unlocking shows the request; declining needs no unlock.
 * On the sample the lock lives in memory and covers the tab it was set in.
 * Live (live/live.tsx), the keys live in memory too, so every new document,
 * a request window included, starts locked and needs the passkey.
 */

/** Read once: a deployed build is live, `?sample=` keeps the sample (live/storage.ts). */
const LIVE = typeof window !== "undefined" && isLive(window.location.search);
const liveStart = (name: string) => initialLive(name, USDC);

/** The wallet's state, and its live side when there is one. */
function Account({ children }: { children: ReactNode }): JSX.Element {
  return (
    <WalletProvider
      name={walletFrame.sampleData.accountName}
      {...(LIVE ? { initial: liveStart } : {})}
    >
      {LIVE ? <LiveProvider>{children}</LiveProvider> : children}
    </WalletProvider>
  );
}

/** What a route carries in its handle (router.tsx). */
type Handle = { title?: string; standalone?: boolean; request?: boolean };

type Match = { handle?: unknown };

/**
 * What the deepest matched route says about itself: its title, whether it
 * renders outside the sidebar layout, and whether it is a request window.
 * Read from the router's match, never from the URL string, because the router
 * matches paths case-insensitively and decodes escapes: /Sign and /%73ign
 * render the sign page, so they must get the lock gate too.
 */
export function routeFlags(matches: readonly Match[]): Required<Handle> {
  let title: string | undefined;
  let standalone = false;
  let request = false;
  for (const match of matches) {
    const handle = match.handle as Handle | undefined;
    if (handle?.title) title = handle.title;
    if (handle?.standalone) standalone = true;
    if (handle?.request) request = true;
  }
  return { title: title ?? routes.notFound.title, standalone, request };
}

/** A request window behind the lock shows the lock screen instead. */
function Gate({ request }: { request: boolean }): JSX.Element {
  const { state, dispatch } = useWallet();
  const live = useLive();
  const site = useSiteRequest();
  const waiting = site.request;
  if (request && state.locked) {
    // Live, the lock screen speaks of a waiting site only once its request is
    // in: before that (or with no site at all) it is the plain lock, with no
    // Decline that could reach no one.
    const asks = live === null || waiting !== null;
    return (
      <Locked
        request={asks}
        onUnlock={() => (live ? void live.unlock() : dispatch({ type: "unlock" }))}
        busy={live?.busy ?? false}
        problem={live?.problem ?? null}
        origin={waiting ? site.origin : null}
        {...(waiting
          ? {
              // Declining needs no unlock: the site hears it at once.
              onDecline: () =>
                site.reply({
                  type: "refused",
                  id: waiting.id,
                  reason: "declined",
                  address: null,
                  findings: [],
                }),
            }
          : {})}
        {...(live && !live.known
          ? // No passkey on this device: creating the wallet comes first.
            { onCreate: () => void live.create(onboarding.passkey.userName) }
          : {})}
      />
    );
  }
  return <Outlet />;
}

/** Which request a request window takes, from its route's title (routes.ts). */
function kindOf(title: string, request: boolean): "connect" | "sign" | null {
  if (!request) return null;
  if (title === routes.connect.title) return "connect";
  if (title === routes.sign.title) return "sign";
  return null;
}

export function Component(): JSX.Element {
  const { title, request } = routeFlags(useMatches());
  return (
    <LandingMotion>
      {/* React 19 hoists a <title> rendered anywhere into the head. */}
      <title>{title}</title>
      <ScrollRestoration />
      <Signature quiet={request} />
      {/* The account and everything done with it, shared by every screen (data/store). */}
      <Account>
        {/* A site's request, live in a window a site opened (request/siteRequest.tsx). */}
        <SiteRequestProvider kind={kindOf(title, request)}>
          <Gate request={request} />
        </SiteRequestProvider>
      </Account>
    </LandingMotion>
  );
}

/**
 * What paints while the first screen's chunk loads: the app frame (sidebar or
 * top bar, and the sample notice on the sample) on an app screen, the bare ground on a
 * request or setup screen. AppLayout is imported statically for this, so the
 * frame arrives with the entry instead of one lazy hop later.
 */
export function HydrateFallback(): JSX.Element {
  const { title, standalone } = routeFlags(useMatches());
  return (
    <LandingMotion>
      <title>{title}</title>
      {/* Live, the frame would be a lock screen whose button unlocks a provider
          that is thrown away when the route arrives: paint the ground only. */}
      <Account>{standalone || LIVE ? null : <AppLayout.Component />}</Account>
    </LandingMotion>
  );
}

export { ErrorBoundary } from "./RouteError.js";
