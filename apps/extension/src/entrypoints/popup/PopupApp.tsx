import { common, popupHome, uninitialized } from "@baret/content";
import { Mark, Tag } from "@baret/ui";

/**
 * The popup. 360 by 600, no router: the phase decides which screen renders,
 * and a sign request replaces everything.
 *
 * Phases come from docs/WALLET.md section 1.1:
 *   uninitialized | locked | ready | signing | alert
 */
export function PopupApp() {
  // TODO(week 2): read the real phase over the messaging port.
  const phase = "uninitialized" as const;

  if (phase === "uninitialized") return <Uninitialized />;
  return null;
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
          onClick={() => browser.runtime.openOptionsPage()}
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

/** Exported so the tab bar labels stay in one place once phases land. */
export const TABS = popupHome.tabs;
