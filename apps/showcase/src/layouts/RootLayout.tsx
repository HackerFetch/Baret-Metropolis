import { common, home } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { Mark } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
  useRouteError,
} from "react-router";
import { DEMO_PATHS, routes, warm } from "../routes.js";
import { Signature } from "../shared/cursor/Signature.js";
import { LandingMotion } from "../shared/LandingMotion.js";
import { LinkButton } from "../shared/LinkButton.js";

/**
 * The marketing chrome: a sticky header and a three-column footer.
 *
 * The six demo sites render without it. They are meant to look like real
 * products, and a Baret header on top would give the game away before the
 * visitor has pressed anything.
 *
 * The document title comes from the registry. React 19 hoists a <title>
 * rendered anywhere in the tree into the head, so there is no effect to run
 * and no cleanup to get wrong. The description works the same way, and
 * index.html carries neither, so the head holds exactly one of each. (The
 * static head that index.html ships for link-preview bots is removed in
 * main.tsx before React renders.)
 *
 * ScrollRestoration restores the position on back/forward and starts a new
 * page at the top. It writes the native scroll position, which Lenis (the
 * landing's wheel smoothing) reads back on its next native scroll event, so
 * the two never fight. A hash in the URL scrolls to its target, which lands
 * under the 56 px header through the scroll-padding in tokens.css.
 */

/** The header text links. Showcase is the header action instead (IMPROVE D2). */
const NAV = navRoutes(routes, "marketing").filter((route) => route.key !== "showcase");

/**
 * The landing page sits on a wider frame than the other routes (its FRAME
 * constant, written out here because the layout must not import landing code).
 */
const ROW_HOME = "max-w-[1276px] px-4 md:px-8 lg:px-12";
const ROW_DEFAULT = "max-w-[1180px] px-5";

/** Just under the 56 px header: the line whose band decides the header tone. */
const PROBE_Y = 57;

/**
 * The deepest route handle's description. router.tsx loads it with each lazy
 * page (the same text scripts/head.mjs writes into dist/<route>/index.html),
 * so the live head agrees with the static one after hydration.
 */
function useHandleDescription(): string | undefined {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as { description?: unknown } | undefined;
    if (typeof handle?.description === "string") return handle.description;
  }
  return undefined;
}

/** True when a [data-band="dark"] element covers the line just under the header. */
function darkBandUnderHeader(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-band="dark"]')).some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= PROBE_Y && r.bottom > PROBE_Y;
  });
}

export function Component() {
  const { pathname } = useLocation();
  // One ScrollRestoration for every route, so a hop between a demo site and
  // the marketing chrome never remounts it and loses the saved positions.
  // The signature layer (Lenis wheel smoothing and the eyelet cursor) runs on
  // every page; keyed by path so each route starts it fresh at the top.
  // LandingMotion gives every page the motion features (m.* elements, the
  // BRAND ease-out default and the reduced-motion switch).
  return (
    <LandingMotion>
      <ScrollRestoration />
      <Signature key={pathname} />
      <Chrome />
    </LandingMotion>
  );
}

function Chrome() {
  const { pathname: raw } = useLocation();
  const head = headFor(raw);
  const { path: pathname, title, noindex, demo } = head;
  const description = useHandleDescription() ?? head.description;

  if (demo) {
    return (
      <>
        <title>{title}</title>
        {/* The demo sites imitate products on purpose; keep them out of search (G4). */}
        <meta name="robots" content="noindex" />
        <Outlet />
        <DemoRibbon />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* An unknown URL answers 200 on a static host: keep the soft 404 out of search. */}
      {noindex ? <meta name="robots" content="noindex" /> : null}
      <SkipLink />
      <SiteHeader pathname={pathname} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <SiteFooter row={pathname === routes.home.path ? ROW_HOME : ROW_DEFAULT} />
    </div>
  );
}

/**
 * The first tab stop on every marketing route (WCAG 2.4.1). Hidden until it
 * takes keyboard focus. The label lives in the copy as common.nav.skip.
 */
function SkipLink() {
  return (
    <a
      href="#main"
      // The padding sits on the focus variants because `not-sr-only` resets
      // it: a plain px-4 left a 145x17 px target (IMPROVE F3).
      className="sr-only z-50 bg-[color:var(--ground)] font-mono text-[12px] uppercase tracking-[0.06em] text-[color:var(--fg)] focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:inline-flex focus-visible:min-h-11 focus-visible:items-center focus-visible:border focus-visible:border-[color:var(--fg)] focus-visible:px-4 focus-visible:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
    >
      {common.nav.skip}
    </a>
  );
}

