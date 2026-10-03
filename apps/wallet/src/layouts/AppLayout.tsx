import { common, walletFrame } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { Button, Mark, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { useWallet } from "@baret/wallet-ui/data/store";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { Menu, X } from "lucide-react";
import { type JSX, useEffect, useId, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { SampleNotice } from "../components/SampleNotice.js";
import { routes } from "../routes.js";

const NAV = navRoutes(routes, "app");

/**
 * The frame of every app screen. From 1024 px a sidebar: the mark and the
 * network, the screens, then the account line and the lock at the foot. Below
 * it, a top bar with a menu that opens in place (a native disclosure button,
 * closed again by any navigation). Above every screen, the sample notice:
 * nothing here is connected yet, and the wallet says so on every screen.
 *
 * The active screen is marked in ink, not orange: orange is kept for each
 * screen's own main action. The popup and setup routes render outside this.
 */

function Nav(): JSX.Element {
  return (
    <nav aria-label={walletFrame.nav.label}>
      <ul className="grid">
        {NAV.map((route) => (
          <li key={route.key}>
            <NavLink
              to={route.path}
              end={route.path === "/"}
              className={({ isActive }) =>
                `-ml-px flex min-h-11 items-center border-l-2 pl-4 font-display text-lg font-bold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] ${isActive ? "border-[color:var(--fg)] text-[color:var(--fg)]" : "border-transparent text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"}`
              }
            >
              {route.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Account(): JSX.Element {
  const { state, dispatch } = useWallet();
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className={T.label}>{walletFrame.account.label}</p>
        <p className="text-sm font-medium text-[color:var(--fg)]">{state.accountName}</p>
        <code className="font-mono text-sm text-[color:var(--fg-muted)]" title={state.address}>
          {truncateAddress(state.address)}
        </code>
        <div className="-ml-2 flex">
          <CopyButton
            text={state.address}
            label={walletFrame.account.copy}
            done={walletFrame.account.copied}
          />
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: "lock" })}>
        {walletFrame.lock.label}
      </Button>
    </div>
  );
}

/** What a locked wallet shows instead of the app. */
function Locked({ onUnlock }: { onUnlock: () => void }): JSX.Element {
  const { locked } = walletFrame;
  return (
    <main className="mx-auto grid min-h-dvh max-w-[560px] content-center gap-6 px-4 py-16 md:px-8">
      <div className="flex size-24 items-center justify-center border border-[color:var(--rule-strong)] bg-[color:var(--surface)]">
        <Mark size={56} slit="var(--surface)" />
      </div>
      <h1 className={`${T.h2} text-[color:var(--fg)]`}>{locked.title}</h1>
      <p className={T.body}>{locked.body}</p>
      <div className="flex">
        <Button type="button" variant="primary" size="lg" onClick={onUnlock}>
          {locked.action}
        </Button>
      </div>
    </main>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const { pathname } = useLocation();
  const menuId = useId();
  const [open, setOpen] = useState(false);

  // Any navigation closes the phone menu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger.
  useEffect(() => setOpen(false), [pathname]);

  if (state.locked) return <Locked onUnlock={() => dispatch({ type: "unlock" })} />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[color:var(--rule)] bg-[color:var(--ground-deep)] lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-10 overflow-y-auto p-8">
          <div className="grid gap-4">
            <Brand />
            <div className="flex">
              <Tag tone="network" size="sm">
                {common.networks.testnet.label}
              </Tag>
            </div>
          </div>
          <Nav />
          <div className="mt-auto">
            <Account />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)] lg:hidden">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
          <Brand />
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
            className="flex size-11 items-center justify-center border border-[color:var(--rule-strong)] text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">{open ? walletFrame.nav.close : walletFrame.nav.open}</span>
          </button>
        </div>
        <div
          id={menuId}
          hidden={!open}
          className="border-t border-[color:var(--rule)] px-4 py-6 md:px-8"
        >
          <div className="grid gap-8">
            <div className="flex">
              <Tag tone="network" size="sm">
                {common.networks.testnet.label}
              </Tag>
            </div>
            <Nav />
            <Account />
          </div>
        </div>
      </header>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-16 md:px-8 md:pt-8 lg:px-12 lg:pt-10 lg:pb-24">
          <SampleNotice />
          <div className="mt-10 md:mt-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

/** Same screen as the root's: what happened, then the way back. */
export { ErrorBoundary } from "./RootLayout.js";
