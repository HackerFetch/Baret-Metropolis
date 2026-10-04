import { walletFrame } from "@baret/content";
import { useWallet, WalletProvider } from "@baret/wallet-ui/data/store";
import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { Signature } from "@baret/web-ui/components/Signature";
import type { JSX } from "react";
import { Outlet, ScrollRestoration, useMatches } from "react-router";
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
 * The lock lives in memory only while the wallet runs on sample data
 * (data/store), so it covers the tab it was set in: a request window opened
 * as a new document starts unlocked until the live keystore holds the lock.
 */

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
  if (request && state.locked) {
    return <Locked request onUnlock={() => dispatch({ type: "unlock" })} />;
  }
  return <Outlet />;
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
      <WalletProvider name={walletFrame.sampleData.accountName}>
        <Gate request={request} />
      </WalletProvider>
    </LandingMotion>
  );
}

/**
 * What paints while the first screen's chunk loads: the app frame (sidebar or
 * top bar, and the sample notice) on an app screen, the bare ground on a
 * request or setup screen. AppLayout is imported statically for this, so the
 * frame arrives with the entry instead of one lazy hop later.
 */
export function HydrateFallback(): JSX.Element {
  const { title, standalone } = routeFlags(useMatches());
  return (
    <LandingMotion>
      <title>{title}</title>
      <WalletProvider name={walletFrame.sampleData.accountName}>
        {standalone ? null : <AppLayout.Component />}
      </WalletProvider>
    </LandingMotion>
  );
}

export { ErrorBoundary } from "./RouteError.js";