/**
 * The head for a URL. React Router also matches "/agents/", and a static host
 * serves the built dist/agents/index.html there, so the trailing slash is
 * dropped once here and every lookup below (title, description, the demo set,
 * the header) sees the canonical path. The registry is the only place a title
 * is written. The landing has its own description here; a lazy page with
 * one gets it from its route handle (useHandleDescription) and every other
 * route the brand line. A path the registry does not know is the not-found
 * page, which a static host answers with 200, so it carries noindex like the
 * demo sites.
 */
export function headFor(raw: string): {
  path: string;
  title: string;
  description: string;
  noindex: boolean;
  demo: boolean;
} {
  const path = raw.length > 1 ? raw.replace(/\/+$/, "") || "/" : raw;
  const match = Object.values(routes).find((route) => route.path === path);
  const demo = DEMO_PATHS.has(path);
  return {
    path,
    title: match?.title ?? routes.notFound.title,
    description: path === routes.home.path ? home.meta.description : common.brand.description,
    noindex: demo || !match || match === routes.notFound,
    demo,
  };
}

/**
 * The header is always an opaque plate (BRAND Mark and Imagery: no glass, no mark on
 * a bare photo). It takes the colour of the band beneath it: graphite over a
 * [data-band="dark"] surface, the theme ground everywhere else.
 */
function SiteHeader({ pathname }: { pathname: string }) {
  const { dark, settled } = useDarkBand(pathname);
  const row = pathname === routes.home.path ? ROW_HOME : ROW_DEFAULT;
  const tone = dark
    ? "border-chalk/12 bg-graphite text-chalk"
    : "border-[color:var(--rule)] bg-[color:var(--ground)] text-[color:var(--fg)]";

  return (
    <header
      data-band={dark ? "dark" : "light"}
      className={`sticky top-0 z-30 h-14 border-b ${settled ? "transition-colors duration-150 ease-out" : ""} ${tone}`}
    >
      <div
        // The row has a fixed content width (wordmark, three links, the action),
        // so it steps down with the viewport: link padding tightens below 420
        // and 390, a 4 px gap from 360 keeps the links apart, and under 375 the
        // wordmark goes visually hidden (the mark stays in a 44 px hit area,
        // the link keeps its name). The action's right edge then always
        // lands on the 16 px gutter, with no horizontal scroll from 320 up.
        className={`mx-auto flex h-full w-full items-center justify-between gap-2 min-[420px]:gap-3 md:gap-4 ${row} max-[359px]:px-3`}
      >
        <Link
          to={routes.home.path}
          viewTransition
          className="flex min-h-11 min-w-11 shrink-0 items-center gap-2"
        >
          <Mark size={22} slit={dark ? "var(--color-graphite)" : "var(--ground)"} />
          <span className="font-stencil text-lg uppercase tracking-[0.04em] max-[374px]:sr-only md:text-xl">
            {common.brand.wordmark}
          </span>
        </Link>

        <nav
          aria-label={common.nav.label}
          className="flex min-w-0 items-center min-[360px]:gap-1 md:gap-0"
        >
          {NAV.map((route) => (
            <NavLink
              key={route.key}
              to={route.path}
              data-nav-item=""
              viewTransition
              onPointerEnter={() => warm(route.key)}
              onFocus={() => warm(route.key)}
              className={({ isActive }) => navClass(isActive, dark)}
            >
              {route.label}
            </NavLink>
          ))}
          <HeaderAction dark={dark} />
        </nav>
      </div>
    </header>
  );
}

/**
 * The one persistent action, top right (IMPROVE D2): the Showcase link as a
 * small outline button. It follows the header tone but is never orange, so
 * the hero and closing buttons stay the only orange in their viewport. The
 * long label from 768 px, the short one on phones; the hidden copy is
 * display:none, so it is out of the tab order and the accessibility tree.
 */
function HeaderAction({ dark }: { dark: boolean }) {
  const variant = dark ? "ghostInverse" : "ghost";
  const href = routes.showcase.path;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: warms the chunk on intent; the link inside is the control
    <span
      className="inline-flex min-[360px]:ml-1 md:ml-3"
      onPointerEnter={() => warm("showcase")}
      onFocus={() => warm("showcase")}
    >
      <span className="hidden md:inline-flex">
        <LinkButton href={href} label={common.actions.openShowcase} variant={variant} size="sm" />
      </span>
      <span className="inline-flex md:hidden">
        <LinkButton href={href} label={routes.showcase.label} variant={variant} size="sm" />
      </span>
    </span>
  );
}

/**
 * 12 px and chalk/72 idle on ink (B7). Only colours transition, never the
 * outline, so the focus ring appears at once (F5). data-nav-item is the
 * forced-colors hook in tokens.css (F4).
 */
