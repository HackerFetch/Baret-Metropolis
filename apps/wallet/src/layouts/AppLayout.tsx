import { common } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { cn, Mark, Tag } from "@baret/ui";
import { NavLink, Outlet } from "react-router";
import { routes } from "../routes.js";

const NAV = navRoutes(routes, "app");

/**
 * Sidebar plus content. The popup routes and onboarding render outside this,
 * which is why they are declared at the top level of the router.
 */
export function Component() {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[240px_1fr]">
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

          <nav aria-label="Wallet" className="grid gap-0.5">
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

/** Same screen as the root's: what happened, then the way back. */
export { ErrorBoundary } from "./RootLayout.js";
