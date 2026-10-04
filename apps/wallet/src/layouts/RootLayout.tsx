import { walletFrame } from "@baret/content";
import { useWallet, WalletProvider } from "@baret/wallet-ui/data/store";
import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { Signature } from "@baret/web-ui/components/Signature";
import type { JSX } from "react";
import { Outlet, ScrollRestoration, useLocation, useMatches } from "react-router";
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
 */

/** The request windows a site opens. */
const REQUEST_PATHS: ReadonlySet<string> = new Set([routes.sign.path, routes.connect.path]);

/** The screens that render outside the sidebar layout (router.tsx). */
const STANDALONE_PATHS: ReadonlySet<string> = new Set(
  Object.values(routes)
    .filter((route) => route.group === "popup" || route.group === "setup")
    .map((route) => route.path),
);

/** The path without a trailing slash, so /send/ reads as /send. */
function clean(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** The title the deepest matched route carries in its handle (router.tsx). */
function useTitle(): string {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const handle = matches[i]?.handle as { title?: string } | undefined;
    if (handle?.title) return handle.title;
  }
  return routes.home.title;
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
  const { pathname } = useLocation();
  const request = REQUEST_PATHS.has(clean(pathname));
  const title = useTitle();
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
  const path = clean(useLocation().pathname);
  const match = Object.values(routes).find((route) => route.path === path);
  return (
    <LandingMotion>
      <title>{match?.title ?? routes.notFound.title}</title>
      <WalletProvider name={walletFrame.sampleData.accountName}>
        {STANDALONE_PATHS.has(path) ? null : <AppLayout.Component />}
      </WalletProvider>
    </LandingMotion>
  );
}

export { ErrorBoundary } from "./RouteError.js";
