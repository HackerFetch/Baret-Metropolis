import { common, popupHome, uninitialized } from "@baret/content";
import { cn, Mark, Tag } from "@baret/ui";
import { useReducer } from "react";
import {
  INITIAL_STATE,
  openOptions,
  reducePopup,
  showsChrome,
  TABS,
  type Tab,
} from "./navigation.js";

/**
 * The popup, 360 by 600.
 *
 * Navigation is a state machine rather than a router, for the reason set out
 * in navigation.ts: a pending signature has to own the whole canvas, and a
 * router makes that rule one stray link away from being broken.
 */
export function PopupApp() {
  const [state, dispatch] = useReducer(reducePopup, INITIAL_STATE);

  // TODO(week 2): subscribe to the background and dispatch phase changes.

  if (state.phase === "uninitialized") return <Uninitialized />;
  if (state.phase === "locked") return <Placeholder label="Locked" />;
  if (state.phase === "signing") return <Placeholder label="Sign request" />;
  if (state.phase === "connecting") return <Placeholder label="Connection request" />;

  return (
    <div className="grid h-full grid-rows-[1fr_auto] bg-[color:var(--ground)]">
      <div className="overflow-y-auto p-4">
        <Placeholder label={state.tab} />
      </div>

      {showsChrome(state.phase) ? (
        <TabBar active={state.tab} onSelect={(tab) => dispatch({ type: "tab", tab })} />
      ) : null}
    </div>
  );
}

function TabBar({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <nav
      aria-label="Wallet"
      className="grid grid-cols-4 border-t border-[color:var(--rule)] bg-[color:var(--surface)]"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-current={active === tab ? "page" : undefined}
          onClick={() => onSelect(tab)}
          className={cn(
            "py-2.5 font-display text-xs uppercase tracking-[0.06em]",
            active === tab ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]",
          )}
        >
          {popupHome.tabs[tab]}
        </button>
      ))}
    </nav>
  );
}

function Uninitialized() {
  return (
    <div className="grid h-full content-between gap-6 bg-[color:var(--ground)] p-5">
      <div className="grid gap-4">
        <div className="flex items-center gap-2.5">
          <Mark size={28} slit="var(--ground)" />
          <span className="font-stencil text-2xl uppercase tracking-[0.04em]">
            {common.brand.wordmark}
          </span>
        </div>

        <h1 className="text-display-l">{uninitialized.title}</h1>
        <p className="text-sm text-[color:var(--fg-muted)]">{uninitialized.body}</p>

        <ul className="grid gap-1.5">
          {uninitialized.points.map((point) => (
            <li
              key={point}
              className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
            >
              <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                /
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3">
        <Tag tone="network" size="sm">
          {common.networks.testnet.label}
        </Tag>
        <button
          type="button"
          onClick={() => openOptions("onboarding")}
          className="chamfer-sm h-11 bg-[color:var(--accent)] font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
        >
          {uninitialized.action.label}
        </button>
        <p className="text-center font-mono text-xs text-[color:var(--fg-faint)]">
          {uninitialized.footnote}
        </p>
      </div>
    </div>
  );
}

/** Stands in until each screen lands. Named so the tab bar is testable now. */
function Placeholder({ label }: { label: string }) {
  return (
    <div className="grid place-content-center gap-2 p-6 text-center">
      <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">{label}</span>
    </div>
  );
}
