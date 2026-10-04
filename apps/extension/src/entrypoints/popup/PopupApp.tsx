import { extFrame } from "@baret/content";
import { AnimatePresence, m } from "motion/react";
import { type JSX, useReducer, useState } from "react";
import { unread } from "../../data/derive.js";
import { CONNECTS, queueOf } from "../../data/sample.js";
import { activeAccount, useExtension } from "../../data/store.js";
import { type Start, scenarioQuery } from "../../lib/start.js";
import { TabBar, TopStrip } from "./frame/Chrome.js";
import { SamplePanel, SampleStrip } from "./frame/Sample.js";
import {
  openOptions,
  openOptionsPath,
  type Phase,
  reducePopup,
  showsChrome,
} from "./navigation.js";
import { Accounts } from "./screens/Accounts.js";
import { ActivityTab } from "./screens/Activity.js";
import { Alerts } from "./screens/Alerts.js";
import { AllowancesTab } from "./screens/Allowances.js";
import { ConnectPhase } from "./screens/Connect.js";
import { Home } from "./screens/Home.js";
import { Locked, type LockReason } from "./screens/Locked.js";
import { Receive } from "./screens/Receive.js";
import { Send } from "./screens/Send.js";
import { SettingsTab } from "./screens/Settings.js";
import { SignPhase } from "./screens/Sign.js";
import { Swap } from "./screens/Swap.js";
import { Uninitialized } from "./screens/Uninitialized.js";

/**
 * The popup, 360 by 600.
 *
 * Navigation is a state machine rather than a router, for the reason set out
 * in navigation.ts: a pending signature has to own the whole canvas, and a
 * router makes that rule one stray link away from being broken.
 *
 * The phase comes from the background once it is wired. Until then the
 * sample picker under the notice at the top stands in for it, and the store
 * (data/store.tsx) holds the sample wallet. The picker's strip stays off the
 * request screens (signing, connecting), which own the whole canvas.
 */

