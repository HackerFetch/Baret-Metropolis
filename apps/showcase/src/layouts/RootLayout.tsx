import { common, home, hub } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { Mark } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Signature } from "@baret/web-ui/components/Signature";
import { useMotionValueEvent, useScroll } from "motion/react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  ScrollRestoration,
  useLocation,
  useMatches,
  useOutlet,
  useRouteError,
} from "react-router";
import { DEMO_PATHS, routes, warm } from "../routes.js";

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
 * page at the top. A new document load (a typed URL, an outside link) first
 * drops the saved position of the tab's first entry, so it opens at the top
 * too (forgetFreshLoadScroll). It writes the native scroll position, which Lenis (the
 * landing's wheel smoothing) reads back on its next native scroll event, so
 * the two never fight. A hash in the URL scrolls to its target, which lands
 * under the 56 px header through the scroll-padding in tokens.css.
 */

/** The header text links. Showcase is the header action instead (IMPROVE D2). */
const NAV = navRoutes(routes, "marketing").filter((route) => route.key !== "showcase");

/**
 * Every marketing page sits on the landing's frame (FRAME in @baret/web-ui
 * lib/layout), so the header and the footer share its width and gutters.
 */
const ROW = "max-w-[1276px] px-4 md:px-8 lg:px-12";

/** Just under the 56 px header: the line whose band decides the header tone. */
const PROBE_Y = 57;

/**
 * React Router keys the first entry of every document "default", so a fresh
 * load in a tab that visited the site would jump to the old page's position.
 * Runs once at module load, before ScrollRestoration reads the store; a
 * reload or a back/forward load keeps it.
 */
const SCROLL_STORE = "react-router-scroll-positions";
function forgetFreshLoadScroll(): void {
  if (typeof window === "undefined") return;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type !== "navigate") return;
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_STORE) ?? "{}") as Record<
      string,
      number
    >;
    if (!("default" in saved)) return;
    delete saved.default;
    sessionStorage.setItem(SCROLL_STORE, JSON.stringify(saved));
  } catch {
    // Storage blocked: nothing was saved, so nothing can be restored.
  }
}
forgetFreshLoadScroll();

/** The page's main region: #main on marketing routes, the site's own <main> on a demo. */
function pageMain(): HTMLElement | null {
  return document.getElementById("main") ?? document.querySelector("main");
}

/**
 * Moves focus to the page's main region without scrolling. A demo site's
 * <main> is not focusable by itself, so it gets tabindex -1 and, like #main,
 * no focus ring (it is a region, not a control).
 */
function focusMain(): HTMLElement | null {
  const main = pageMain();
  if (!main) return null;
  if (!main.hasAttribute("tabindex")) {
    main.setAttribute("tabindex", "-1");
    main.style.outline = "none";
  }
  main.focus({ preventScroll: true });
  return main;
}

/**
 * The deepest route handle's title and description. router.tsx loads them
 * with each lazy page (the same text scripts/head.mjs writes into
 * dist/<route>/index.html), so the live head agrees with the static one
 * after hydration.
 */
function useHandleMeta(): { title?: string; description?: string } {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i]?.handle as { title?: unknown; description?: unknown } | undefined;
    const title = typeof handle?.title === "string" ? handle.title : undefined;
    const description = typeof handle?.description === "string" ? handle.description : undefined;
    if (title || description) {
      return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
    }
  }
  return {};
}

/**
 * The head for the current URL: the registry's, with the page's own title
 * and description from its route handle when it has them (a demo site's
 * scenario title, for one). `own` is the handle's description alone.
 */
function usePageHead() {
  const { pathname } = useLocation();
  const head = headFor(pathname);
  const meta = useHandleMeta();
  return {
    ...head,
    title: meta.title ?? head.title,
    own: meta.description,
    description: meta.description ?? head.description,
  };
}

/** True when a [data-band="dark"] element covers the line just under the header. */
function darkBandUnderHeader(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-band="dark"]')).some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= PROBE_Y && r.bottom > PROBE_Y;
  });
}

