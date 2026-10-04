import { common, extFrame } from "@baret/content";
import { optionsFrame } from "@baret/content/extension/options/frame.content";
import { navRoutes } from "@baret/routes";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { Signature } from "@baret/web-ui/components/Signature";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { Menu, X } from "lucide-react";
import { type JSX, lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { activeAccount, useExtension } from "../../data/store.js";
import { scenarioQuery } from "../../lib/start.js";
import { LockContext, SampleNotice } from "./parts/kit.js";
import { pageTitle, routes } from "./routes.js";

// The lock screen loads only when the reader locks: no page pays for it up front.
const Locked = lazy(() =>
  import("../popup/screens/Locked.js").then((module) => ({ default: module.Locked })),
);

const NAV = navRoutes(routes, "main");

/**
 * The frame of every options page (docs/WALLET.md 2.5), in the wallet's
 * grammar. From 1024 px a sidebar: the mark and the network, the seven
 * pages, then the account line with copy and lock at the foot. Below it, a
 * top bar whose menu opens in place and closes on any navigation or on
 * Escape. After a move to another page, its h1 takes the focus and the page
 * name is read politely, as setup does. The sample
 * notice sits above every page. The active page is marked in ink, so orange
 * stays each page's own main action. Locking hides the pages until the
 * passphrase opens them again.
 */

function Nav(): JSX.Element {
  return (
    <nav aria-label={extFrame.nav.label}>
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

function Account({ onLock }: { onLock: () => void }): JSX.Element {
  const { state } = useExtension();
  const account = activeAccount(state);
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <p className={T.label}>{extFrame.account.label}</p>
        <p className="text-sm font-medium text-[color:var(--fg)]">{account?.name}</p>
        <code className="font-mono text-sm text-[color:var(--fg-muted)]" title={account?.address}>
          {account ? truncateAddress(account.address) : ""}
        </code>
        {account ? (
          <div className="-ml-2 flex">
            <CopyButton
              text={account.address}
              label={extFrame.account.copy}
              done={extFrame.account.copied}
            />
          </div>
        ) : null}
      </div>
      <Button type="button" variant="ghost" size="md" onClick={onLock}>
        {extFrame.lock.label}
      </Button>
    </div>
  );
}

/** The tab title for a path; a site's detail page carries its origin. */
function titleFor(pathname: string): { title: string; page: string } {
  const match = Object.entries(routes).find(([, route]) => route.path === pathname);
  if (match) {
    const page = optionsFrame.pages[match[0] as keyof typeof optionsFrame.pages];
    return { title: match[1].title, page };
  }
  if (pathname.startsWith("/sites/")) {
    let origin = pathname.slice("/sites/".length);
    try {
      origin = decodeURIComponent(origin);
    } catch {
      // A malformed escape: show the path as it came.
    }
    return { title: pageTitle(origin), page: origin };
  }
  return { title: routes.notFound.title, page: optionsFrame.pages.notFound };
}

export function Component() {
  const { state, dispatch } = useExtension();
  const { pathname } = useLocation();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [moved, setMoved] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  const { title, page } = titleFor(pathname);

  // Any navigation closes the phone menu, moves the focus to the new page's
  // h1 (or main, if it has none) and reads the page name politely. Not on
  // the first load: there the reader starts at the top as usual.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger.
  useEffect(() => {
    setOpen(false);
    if (first.current) {
      first.current = false;
      return;
    }
    const target = main.current?.querySelector("h1") ?? main.current;
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
    setMoved(fill(optionsFrame.moved, { page }));
  }, [pathname]);

  // Escape closes the phone menu and hands the focus back to its toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Forgot the passphrase: the confirm said the wallet is wiped, so wipe it
  // and open restore, as the popup does. Never the unlock path.
  const reset = () => {
    const query = scenarioQuery(state.scenario);
    dispatch({ type: "reset" });
    location.assign(
      `${location.pathname}${query ? `${query}&` : "?"}restore=1#${routes.onboarding.path}`,
    );
  };

  if (locked) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <title>{title}</title>
        <div className="h-[600px] w-full max-w-[400px] overflow-hidden border border-[color:var(--rule-strong)] bg-[color:var(--ground)]">
          <Suspense fallback={null}>
            <Locked
              reason="manual"
              values={{ count: String(state.settings.lockMinutes), origin: "" }}
              onOpen={() => setLocked(false)}
              onReset={reset}
            />
          </Suspense>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* React 19 hoists a <title> rendered anywhere into the head. */}
      <title>{title}</title>
      <ScrollRestoration />
      <Signature />
      <p aria-live="polite" className="sr-only">
        {moved}
      </p>

      <aside className="hidden border-r border-[color:var(--rule)] bg-[color:var(--ground-deep)] lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-10 overflow-y-auto p-7">
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
            <Account onLock={() => setLocked(true)} />
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
            <span className="sr-only">{open ? extFrame.nav.close : extFrame.nav.open}</span>
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
            <Account onLock={() => setLocked(true)} />
          </div>
        </div>
      </header>

      <main ref={main} className="min-w-0 focus:outline-none [&_h1:focus]:outline-none">
        <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-16 md:px-8 md:pt-8 lg:px-12 lg:pt-10 lg:pb-24">
          <SampleNotice />
          <div className="mt-10 md:mt-12">
            <LockContext value={() => setLocked(true)}>
              <Outlet />
            </LockContext>
          </div>
        </div>
      </main>
    </div>
  );
}
