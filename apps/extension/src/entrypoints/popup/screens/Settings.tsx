import { popupSettings } from "@baret/content";
import { Button } from "@baret/ui";
import { Img } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ChevronRight } from "lucide-react";
import { type JSX, useEffect, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { payments, rulesTemplate } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import { useLatest } from "../../../lib/useLatest.js";
import { TabTitle } from "../frame/bits.js";
import { Confirm } from "../frame/Sheet.js";
import type { OptionsLink } from "../navigation.js";

/**
 * Settings, compact (docs/WALLET.md 2.4): six rows, each opening its full
 * version on the options page, then lock and reset. The rules row names the
 * template only while the rules still match it, and says Custom once they
 * drift. Reset states what it deletes and what stays on Monad, and stays
 * locked until the reader confirms they hold the recovery phrase.
 */
export function SettingsTab({
  onOpen,
  onLock,
  onReset,
}: {
  onOpen: (link: OptionsLink) => void;
  onLock: () => void;
  onReset: () => void;
}): JSX.Element {
  const { state } = useExtension();
  const [confirm, setConfirm] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState(false);
  const { rows, actions, reset } = popupSettings;

  // The reset, stood in for by a short wait.
  const resetNow = useLatest(onReset);
  useEffect(() => {
    if (!working) return;
    const id = window.setTimeout(() => resetNow.current(), 700);
    return () => window.clearTimeout(id);
  }, [working, resetNow]);

  const list: { key: string; label: string; hint: string; link: OptionsLink }[] = [
    { key: "network", label: rows.network.label, hint: rows.network.hint, link: "settings" },
    {
      key: "rules",
      label: rows.rules.label,
      hint: rows.rules.hint[rulesTemplate(state)],
      link: "policies",
    },
    {
      key: "security",
      label: rows.security.label,
      hint: fill(rows.security.hint, { count: String(state.settings.lockMinutes) }),
      link: "settings",
    },
    {
      key: "sites",
      label: rows.sites.label,
      hint: fill(rows.sites.hint, {
        count: String(state.sites.filter((s) => s.status === "connected").length),
      }),
      link: "sites",
    },
    {
      key: "payments",
      label: rows.payments.label,
      hint: fill(rows.payments.hint, { count: String(payments(state.permissions).length) }),
      link: "payments",
    },
    { key: "about", label: rows.about.label, hint: rows.about.hint, link: "settings" },
  ];

  return (
    <div className="pb-5">
      <div
        className="relative aspect-[5/2] overflow-hidden border-b border-[color:var(--rule)]"
        style={{ backgroundColor: POPUP_ART.settings.ground }}
      >
        <Img asset={POPUP_ART.settings} sizes="360px" position="50% 50%" />
      </div>
      <TabTitle title={popupSettings.title} />
      <ul className="grid border-t border-[color:var(--rule)]">
        {list.map((row) => (
          <li key={row.key} className="border-b border-[color:var(--rule)]">
            <button
              type="button"
              onClick={() => onOpen(row.link)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-medium text-[color:var(--fg)]">{row.label}</span>
                <span className={`${T.small} truncate`}>{row.hint}</span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-[color:var(--fg-muted)]"
                strokeWidth={1.75}
              />
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 px-4 pt-5">
        <Button type="button" variant="ghost" block onClick={() => onOpen("settings")}>
          {actions.openFull}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="soft" onClick={onLock}>
            {actions.lock}
          </Button>
          <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
            {actions.reset}
          </Button>
        </div>
      </div>

      <Confirm
        open={confirm}
        title={reset.title}
        action={working ? reset.working : reset.action}
        cancel={reset.cancel}
        disabled={!acknowledged || working}
        onCancel={() => {
          if (working) return;
          setConfirm(false);
          setAcknowledged(false);
        }}
        onConfirm={() => {
          if (acknowledged) setWorking(true);
        }}
      >
        <p className="text-sm text-[color:var(--fg)]">{reset.body}</p>
        <p className={T.small}>{reset.funds}</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[color:var(--fg)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.currentTarget.checked)}
            className="size-5 shrink-0 accent-[color:var(--fg)]"
          />
          {reset.acknowledge}
        </label>
      </Confirm>
    </div>
  );
}
