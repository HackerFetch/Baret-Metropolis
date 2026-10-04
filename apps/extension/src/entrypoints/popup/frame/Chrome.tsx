import { popupHome, walletFrame } from "@baret/content";
import { Mark, truncateAddress } from "@baret/ui";
import { fill } from "@baret/web-ui/lib/util";
import { Bell, ChevronDown, Gauge, House, ListChecks, SlidersHorizontal } from "lucide-react";
import type { JSX } from "react";
import type { Account } from "../../../data/types.js";
import { TABS, type Tab } from "../navigation.js";

/**
 * The popup's chrome, shown only while the wallet is usable (ready, alert):
 * the top strip (the mark, the account switcher, the alerts and settings)
 * and the bottom tab bar. Neither renders while a request is pending; the
 * navigation reducer makes sure of it.
 */

const ICON_BUTTON =
  "relative flex size-10 shrink-0 items-center justify-center text-[color:var(--fg)] transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

export function TopStrip({
  account,
  unread,
  onAccounts,
  onAlerts,
  onSettings,
}: {
  account: Account | undefined;
  unread: number;
  onAccounts: () => void;
  onAlerts: () => void;
  onSettings: () => void;
}): JSX.Element {
  const { header } = popupHome;
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)] pr-1.5 pl-3">
      <Mark size={22} slit="var(--ground-deep)" />
      <button
        type="button"
        onClick={onAccounts}
        className="ml-1.5 flex h-11 min-w-0 flex-1 items-center gap-2 px-2 text-left transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        <span className="grid min-w-0 leading-tight">
          <span className="sr-only">{header.accounts}: </span>
          <span className="truncate text-sm font-medium text-[color:var(--fg)]">
            {account?.name}
          </span>
          <span className="font-mono text-xs text-[color:var(--fg-muted)]">
            {account ? truncateAddress(account.address) : ""}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-[color:var(--fg-muted)]"
          strokeWidth={1.75}
        />
      </button>
      <button type="button" onClick={onAlerts} className={ICON_BUTTON}>
        <Bell aria-hidden="true" className="size-5" strokeWidth={1.75} />
        <span className="sr-only">{fill(header.alerts, { count: String(unread) })}</span>
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1 grid h-4 min-w-4 place-items-center bg-[color:var(--accent)] px-1 font-mono text-[10px] leading-none font-medium text-[color:var(--on-accent)] tabular-nums"
          >
            {unread}
          </span>
        ) : null}
      </button>
      <button type="button" onClick={onSettings} className={ICON_BUTTON}>
        <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.75} />
        <span className="sr-only">{header.settings}</span>
      </button>
    </header>
  );
}

const ICONS: Record<Tab, typeof House> = {
  home: House,
  activity: ListChecks,
  allowances: Gauge,
  settings: SlidersHorizontal,
};

export function TabBar({
  active,
  onSelect,
  badge,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
  /** Unread alerts: a dot on Activity, where the alerts filter lives. */
  badge: boolean;
}): JSX.Element {
  const index = TABS.indexOf(active);
  return (
    <nav
      aria-label={walletFrame.nav.label}
      className="relative grid h-[60px] shrink-0 grid-cols-4 border-t border-[color:var(--rule)] bg-[color:var(--ground-deep)]"
    >
      {/* The ink bar slides to the active tab (a transform, so it never re-lays out). */}
      <span
        aria-hidden="true"
        className="absolute top-[-1px] left-0 h-0.5 w-1/4 bg-[color:var(--fg)] transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {TABS.map((tab) => {
        const Icon = ICONS[tab];
        const current = tab === active;
        return (
          <button
            key={tab}
            type="button"
            aria-current={current ? "page" : undefined}
            onClick={() => onSelect(tab)}
            className={`relative flex flex-col items-center justify-center gap-1 font-display text-xs font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] ${current ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"}`}
          >
            <Icon aria-hidden="true" className="size-5" strokeWidth={current ? 2 : 1.75} />
            {popupHome.tabs[tab]}
            {tab === "activity" && badge ? (
              <span
                aria-hidden="true"
                className="absolute top-2.5 left-[calc(50%+8px)] size-2 rounded-full bg-[color:var(--accent)]"
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
