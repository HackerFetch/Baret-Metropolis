import { common } from "@baret/content";
import { cn, Mark, Tag } from "@baret/ui";
import { NavLink, Outlet, useRouteError } from "react-router";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/history", label: "Activity", end: false },
  { to: "/policies", label: "Rules", end: false },
  { to: "/agents", label: "Agents", end: false },
  { to: "/settings", label: "Settings", end: false },
] as const;

/** Sidebar plus content. The popup routes render outside this. */
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
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 font-display text-base uppercase tracking-[0.05em] transition-colors",
                    isActive
                      ? "bg-[color:var(--surface)] text-[color:var(--fg)]"
                      : "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]",
                  )
                }
              >
                {item.label}
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