function navClass(active: boolean, dark: boolean): string {
  const base =
    "inline-flex min-h-11 items-center border-b-2 px-1 font-mono min-[390px]:px-1.5 min-[420px]:px-2 text-[12px] uppercase tracking-[0.04em] transition-[color,border-color,background-color] duration-150 hover:border-[color:var(--accent)] focus-visible:outline-offset-0 md:px-3 md:tracking-[0.06em]";
  if (active) {
    return `${base} ${dark ? "border-chalk text-chalk" : "border-[color:var(--fg)] text-[color:var(--fg)]"}`;
  }
  return `${base} border-transparent ${dark ? "text-chalk/72 hover:text-chalk" : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"}`;
}

/**
 * Probes on scroll, on resize and whenever the page tree changes (the landing
 * chunk mounts lazily after the header). No DOM access during render.
 */
function useDarkBand(pathname: string): { dark: boolean; settled: boolean } {
  const { scrollY } = useScroll();
  // The landing always opens on the dark opener, so seed from the route and
  // the first paint is already graphite instead of flashing the ground plate.
  const [dark, setDark] = useState(pathname === routes.home.path);
  // The colour transition only runs once the first probe has settled the tone.
  const [settled, setSettled] = useState(false);

  useMotionValueEvent(scrollY, "change", () => {
    const next = darkBandUnderHeader();
    setDark((d) => (d === next ? d : next));
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-probe on every route change
  useEffect(() => {
    const probe = () => {
      const next = darkBandUnderHeader();
      setDark((d) => (d === next ? d : next));
    };
    probe();
    setSettled(true);
    window.addEventListener("resize", probe);
    const main = document.querySelector("main");
    const observer = new MutationObserver(probe);
    if (main) observer.observe(main, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("resize", probe);
      observer.disconnect();
    };
  }, [pathname]);

  return { dark, settled };
}

function SiteFooter({ row }: { row: string }) {
  return (
    <footer className="border-t border-[color:var(--rule-strong)]">
      <div
        className={`mx-auto grid w-full grid-cols-3 gap-x-4 gap-y-6 py-8 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:gap-8 sm:py-10 ${row}`}
      >
        <div className="col-span-3 sm:col-span-1">
          <div className="mb-3 flex items-center gap-2.5">
            <Mark size={24} slit="var(--ground)" />
            <span className="font-stencil text-lg uppercase tracking-[0.04em]">
              {common.brand.wordmark}
            </span>
          </div>
          <p className="font-display text-display-m uppercase">{common.footer.tagline}</p>
          <p className="mt-2 max-w-[38ch] text-sm text-[color:var(--fg-muted)]">
            {common.footer.note}
          </p>
        </div>

        {common.footer.groups.map((group) => (
          <nav key={group.title} aria-label={group.title} className="min-w-0">
            <h2 className="mb-2.5 truncate border-b border-[color:var(--rule)] pb-2 font-mono text-label uppercase text-[color:var(--fg-muted)]">
              {group.title}
            </h2>
            <ul className="grid">
              {group.links.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}

/** Footer hrefs come from the copy, so some of them leave the site. */
function FooterLink({ href, label }: { href: string; label: string }) {
  const className =
    "inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]";

  if (href.startsWith("http")) {
    return (
      <a href={href} className={className} rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link to={href} viewTransition className={className}>
      {label}
    </Link>
  );
}

/** Pinned to every demo site so nobody mistakes one for a real product. */
function DemoRibbon() {
  return (
    // data-scope="baret": the ribbon is Baret's, so it keeps Baret's palette
    // on top of a dApp theme (sites/theme).
    <div
      data-scope="baret"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
    >
      <Link to={routes.showcase.path} viewTransition className="pointer-events-auto">
        <Tag tone="brand" size="sm">
          {common.demo.ribbon}
        </Tag>
      </Link>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : common.errors.unknown.title;

  return (
    <div className="mx-auto grid min-h-dvh max-w-[640px] place-content-start gap-4 px-5 py-24">
      <title>{common.errors.unknown.title}</title>
      <Tag tone="blocked">{common.errors.unknown.tag}</Tag>
      <h1 className="font-display text-display-l uppercase">{common.errors.unknown.heading}</h1>
      <p className="text-[color:var(--fg-muted)]">{message}</p>
      <Link
        to={routes.home.path}
        className="chamfer-sm w-max border border-[color:var(--fg)] px-4 py-2 font-display text-sm uppercase tracking-[0.08em]"
      >
        {common.errors.unknown.back}
      </Link>
    </div>
  );
}
