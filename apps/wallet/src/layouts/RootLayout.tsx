import { common } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { Signature } from "@baret/web-ui/components/Signature";
import { T } from "@baret/web-ui/lib/type";
import { Link, Outlet, ScrollRestoration, useLocation, useRouteError } from "react-router";
import { routes } from "../routes.js";

/**
 * The shell around every wallet screen, the request windows and setup
 * included: the motion features (m.* elements, the BRAND ease-out default and
 * the reduced-motion switch), scroll restoration, and the signature layer
 * shared with the showcase (packages/web-ui).
 *
 * The eyelet cursor runs everywhere. Lenis smooths the wheel everywhere
 * except the two request windows, /sign and /connect: there the reader has to
 * land exactly on a finding or on Decline, so the native scroll stays.
 * Keyed by path, so each screen starts it fresh. Under reduced motion,
 * neither runs (Signature checks the media queries itself).
 */

/** The request windows a site opens. They keep the platform's own scroll. */
const REQUEST_PATHS: ReadonlySet<string> = new Set([routes.sign.path, routes.connect.path]);

export function Component() {
  const { pathname } = useLocation();
  // React 19 hoists a <title> rendered anywhere into the head.
  const match = Object.values(routes).find((route) => route.path === pathname);
  return (
    <LandingMotion>
      <title>{match?.title ?? routes.notFound.title}</title>
      <ScrollRestoration />
      <Signature key={pathname} smoothScroll={!REQUEST_PATHS.has(pathname)} />
      <Outlet />
    </LandingMotion>
  );
}

/** A screen that failed to load: what happened, then the way back. */
export function ErrorBoundary() {
  const error = useRouteError();
  const { unknown } = common.errors;
  return (
    <main className="mx-auto grid min-h-dvh max-w-[640px] content-center gap-4 px-4 py-24 md:px-8">
      <title>{unknown.title}</title>
      <div className="flex">
        <Tag tone="blocked">{unknown.tag}</Tag>
      </div>
      <h1 className={`${T.h2} text-[color:var(--fg)]`}>{unknown.heading}</h1>
      <p className={T.body}>{error instanceof Error ? error.message : unknown.body}</p>
      <Link
        to={routes.home.path}
        className="chamfer-sm inline-flex h-11 w-max items-center border border-[color:var(--fg)] px-4 font-display text-base font-extrabold uppercase tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {unknown.back}
      </Link>
    </main>
  );
}
