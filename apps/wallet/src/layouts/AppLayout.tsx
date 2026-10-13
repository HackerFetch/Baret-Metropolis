import { common, walletFrame } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { useWallet } from "@baret/wallet-ui/data/store";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import {
  Activity,
  Bot,
  Globe,
  House,
  Lock,
  type LucideIcon,
  Menu,
  Radio,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useMatches } from "react-router";
import { SampleNotice } from "../components/SampleNotice.js";
import { SessionLine } from "../components/SessionLine.js";
import { useLive } from "../live/live.js";
import { routes } from "../routes.js";
import { Locked } from "./Locked.js";

const NAV = navRoutes(routes, "app");

/** One icon per sidebar screen, so the list scans at a glance. */
const ICONS: Record<string, LucideIcon> = {
  home: House,
  history: Activity,
  sites: Globe,
  policies: ShieldCheck,
  delegation: Bot,
  x402: Radio,
  settings: Settings,
};

/** The sidebar in three groups: the wallet, the agents, then settings on its own. */
const GROUPS: ReadonlyArray<{ label: string | null; keys: readonly string[] }> = [
  { label: walletFrame.nav.groups.wallet, keys: ["home", "history", "sites", "policies"] },
  { label: walletFrame.nav.groups.agents, keys: ["delegation", "x402"] },
  { label: null, keys: ["settings"] },
];

/**
 * The frame of every app screen. From 1024 px a sidebar: the mark (Brand, a
 * link to the Baret site), the network, the screens in groups
 * with an icon each, then the account and the lock at the foot. Below it, a
 * top bar with a menu that opens in place (a native disclosure button, closed
 * again by any navigation or Escape, and scrolling inside the viewport when
 * it is taller than the screen). On the sample, the sample notice sits above
 * every screen, since nothing there is sent. On live, the session line sits
 * above the lock (and under the phone header), so the end of prompt-free
 * signing shows on every screen. A skip link is the first stop, past the
 * sidebar to the screen itself.
 *
 * Moving between the wallet's own screens stays in this tab: a new tab is a
 * new document, which would ask for the passkey again. The active screen is
 * marked in ink, not orange: orange is kept for each screen's own main
 * action. In forced colours the current screen is drawn in Highlight. The
 * popup and setup routes render outside this.
 */

/** The menu's quiet rise: 240 ms, the BRAND ease, off under reduced motion. */
const RISE =
  "transition-[opacity,translate] duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

function Nav(): JSX.Element {
  const byKey = new Map(NAV.map((route) => [route.key as string, route]));
  return (
    <nav aria-label={walletFrame.nav.label} className="grid gap-6">
      {GROUPS.map((group) => {
        const items = group.keys.flatMap((key) => {
          const route = byKey.get(key);
          return route ? [route] : [];
        });
        return (
          <div
            key={group.label ?? "rest"}
            className={`grid gap-1 ${group.label ? "" : "border-t border-[color:var(--rule)] pt-4"}`}
          >
            {group.label ? <p className={`${T.label} px-3 pb-1`}>{group.label}</p> : null}
            <ul className="grid gap-0.5">
              {items.map((route) => {
                const Icon = ICONS[route.key] ?? House;
                return (
                  <li key={route.key}>
                    <NavLink
                      to={route.path}
                      end={route.path === "/"}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 border-l-2 px-3 text-[0.9375rem] font-medium transition-colors ${FOCUS} ${isActive ? "border-[color:var(--fg)] bg-[color:var(--ground)] text-[color:var(--fg)] forced-colors:border-[Highlight]" : "border-transparent text-[color:var(--fg-muted)] hover:bg-[color:var(--ground)] hover:text-[color:var(--fg)] forced-colors:border-[Canvas]"}`
                      }
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-[18px] shrink-0"
                        strokeWidth={1.75}
                      />
                      <span>{route.label}</span>
                      {route.key === "x402" ? (
                        <span
                          aria-hidden="true"
                          className="ml-auto size-2 rounded-full bg-[color:var(--safe)] motion-safe:animate-pulse"
                        />
                      ) : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/**
 * The account and the lock. `session` is off in the phone menu, whose header
 * already shows the session line.
 */
function Account({ session = true }: { readonly session?: boolean }): JSX.Element {
  const { state, dispatch } = useWallet();
  const live = useLive();
  return (
    <div className="grid gap-3">
      <div className="grid min-w-0 gap-1 border border-[color:var(--rule)] bg-[color:var(--ground)] p-3">
        <p className={T.label}>{walletFrame.account.label}</p>
        <p className="truncate text-sm font-medium text-[color:var(--fg)]">{state.accountName}</p>
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
      {session ? <SessionLine /> : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => (live ? live.lock() : dispatch({ type: "lock" }))}
      >
        <Lock aria-hidden="true" className="size-4" />
        {walletFrame.lock.label}
      </Button>
    </div>
  );
}

/** True when the router matched the catch-all (routeTree.tsx flags it `notFound`). */
export function isNotFound(matches: readonly { handle?: unknown }[]): boolean {
  return matches.some((match) => (match.handle as { notFound?: boolean } | undefined)?.notFound);
}

/**
 * The 404 for a visitor the wallet has not let in yet (locked, or with no
 * passkey in this browser): the mark and the page, with no sidebar, since
 * every screen in it sits behind the lock. Its link goes to the start, which
 * sends a new visitor on to setup and a returning one to the lock screen.
 */
function Outside(): JSX.Element {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)]">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center px-4 md:px-8 lg:px-12">
          <Brand />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-16 md:px-8 md:pt-8 lg:px-12 lg:pt-10 lg:pb-24">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const live = useLive();
  const { pathname } = useLocation();
  const lost = isNotFound(useMatches());
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

  // An unknown path is a 404 for everyone: never the lock screen, never setup.
  if (lost && state.locked) return <Outside />;
  // Live with no passkey ever used in this browser: setup, which also offers
  // "I already have a passkey" for a cleared browser or a new device.
  if (live && state.locked && !live.known) return <Navigate to={routes.onboarding.path} replace />;
  if (state.locked) {
    return (
      <Locked
        onUnlock={() => (live ? void live.unlock() : dispatch({ type: "unlock" }))}
        busy={live?.busy ?? false}
        problem={live?.problem ?? null}
        expiredAt={live?.expiredAt ?? null}
      />
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 bg-[color:var(--ground-deep)] font-display text-base font-bold uppercase tracking-[0.04em] text-[color:var(--fg)] focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11 focus:items-center focus:px-4 focus:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {walletFrame.skip}
      </a>
      <aside className="hidden border-r border-[color:var(--rule)] bg-[color:var(--ground-deep)] lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto px-5 py-6">
          <div className="grid gap-3 px-1">
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
        {/* Outside the menu, so the session's end shows on a phone without opening it. */}
        <div className="px-4 pb-3 empty:hidden md:px-8">
          <SessionLine />
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
            <Account session={false} />
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
