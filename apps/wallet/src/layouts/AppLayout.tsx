import { common, walletFrame } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { useWallet } from "@baret/wallet-ui/data/store";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { Menu, X } from "lucide-react";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { SampleNotice } from "../components/SampleNotice.js";
import { useLive } from "../live/live.js";
import { routes } from "../routes.js";
import { Locked } from "./Locked.js";

const NAV = navRoutes(routes, "app");

/**
 * The frame of every app screen. From 1024 px a sidebar: the mark and the
 * network, the screens, then the account line and the lock at the foot. Below
 * it, a top bar with a menu that opens in place (a native disclosure button,
 * closed again by any navigation or Escape, and scrolling inside the viewport
 * when it is taller than the screen). Above every screen, the sample notice:
 * nothing here is connected yet, and the wallet says so on every screen. A
 * skip link is the first stop, past the sidebar to the screen itself.
 *
 * The active screen is marked in ink, not orange: orange is kept for each
 * screen's own main action. In forced colours the rule is drawn in Highlight
 * and the inactive rules disappear, so the current screen still shows. The
 * popup and setup routes render outside this.
 */

/** The menu's quiet rise: 240 ms, the BRAND ease, off under reduced motion. */
const RISE =
  "transition-[opacity,translate] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none";

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
                `-ml-px flex min-h-11 items-center border-l-2 pl-4 font-display text-lg font-bold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] ${isActive ? "border-[color:var(--fg)] text-[color:var(--fg)] forced-colors:border-[Highlight]" : "border-transparent text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] forced-colors:border-[Canvas]"}`
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
  const live = useLive();
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => (live ? live.lock() : dispatch({ type: "lock" }))}
      >
        {walletFrame.lock.label}
      </Button>
    </div>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const live = useLive();
  const { pathname } = useLocation();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  // Any navigation closes the phone menu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes it too, and focus goes back to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Live with no passkey ever used in this browser: setup, which also offers
  // "I already have a passkey" for a cleared browser or a new device.
  if (live && state.locked && !live.known) return <Navigate to={routes.onboarding.path} replace />;
  if (state.locked) {
    return (
      <Locked
        onUnlock={() => (live ? void live.unlock() : dispatch({ type: "unlock" }))}
        busy={live?.busy ?? false}
        problem={live?.problem ?? null}
      />
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 bg-[color:var(--ground-deep)] font-display text-base font-bold uppercase tracking-[0.04em] text-[color:var(--fg)] focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11 focus:items-center focus:px-4 focus:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {walletFrame.skip}
      </a>
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
            ref={toggle}
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
          data-lenis-prevent
          className={`max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-[color:var(--rule)] px-4 py-6 md:px-8 ${RISE}`}
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

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
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

/** Same screen as the root's: what happened, a reload, then the way back. */
export { ErrorBoundary } from "./RouteError.js";