export function Component() {
  // One ScrollRestoration for every route, so a hop between a demo site and
  // the marketing chrome never remounts it and loses the saved positions.
  // The signature layer (Lenis wheel smoothing and the eyelet cursor) runs on
  // every page and stays mounted across navigation, so the cursor never
  // drops back to the native one mid-visit. A pathname change ends any Lenis
  // glide in flight (SmoothScroll's RouteReset), so the position
  // ScrollRestoration writes is the one the new page keeps.
  // LandingMotion gives every page the motion features (m.* elements, the
  // BRAND ease-out default and the reduced-motion switch).
  return (
    <LandingMotion>
      <ScrollRestoration />
      <Signature />
      <RouteAnnouncer />
      <Chrome />
    </LandingMotion>
  );
}

/**
 * After a client-side navigation, focus moves to the new page's main region
 * (without scrolling, so ScrollRestoration keeps its position) and the page
 * title is read out through a polite live region. The region is mounted
 * once, above both chromes, and stays empty on the first load, where the
 * browser announces the document itself. A hash-only change keeps focus
 * where the hash put it.
 */
function RouteAnnouncer() {
  const { pathname } = useLocation();
  const { title } = usePageHead();
  const [message, setMessage] = useState("");
  // The last path handled, not a one-shot flag: StrictMode runs the effect
  // twice on mount, and a flag would let the second run steal focus on load.
  const last = useRef(pathname);

  // biome-ignore lint/correctness/useExhaustiveDependencies: path changes only; the title follows the path
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    focusMain();
    setMessage(title);
  }, [pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

function Chrome() {
  const { path: pathname, title, description, own, noindex, demo } = usePageHead();
  // Null while a lazy page loads on first visit: this layout is also the
  // route's HydrateFallback (router.tsx), so the header paints at once and
  // the footer waits for the page instead of jumping down when it lands.
  const outlet = useOutlet();

  if (demo) {
    return (
      <>
        <title>{title}</title>
        {own ? <meta name="description" content={own} /> : null}
        {/* The demo sites imitate products on purpose; keep them out of search (G4). */}
        <meta name="robots" content="noindex" />
        <SkipLink />
        {/* Room at the end of the page for the fixed bar, so the site's
            footer can scroll clear of it (K5). */}
        <div className="pb-[calc(4rem+env(safe-area-inset-bottom))]">{outlet}</div>
        {outlet ? <DemoRibbon /> : null}
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
        {outlet}
      </main>
      {outlet ? <SiteFooter row={ROW} /> : null}
    </div>
  );
}

/**
 * The first tab stop on every route (WCAG 2.4.1). Hidden until it takes
 * keyboard focus. The label lives in the copy as common.nav.skip. A demo
 * site's own <main> has no id, so there the click finds it and moves focus
 * by hand.
 */
function SkipLink() {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    if (document.getElementById("main")) return;
    event.preventDefault();
    focusMain()?.scrollIntoView({ block: "start" });
  };
  return (
    // biome-ignore lint/a11y/useValidAnchor: a real in-page link; the handler only stands in for a missing #main on demo sites
    <a
      href="#main"
      onClick={skip}
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
    // Utility routes (the hidden /kit gallery, not found) stay out of search too.
    noindex: demo || !match || match.group === "utility",
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
  const row = ROW;
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
          {/* Decorative: the wordmark (sr-only on narrow phones) names the link once. */}
          <Mark decorative size={22} slit={dark ? "var(--color-graphite)" : "var(--ground)"} />
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
          <HeaderAction dark={dark} current={pathname === routes.showcase.path} />
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
 * On /showcase itself it is the current page, so it becomes a nav item with
 * the active border and aria-current instead of a call to action.
 */
function HeaderAction({ dark, current }: { dark: boolean; current: boolean }) {
  const variant = dark ? "ghostInverse" : "ghost";
  const href = routes.showcase.path;
  if (current) {
    return (
      <NavLink
        to={href}
        data-nav-item=""
        viewTransition
        className={`${navClass(true, dark)} min-[360px]:ml-1 md:ml-3`}
      >
        {routes.showcase.label}
      </NavLink>
    );
  }
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
    "inline-flex min-h-11 min-w-11 items-center justify-center border-b-2 px-1 font-mono min-[390px]:px-1.5 min-[420px]:px-2 text-[12px] uppercase tracking-[0.04em] transition-[color,border-color,background-color] duration-150 hover:border-[color:var(--accent)] focus-visible:outline-offset-0 md:px-3 md:tracking-[0.06em]";
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
            <Mark decorative size={24} slit="var(--ground)" />
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
    "inline-flex min-h-11 min-w-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]";

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

/**
 * Pinned to every demo site so nobody mistakes one for a real product: a
 * slim Baret bar across the foot of the screen, in its own landmark. It is
 * opaque, so the site scrolls under its edge instead of under a floating
 * tag that covered whatever sat at the bottom of a phone screen (K5). The
 * demo layout reserves room at the end of the page so the site's footer
 * scrolls clear of it, and index.css keeps anything scrolled or tabbed to
 * above it (WCAG 2.4.11). Sheets and dialogs (z-50) open over it.
 */
function DemoRibbon() {
  return (
    // data-scope="baret": the bar is Baret's, so it keeps Baret's palette
    // on top of a dApp theme (sites/theme).
    <aside
      aria-label={common.demo.label}
      data-scope="baret"
      data-demo-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--rule-strong)] bg-[color:var(--surface)] pb-[env(safe-area-inset-bottom)] text-[color:var(--fg)]"
    >
      <div className="mx-auto flex h-12 w-full max-w-[1276px] items-center justify-between gap-4 px-4 md:px-8 lg:px-12">
        <Tag tone="brand" size="sm">
          {common.demo.ribbon}
        </Tag>
        <Link
          to={routes.showcase.path}
          viewTransition
          className="inline-flex min-h-11 items-center text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
        >
          {hub.frame.back.label}
        </Link>
      </div>
    </aside>
  );
}

/**
 * A lazy chunk that no longer exists (a tab left open across a deploy)
 * fails its import. One automatic reload fetches the new build; a second
 * failure within a minute shows the error page instead of looping.
 */
const RELOAD_FLAG = "baret-chunk-reload";
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function useChunkReload(error: unknown): boolean {
  const chunk = error instanceof Error && CHUNK_ERROR.test(error.message);
  const [reloading, setReloading] = useState(chunk);
  useEffect(() => {
    if (!chunk) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
        return;
      }
    } catch {
      // Storage blocked: never reload blind, show the page.
    }
    setReloading(false);
  }, [chunk]);
  return reloading;
}

/**
 * The route error page, inside the site chrome. It never prints the raw
 * error to readers (that goes to the console); it offers a reload and the
 * way back to the start.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const reloading = useChunkReload(error);
  const copy = common.errors.unknown;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const action =
    "chamfer-sm inline-flex min-h-11 w-max items-center border border-[color:var(--fg)] px-4 font-display text-sm uppercase tracking-[0.08em]";

  return (
    <div className="flex min-h-dvh flex-col">
      <title>{copy.title}</title>
      <meta name="robots" content="noindex" />
      <SkipLink />
      <SiteHeader pathname={headFor(pathname).path} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Blank for the moment a chunk failure reloads the page. */}
        {reloading ? null : (
          <div className={`mx-auto grid w-full gap-4 py-24 ${ROW}`}>
            <Tag tone="blocked">{copy.tag}</Tag>
            <h1 className="font-display text-display-l uppercase">{copy.heading}</h1>
            <p className="max-w-[60ch] text-[color:var(--fg-muted)]">{copy.pageBody}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => window.location.reload()} className={action}>
                {copy.reload}
              </button>
              <Link to={routes.home.path} className={action}>
                {copy.back}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
