import { common } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { cn, Mark, Tag } from "@baret/ui";
import { NavLink, Outlet, useLocation, useRouteError } from "react-router";
import { routes } from "./routes.js";

const NAV = navRoutes(routes, "main");

/** 240px sidebar plus a 1024 content column, per docs/WALLET.md section 2.5. */
export function Component() {
  const { pathname } = useLocation();
  const match = Object.values(routes).find((route) => route.path === pathname);

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[240px_1fr]">
      <title>{match?.title ?? routes.notFound.title}</title>

      <aside className="border-b border-[color:var(--rule)] md:border-r md:border-b-0">
        <div className="sticky top-0 grid gap-6 p-5">
          <div className="flex items-center gap-2.5">
            <Mark size={24} slit="var(--ground)" />
            <span className="font-stencil text-xl uppercase tracking-[0.04em]">
              {common.brand.wordmark}
            </span>
          </div>

          <Tag tone="network" size="sm">
            {common.networks.testnet.label}
          </Tag>

          <nav aria-label="Settings" className="grid gap-0.5">
            {NAV.map((route) => (
              <NavLink
                key={route.key}
                to={route.path}
                end={route.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 font-display text-base uppercase tracking-[0.05em] transition-colors",
                    isActive
                      ? "bg-[color:var(--surface)] text-[color:var(--fg)]"
                      : "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]",
                  )
                }
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-[1024px] px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="grid gap-4 p-8">
      <Tag tone="blocked">Error</Tag>
      <h1 className="text-display-l">This screen did not load.</h1>
      <p className="text-[color:var(--fg-muted)]">
        {error instanceof Error ? error.message : "Something went wrong."}
      </p>
    </div>
  );
}
