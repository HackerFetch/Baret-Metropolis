import { common, extFrame } from "@baret/content";
import { navRoutes } from "@baret/routes";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { Signature } from "@baret/web-ui/components/Signature";
import { T } from "@baret/web-ui/lib/type";
import { Menu, X } from "lucide-react";
import { type JSX, useEffect, useId, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useRouteError } from "react-router";
import { activeAccount, useExtension } from "../../data/store.js";
import { Locked } from "../popup/screens/Locked.js";
import { LockContext, SampleNotice } from "./parts/kit.js";
import { routes } from "./routes.js";

const NAV = navRoutes(routes, "main");

/**
 * The frame of every options page (docs/WALLET.md 2.5), in the wallet's
 * grammar. From 1024 px a sidebar: the mark and the network, the seven
 * pages, then the account line with copy and lock at the foot. Below it, a
 * top bar whose menu opens in place and closes on any navigation. The sample
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
      <Button type="button" variant="ghost" size="sm" onClick={onLock}>
        {extFrame.lock.label}
      </Button>
    </div>
  );
}

export function Component() {
  const { state } = useExtension();
  const { pathname } = useLocation();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);

  // Any navigation closes the phone menu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger.
  useEffect(() => setOpen(false), [pathname]);

  const match = Object.values(routes).find((route) => route.path === pathname);
  const title =
    match?.title ??
    (pathname.startsWith("/sites/") ? routes.siteDetail.title : routes.notFound.title);

  if (locked) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <title>{title}</title>
        <div className="h-[600px] w-full max-w-[400px] overflow-hidden border border-[color:var(--rule-strong)] bg-[color:var(--ground)]">
          <Locked
            reason="manual"
            values={{ count: String(state.settings.lockMinutes), origin: "" }}
            onOpen={() => setLocked(false)}
            onReset={() => setLocked(false)}
          />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* React 19 hoists a <title> rendered anywhere into the head. */}
      <title>{title}</title>
      <ScrollRestoration />
      <Signature key={pathname} />

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

      <main className="min-w-0">
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

/** A page that failed to load: what happened, then the way back. */
export function ErrorBoundary() {
  const error = useRouteError();
  const { unknown } = common.errors;
  return (
    <main className="mx-auto grid min-h-dvh max-w-[640px] content-center gap-4 px-4 py-24 md:px-8">
      <title>{unknown.title}</title>
      <div className="flex">
        <Tag tone="blocked">{unknown.tag}</Tag>
      </div>
      <h1 className={`${T.h2} text-[color:var(--fg)]`}>{unknown.heading}</h1>
      <p className={T.body}>{error instanceof Error ? error.message : unknown.body}</p>
      <Link
        to={routes.home.path}
        className="chamfer-sm inline-flex h-11 w-max items-center border border-[color:var(--fg)] px-4 font-display text-base font-extrabold uppercase tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {unknown.back}
      </Link>
    </main>
  );
}