export function PopupApp({
  start,
  onRestart,
}: {
  start: Start;
  onRestart: (start: Start) => void;
}): JSX.Element {
  const { state, dispatch, check } = useExtension();
  const [nav, go] = useReducer(reducePopup, {
    phase: (start.phase === "alert" ? "alert" : start.phase) satisfies Phase,
    tab: "home",
    overlay: null,
  });
  const [picker, setPicker] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>("idle");
  // A transfer from the Send form becomes the request the signing phase shows.
  const [own, setOwn] = useState<ReturnType<typeof queueOf> | null>(null);
  const query = scenarioQuery(state.scenario, start.reachable);
  // Restore and the forgot-passphrase reset start from an empty wallet, never
  // the sample this popup shows.
  const restore = `${scenarioQuery("empty", start.reachable)}&restore=1`;
  const account = activeAccount(state);
  const alertsUnread = unread(state.alerts);

  // A decided request, an opened lock: back to the wallet, on the last tab viewed.
  const ready = () => go({ type: "phase", phase: start.phase === "alert" ? "alert" : "ready" });

  let body: JSX.Element;
  if (nav.phase === "uninitialized") {
    body = (
      <Uninitialized
        onSetup={() => openOptions("onboarding", query)}
        onRestore={() => openOptionsPath("/onboarding", restore)}
      />
    );
  } else if (nav.phase === "locked") {
    body = (
      <Locked
        reason={lockReason}
        values={{ count: String(state.settings.lockMinutes), origin: "" }}
        onOpen={ready}
        onReset={() => openOptionsPath("/onboarding", restore)}
      />
    );
  } else if (nav.phase === "signing") {
    body = (
      <SignPhase
        queue={own ?? queueOf(start.request)}
        onFinished={() => {
          setOwn(null);
          ready();
        }}
      />
    );
  } else if (nav.phase === "connecting") {
    body = <ConnectPhase sample={CONNECTS[start.connect]} onFinished={ready} />;
  } else {
    body = (
      <div className="flex h-full flex-col">
        <h1 className="sr-only">{extFrame.popup.title}</h1>
        <TopStrip
          account={account}
          unread={alertsUnread}
          onAccounts={() => go({ type: "overlay", overlay: "accounts" })}
          onAlerts={() => go({ type: "overlay", overlay: "alerts" })}
          onSettings={() => go({ type: "tab", tab: "settings" })}
        />
        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={nav.tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              // Covered by a sheet: out of the tab order and away from readers.
              inert={nav.overlay !== null}
              className="absolute inset-0 overflow-y-auto overscroll-contain"
            >
              {nav.tab === "home" ? (
                <Home
                  onSend={() => go({ type: "overlay", overlay: "send" })}
                  onReceive={() => go({ type: "overlay", overlay: "receive" })}
                  onSwap={() => go({ type: "overlay", overlay: "swap" })}
                  onActivity={() => go({ type: "tab", tab: "activity" })}
                  onAllowances={() => go({ type: "tab", tab: "allowances" })}
                  onTokens={() => openOptions("home", query)}
                  onBanner={(target) => {
                    if (target === "alerts") go({ type: "overlay", overlay: "alerts" });
                    else if (target === "allowances") go({ type: "tab", tab: "allowances" });
                    else if (target === "payments") openOptions("payments", query);
                    else if (target === "settings") openOptions("settings", query);
                    // Retry asks again: Baret counts as unreachable until it answers.
                    else check();
                  }}
                />
              ) : nav.tab === "activity" ? (
                <ActivityTab onFull={() => openOptions("activity", query)} />
              ) : nav.tab === "allowances" ? (
                <AllowancesTab
                  onEditCaps={() => openOptions("payments", query)}
                  onFull={() => openOptions("allowances", query)}
                />
              ) : (
                <SettingsTab
                  onOpen={(link) => openOptions(link, query)}
                  onLock={() => {
                    setLockReason("manual");
                    go({ type: "phase", phase: "locked" });
                  }}
                  onReset={() => {
                    dispatch({ type: "reset" });
                    go({ type: "phase", phase: "uninitialized" });
                  }}
                />
              )}
            </m.div>
          </AnimatePresence>
          <AnimatePresence>
            {nav.overlay === "send" ? (
              <Send
                key="send"
                onClose={() => go({ type: "overlay", overlay: null })}
                onReceive={() => go({ type: "overlay", overlay: "receive" })}
                onReview={(request) => {
                  setOwn([request]);
                  go({ type: "phase", phase: "signing" });
                }}
              />
            ) : nav.overlay === "receive" ? (
              <Receive key="receive" onClose={() => go({ type: "overlay", overlay: null })} />
            ) : nav.overlay === "swap" ? (
              <Swap key="swap" onClose={() => go({ type: "overlay", overlay: null })} />
            ) : nav.overlay === "accounts" ? (
              <Accounts key="accounts" onClose={() => go({ type: "overlay", overlay: null })} />
            ) : nav.overlay === "alerts" ? (
              <Alerts
                key="alerts"
                onClose={() => go({ type: "overlay", overlay: null })}
                onTarget={(target) => {
                  if (target === "allowances") go({ type: "tab", tab: "allowances" });
                  else if (target === "activity") go({ type: "tab", tab: "activity" });
                  else if (target === "payments") openOptions("payments", query);
                  else openOptions("settings", query);
                }}
              />
            ) : null}
          </AnimatePresence>
        </div>
        {showsChrome(nav.phase) ? (
          <TabBar
            active={nav.tab}
            badge={alertsUnread > 0}
            onSelect={(tab) => go({ type: "tab", tab })}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[color:var(--ground)] text-[color:var(--fg)]">
      {nav.phase === "signing" || nav.phase === "connecting" ? null : (
        <SampleStrip onOpen={() => setPicker(true)} />
      )}
      <main className="relative min-h-0 flex-1">{body}</main>
      <SamplePanel
        open={picker}
        start={start}
        onClose={() => setPicker(false)}
        onApply={(next) => {
          setPicker(false);
          onRestart(next);
        }}
      />
    </div>
  );
}
