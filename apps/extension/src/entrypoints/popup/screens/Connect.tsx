import { popupConnect } from "@baret/content/extension/popup/connect.content";
import { common } from "@baret/content/shared/common.content";
import { connect } from "@baret/content/wallet/connect.content";
import { sign } from "@baret/content/wallet/sign.content";
import { Button, truncateAddress } from "@baret/ui";
import { Permissions, SiteBadge } from "@baret/wallet-ui/components/ConnectParts";
import { Parts } from "@baret/wallet-ui/components/Parts";
import { amount } from "@baret/wallet-ui/data/format";
import { fillParts } from "@baret/wallet-ui/lib/parts";
import { DUR } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { counted, fill } from "@baret/web-ui/lib/util";
import { m } from "motion/react";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import type { ConnectSample } from "../../../data/sample.js";
import { activeAccount, useExtension } from "../../../data/store.js";
import { RISE_PX, useCountdown } from "../parts/Requests.js";

/**
 * The connect phase: a site asks to see an address. The window shows the
 * site, one sentence, what it can and cannot do with the same weight; the
 * reader picks the one account the site gets to see. The site address is the
 * one the browser reports. A site that already sees an account offers to
 * switch it or to disconnect instead.
 */

function Note({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "warn" | "plain";
}): JSX.Element {
  return (
    <div
      className={`grid gap-1 border-l-4 py-2.5 pr-3 pl-3 ${tone === "warn" ? "border-[color:var(--blocked)] bg-[color:var(--blocked-dim)]" : "border-[color:var(--rule-strong)] bg-[color:var(--ground-deep)]"}`}
    >
      <p className="text-sm font-semibold leading-tight text-[color:var(--fg)]">{title}</p>
      <p className={T.small}>{body}</p>
    </div>
  );
}

/** The answer replaces the window: focus moves to it, and it rises in quietly. */
function ConnectResult({
  result,
  origin,
  onFinished,
}: {
  result: "connected" | "declined" | "expired";
  origin: string;
  onFinished: () => void;
}): JSX.Element {
  const reduce = useReduce();
  const title = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, []);
  return (
    <m.div
      className="grid content-start gap-4 px-5 py-8"
      initial={reduce ? false : { opacity: 0, y: RISE_PX }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : DUR.enter, ease: "easeOut" }}
    >
      <h1 className="font-display text-3xl font-extrabold uppercase leading-none text-[color:var(--fg)]">
        {connect.title}
      </h1>
      {/* The outcome takes focus, so it is read the moment it replaces the window. */}
      <p ref={title} tabIndex={-1} className={`${T.body} outline-none`}>
        {fill(connect.result[result], { origin })}
      </p>
      <div className="flex">
        <Button type="button" variant="ghost" onClick={onFinished}>
          {common.actions.back}
        </Button>
      </div>
    </m.div>
  );
}

