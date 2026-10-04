import { alerts } from "@baret/content/extension/popup/alerts.content";
import { Button } from "@baret/ui";
import { Parts } from "@baret/wallet-ui/components/Parts";
import { T } from "@baret/web-ui/lib/type";
import { m } from "motion/react";
import type { JSX } from "react";
import { POPUP_ART } from "../../../assets.js";
import { ago, unread } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import type { AlertKind } from "../../../data/types.js";
import { alertBody, headline } from "../../../data/words.js";
import { PopupEmpty, TEXT_BUTTON, TextButton } from "../frame/bits.js";
import { Sheet } from "../frame/Sheet.js";

/**
 * Alerts: what Baret noticed after a signature, or without one. Each alert
 * names what changed and offers one way to act; findings on a sign request
 * are not alerts. Unread ones carry a mark and the most urgent edges.
 */

export type AlertTarget = "activity" | "allowances" | "payments" | "settings";

const TARGET: Record<AlertKind, AlertTarget> = {
  drift: "activity",
  newAllowance: "allowances",
  watched: "activity",
  capReached: "payments",
  capNear: "allowances",
  revoked: "allowances",
  unsettled: "payments",
  unchecked: "activity",
};

const URGENT: ReadonlySet<AlertKind> = new Set(["drift", "newAllowance", "unchecked"]);

export function Alerts({
  onClose,
  onTarget,
}: {
  onClose: () => void;
  onTarget: (target: AlertTarget) => void;
}): JSX.Element {
  const { state, dispatch } = useExtension();
  const count = unread(state.alerts);

  return (
    <Sheet title={alerts.title} onClose={onClose}>
      {state.alerts.length === 0 ? (
        <PopupEmpty
          picture={POPUP_ART.alerts}
          title={alerts.empty.title}
          body={alerts.empty.body}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
            <p className={T.small}>{alerts.body}</p>
            {count > 0 ? (
              <span className="shrink-0 whitespace-nowrap">
                <TextButton onClick={() => dispatch({ type: "readAlerts" })}>
                  {alerts.actions.markAllRead}
                </TextButton>
              </span>
            ) : null}
          </div>
          <ul className="grid border-t border-[color:var(--rule)]">
            {state.alerts.map((alert, i) => (
              <m.li
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.24,
                  delay: Math.min(i, 5) * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`grid gap-2 border-b border-[color:var(--rule)] border-l-4 py-4 pr-4 pl-3 ${URGENT.has(alert.kind) ? "border-l-[color:var(--blocked)]" : alert.read ? "border-l-transparent" : "border-l-[color:var(--caution)]"}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-base font-bold uppercase leading-tight tracking-[0.02em] text-[color:var(--fg)] [overflow-wrap:anywhere]">
                    {!alert.read ? <span className="sr-only">{`${alerts.unread}: `}</span> : null}
                    <Parts parts={headline(alerts.types[alert.kind].title, alert.values)} />
                  </p>
                  <time
                    dateTime={alert.at}
                    className={`shrink-0 font-mono text-xs text-[color:var(--fg-muted)] ${T.num}`}
                  >
                    {ago(alert.at)}
                  </time>
                </div>
                <p className={`${T.small} [overflow-wrap:anywhere]`}>{alertBody(alert)}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onTarget(TARGET[alert.kind])}
                  >
                    {alerts.types[alert.kind].action.label}
                  </Button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "dismissAlert", id: alert.id })}
                    className={`${TEXT_BUTTON} px-2`}
                  >
                    {alerts.actions.dismiss}
                  </button>
                </div>
              </m.li>
            ))}
          </ul>
        </>
      )}
      <div className="grid gap-1 px-4 pt-4 pb-5">
        <button
          type="button"
          onClick={() => onTarget("settings")}
          className={`${TEXT_BUTTON} w-max`}
        >
          {alerts.settings.label}
        </button>
        <p className={T.small}>{alerts.settings.hint}</p>
      </div>
    </Sheet>
  );
}
