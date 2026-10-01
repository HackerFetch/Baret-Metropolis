import { common } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { cn, Mark, Tag } from "@baret/ui";
import { Link, NavLink, Outlet, useLocation, useRouteError } from "react-router";
import { DEMO_PATHS, routes } from "../routes.js";

/**
 * The marketing chrome: a sticky header and a three-column footer.
 *
 * The six demo sites render without it. They are meant to look like real
 * products, and a Baret header on top would give the game away before the
 * visitor has pressed anything.
 *
 * The document title comes from the registry. React 19 hoists a <title>
 * rendered anywhere in the tree into the head, so there is no effect to run
 * and no cleanup to get wrong.
 */

const NAV = navRoutes(routes, "marketing");

export function Component() {
  const { pathname } = useLocation();
  const title = titleFor(pathname);

  if (DEMO_PATHS.has(pathname)) {
    return (
      <>
        <title>{title}</title>
        <Outlet />
        <DemoRibbon />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <title>{title}</title>
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

/** The registry is the only place a title is written. */
function titleFor(pathname: string): string {
  const match = Object.values(routes).find((route) => route.path === pathname);
  return match?.title ?? routes.notFound.title;
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--rule)] bg-[color:var(--ground)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between gap-4 px-5">
        <Link to={routes.home.path} className="flex items-center gap-2.5">
          <Mark size={22} slit="var(--ground)" />
          <span className="font-stencil text-xl uppercase tracking-[0.04em]">
            {common.brand.wordmark}
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((route) => (
            <NavLink
              key={route.key}
              to={route.path}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors",
                  isActive
                    ? "text-[color:var(--fg)]"
                    : "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]",
                )
              }
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--rule)]">
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <Mark size={24} slit="var(--ground)" />
            <span className="font-stencil text-lg uppercase tracking-[0.04em]">
              {common.brand.wordmark}
            </span>
          </div>
          <p className="font-display text-display-m uppercase">{common.footer.tagline}</p>
          <p className="mt-2 max-w-[38ch] text-sm text-[color:var(--fg-faint)]">
            {common.footer.note}
          </p>
        </div>

        {common.footer.groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-2.5 border-b border-[color:var(--rule)] pb-2 font-mono text-label uppercase text-[color:var(--fg-faint)]">
              {group.title}
            </h2>
            <ul className="grid gap-1.5">
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
  const className = "text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]";

  if (href.startsWith("http")) {
    return (
      <a href={href} className={className} rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {label}
    </Link>
  );
}

/** Pinned to every demo site so nobody mistakes one for a real product. */
function DemoRibbon() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <Link to={routes.showcase.path} className="pointer-events-auto">
        <Tag tone="brand" size="sm">
          Demo site
        </Tag>
      </Link>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something went wrong.";

  return (
    <div className="mx-auto grid min-h-dvh max-w-[640px] place-content-start gap-4 px-5 py-24">
      <title>Something went wrong</title>
      <Tag tone="blocked">Error</Tag>
      <h1 className="font-display text-display-l uppercase">This page did not load.</h1>
      <p className="text-[color:var(--fg-muted)]">{message}</p>
      <Link
        to={routes.home.path}
        className="chamfer-sm w-max border border-[color:var(--fg)] px-4 py-2 font-display text-sm uppercase tracking-[0.08em]"
      >
        Back to the start
      </Link>
    </div>
  );
}