export function ConnectPhase({
  sample,
  onFinished,
}: {
  sample: ConnectSample;
  onFinished: () => void;
}): JSX.Element {
  const { state, dispatch } = useExtension();
  const titleId = useId();
  const pickName = useId();
  const origin = sample.origin.replace(/^https?:\/\//, "");
  const [picked, setPicked] = useState(activeAccount(state)?.id ?? state.active);
  const [remember, setRemember] = useState(false);
  const [result, setResult] = useState<"connected" | "declined" | "expired" | null>(null);
  const left = useCountdown(300, result === null, () => setResult("expired"));
  const reduce = useReduce();

  function answer(next: "connected" | "declined"): void {
    if (next === "connected") {
      dispatch({ type: "connect", origin, account: picked, at: new Date().toISOString() });
    }
    setResult(next);
  }

  if (result) {
    return <ConnectResult result={result} origin={origin} onFinished={onFinished} />;
  }

  return (
    <article aria-labelledby={titleId} className="flex h-full flex-col">
      {/* Relative, so the sr-only legend stays inside the scroller and the page stays 600 px. */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <header className="grid gap-3 px-5 pt-5 pb-4">
          <p className={T.label}>{connect.title}</p>
          <SiteBadge origin={sample.origin} secure={sample.secure} size="sm" />
          <h1
            id={titleId}
            className="font-display text-2xl font-extrabold uppercase leading-[1.05] text-[color:var(--fg)] [overflow-wrap:anywhere]"
          >
            <Parts parts={fillParts(connect.subtitle, { origin }, new Set(["origin"]))} />
          </h1>
          <p className="text-sm text-[color:var(--fg)]">{connect.note}</p>
        </header>

        <m.div
          className="grid gap-4 border-t border-[color:var(--rule)] px-5 py-5"
          initial={reduce ? false : { opacity: 0, y: RISE_PX }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : DUR.enter, ease: "easeOut" }}
        >
          {sample.already ? (
            <div className="grid gap-3 border-l-4 border-[color:var(--rule-strong)] pl-3">
              <div className="grid gap-1">
                <p className="font-display text-base font-bold uppercase leading-tight text-[color:var(--fg)]">
                  {popupConnect.alreadyConnected.title}
                </p>
                <p className={T.small}>{fill(popupConnect.alreadyConnected.body, { origin })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => answer("connected")}>
                  {popupConnect.alreadyConnected.actions.switchAccount}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    dispatch({
                      type: "site",
                      origin,
                      status: "notConnected",
                      at: new Date().toISOString(),
                    });
                    setResult("declined");
                  }}
                >
                  {popupConnect.alreadyConnected.actions.disconnect}
                </Button>
              </div>
            </div>
          ) : (
            <Note
              title={connect.warnings.firstTime.title}
              body={connect.warnings.firstTime.body}
              tone="plain"
            />
          )}
          {!sample.secure ? (
            <Note
              title={connect.warnings.insecure.title}
              body={connect.warnings.insecure.body}
              tone="warn"
            />
          ) : null}
          {sample.multipleWallets ? (
            <Note
              title={popupConnect.multipleWallets.title}
              body={popupConnect.multipleWallets.body}
              tone="plain"
            />
          ) : null}
          <p className={T.small}>{connect.originNote}</p>
        </m.div>

        <div className="border-t border-[color:var(--rule)] px-5 py-5">
          <Permissions can={popupConnect.can} cannot={popupConnect.cannot} dense />
        </div>

        <fieldset className="grid gap-2 border-t border-[color:var(--rule)] px-5 py-5">
          <legend className="sr-only">{popupConnect.accountPicker.title}</legend>
          <p className={T.label} aria-hidden="true">
            {popupConnect.accountPicker.title}
          </p>
          <p className={T.small}>{fill(popupConnect.accountPicker.body, { origin })}</p>
          <div className="mt-1 grid gap-1.5">
            {state.accounts.map((account) => (
              <label key={account.id} className="relative block cursor-pointer">
                <input
                  type="radio"
                  name={pickName}
                  value={account.id}
                  checked={picked === account.id}
                  onChange={() => setPicked(account.id)}
                  className="peer absolute inset-0 size-full cursor-pointer appearance-none"
                />
                <span className="pointer-events-none grid gap-0.5 border border-[color:var(--control-edge)] px-3 py-2.5 transition-colors peer-hover:border-[color:var(--fg)] peer-checked:border-[color:var(--fg)] peer-checked:bg-[color:var(--fg)] peer-checked:text-[color:var(--ground)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-[color:var(--accent)]">
                  <span className="flex items-baseline justify-between gap-3 text-sm font-medium">
                    {account.name}
                    <span className={`text-xs ${T.num}`}>{amount(account.balance)} MON</span>
                  </span>
                  <span className="font-mono text-xs opacity-80">
                    {truncateAddress(account.address)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-1 border-t border-[color:var(--rule)] px-5 py-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[color:var(--fg)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.currentTarget.checked)}
              className="size-5 shrink-0 accent-[color:var(--fg)]"
            />
            {connect.remember.label}
          </label>
          <p className={T.small}>{connect.remember.hint}</p>
        </div>
      </div>

      <footer className="grid shrink-0 gap-2.5 border-t border-[color:var(--rule-strong)] bg-[color:var(--ground)] px-5 pt-3 pb-3">
        {/* With no secure connection, the safer answer carries the weight: Decline is primary. */}
        <div className="grid grid-cols-2 gap-2">
          {sample.secure ? (
            <>
              <Button type="button" variant="ghost" onClick={() => answer("declined")}>
                {connect.actions.reject}
              </Button>
              <Button type="button" variant="primary" onClick={() => answer("connected")}>
                {connect.actions.approve}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => answer("connected")}>
                {connect.actions.approve}
              </Button>
              <Button type="button" variant="primary" onClick={() => answer("declined")}>
                {connect.actions.reject}
              </Button>
            </>
          )}
        </div>
        <div className="grid gap-0.5">
          <p className={`font-mono text-xs text-[color:var(--fg)] ${T.num}`} aria-hidden="true">
            {counted(left, sign.countdown.label, sign.countdown.labelOne, {
              seconds: String(left),
            })}
          </p>
          <p className="text-xs text-[color:var(--fg-muted)]">{popupConnect.windowNote}</p>
        </div>
      </footer>
    </article>
  );
}
