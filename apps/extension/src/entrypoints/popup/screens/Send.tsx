import { popupSend } from "@baret/content/extension/popup/send.content";
import { send } from "@baret/content/wallet/send.content";
import { Button, ChangeRow, truncateAddress } from "@baret/ui";
import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import {
  type AmountIssue,
  checkAmount,
  checkRecipient,
  feeFor,
  lookalikeOf,
  maxOf,
  type RecipientIssue,
  transferRequest,
} from "@baret/wallet-ui/send/send";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { activeAccount, useExtension } from "../../../data/store.js";
import type { Asset, PopupRequest } from "../../../data/types.js";
import { useLatest } from "../../../lib/useLatest.js";
import { PopupEmpty } from "../frame/bits.js";
import { Sheet } from "../frame/Sheet.js";

/**
 * Send, the compact form: the asset, the recipient, the amount with Max,
 * what it costs and what is left. Errors sit under their field and say what
 * to do. A token contract as the recipient stops the form; another contract
 * warns without stopping; a look-alike of an address from the history is
 * called out before the review (address poisoning). "Review" opens the full
 * sign request: a transfer from the popup gets the same check as a site's.
 */

const { errors, poisoning } = send;

const INPUT =
  "h-11 w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 text-base text-[color:var(--fg)] placeholder:text-[color:var(--fg-muted)] focus-visible:border-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

function recipientError(issue: RecipientIssue, asset?: string) {
  if (issue === "tokenContract") {
    return {
      title: popupSend.tokenContract.title,
      body: fill(popupSend.tokenContract.body, { asset: asset ?? "" }),
    };
  }
  const words = errors[issue];
  return { title: fill(words.title, { asset: asset ?? "" }), body: words.body };
}

function amountError(issue: AmountIssue, asset: Asset) {
  if (issue.issue === "amountZero") return errors.amountZero;
  if (issue.issue === "noFee")
    return { title: errors.noFee.title, body: fill(errors.noFee.body, { amount: issue.amount }) };
  return {
    title: fill(errors.amountTooHigh.title, { asset: asset.symbol }),
    body: fill(errors.amountTooHigh.body, { amount: `${issue.short} ${asset.symbol}` }),
  };
}

function Note({
  id,
  title,
  body,
  tone = "error",
  children,
}: {
  id: string;
  title: string;
  body: string;
  tone?: "error" | "note";
  children?: JSX.Element;
}): JSX.Element {
  return (
    <div
      id={id}
      className={`grid gap-0.5 border-l-4 pl-3 ${tone === "error" ? "border-[color:var(--blocked)]" : "border-[color:var(--rule-strong)]"}`}
    >
      <p className="text-sm font-medium text-[color:var(--fg)]">{title}</p>
      <p className={T.small}>{body}</p>
      {children}
    </div>
  );
}

export function Send({
  onClose,
  onReceive,
  onReview,
}: {
  onClose: () => void;
  onReceive: () => void;
  onReview: (request: PopupRequest) => void;
}): JSX.Element {
  const { state } = useExtension();
  const account = activeAccount(state);
  const ids = {
    asset: useId(),
    to: useId(),
    toNote: useId(),
    amount: useId(),
    amountNote: useId(),
  };
  const [symbol, setSymbol] = useState(state.assets[0]?.symbol ?? "MON");
  const [recipient, setRecipient] = useState("");
  const [value, setValue] = useState("");
  const [tried, setTried] = useState(false);
  const [kept, setKept] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const asset = state.assets.find((a) => a.symbol === symbol) ?? state.assets[0];
  const mon = state.assets.find((a) => a.symbol === "MON");
  const empty = !asset || !mon || (toUnits(mon.balance, 18) ?? 0n) === 0n;

  const review = useLatest(() => {
    if (!asset) return;
    const request = transferRequest(asset, value, recipient.trim(), state.policy);
    onReview({
      kind: "transaction",
      id: `own-${Date.now()}`,
      network: state.network,
      request,
      firstTime: false,
    });
  });

  // "Checking the address": a short wait that stands in for the server.
  useEffect(() => {
    if (!scanning) return;
    const id = window.setTimeout(() => review.current(), 500);
    return () => window.clearTimeout(id);
  }, [scanning, review]);

  if (empty || !asset) {
    return (
      <Sheet title={popupSend.title} onClose={onClose}>
        <PopupEmpty
          picture={POPUP_ART.send}
          title={popupSend.empty.title}
          body={popupSend.empty.body}
          action={
            <Button type="button" variant="ghost" size="sm" onClick={onReceive}>
              {popupSend.empty.action.label}
            </Button>
          }
        />
      </Sheet>
    );
  }

  const sentTo = state.activity
    .filter((item) => item.kind === "sent" && item.counterparty)
    .map((item) => item.counterparty ?? "");
  const toIssue =
    recipient.trim() === ""
      ? { issue: "invalidAddress" as const }
      : checkRecipient(recipient, account?.address ?? "", state.assets);
  const amountIssue = checkAmount(value, asset, state.assets);
  const blocking = toIssue && toIssue.issue !== "contractAddress";
  const expected = lookalikeOf(recipient, sentTo);
  const warnPoisoning = expected !== null && kept !== recipient.trim();

  const fee = feeFor(asset.symbol);
  const units = toUnits(value, asset.decimals);
  const left = (() => {
    const balance = toUnits(asset.balance, asset.decimals) ?? 0n;
    const spend = (units ?? 0n) + (asset.symbol === "MON" ? (toUnits(fee, 18) ?? 0n) : 0n);
    return balance >= spend ? fromUnits(balance - spend, asset.decimals, { group: true }) : "0.00";
  })();
  const total =
    asset.symbol === "MON"
      ? fromUnits((units ?? 0n) + (toUnits(fee, 18) ?? 0n), 18, { group: true })
      : fromUnits(units ?? 0n, asset.decimals, { group: true });

  const showTo = tried && toIssue;
  const showAmount = tried && amountIssue;

  return (
    <Sheet title={popupSend.title} onClose={onClose}>
      <form
        noValidate
        className="grid gap-5 px-4 pt-4 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (blocking || amountIssue || warnPoisoning) return;
          setScanning(true);
        }}
      >
        <fieldset className="grid gap-2">
          <legend className={T.label}>{popupSend.fields.asset.label}</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {state.assets.map((a) => (
              <Segment
                key={a.symbol}
                name={ids.asset}
                value={a.symbol}
                checked={a.symbol === asset.symbol}
                label={a.symbol}
                faceClassName="justify-center px-3 font-display text-base font-bold uppercase"
                onSelect={setSymbol}
              />
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <label htmlFor={ids.to} className={T.label}>
            {popupSend.fields.recipient.label}
          </label>
          <input
            id={ids.to}
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setKept(null);
            }}
            placeholder={popupSend.fields.recipient.placeholder}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={showTo && blocking ? true : undefined}
            aria-describedby={
              showTo || (toIssue?.issue === "contractAddress" && recipient) ? ids.toNote : undefined
            }
            className={`${INPUT} font-mono text-sm`}
          />
          {showTo && toIssue && blocking ? (
            <Note id={ids.toNote} {...recipientError(toIssue.issue, toIssue.asset)}>
              {toIssue.issue === "tokenContract" ? (
                <button
                  type="button"
                  onClick={() => setRecipient("")}
                  className="w-max pt-1 text-sm font-medium text-[color:var(--fg)] underline underline-offset-4"
                >
                  {popupSend.tokenContract.action.label}
                </button>
              ) : undefined}
            </Note>
          ) : toIssue?.issue === "contractAddress" ? (
            <Note id={ids.toNote} tone="note" {...recipientError("contractAddress")} />
          ) : null}
          {warnPoisoning && expected ? (
            <div
              role="alert"
              className="grid gap-2 border-l-4 border-[color:var(--caution)] bg-[color:var(--surface)] py-2.5 pr-3 pl-3"
            >
              <p className="font-display text-base font-bold uppercase leading-tight text-[color:var(--fg)]">
                {poisoning.title}
              </p>
              <p className={`${T.small} [overflow-wrap:anywhere]`}>
                {fill(poisoning.body, { expected: truncateAddress(expected) })}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecipient(expected)}
                >
                  {poisoning.action.label}
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => setKept(recipient.trim())}
                >
                  {poisoning.keep.label}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={ids.amount} className={T.label}>
              {popupSend.fields.amount.label}
            </label>
            <span className={`text-xs text-[color:var(--fg-muted)] ${T.num}`}>
              {fill(popupSend.fields.amount.available, {
                amount: fromUnits(toUnits(asset.balance, asset.decimals) ?? 0n, asset.decimals, {
                  group: true,
                }),
                asset: asset.symbol,
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              id={ids.amount}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={showAmount ? true : undefined}
              aria-describedby={showAmount ? ids.amountNote : undefined}
              className={`${INPUT} font-display text-xl font-bold ${T.num}`}
            />
            <Button type="button" variant="ghost" onClick={() => setValue(maxOf(asset))}>
              {popupSend.fields.amount.max}
            </Button>
          </div>
          {showAmount && amountIssue ? (
            <Note id={ids.amountNote} {...amountError(amountIssue, asset)} />
          ) : null}
        </div>

        <div className="grid border-y border-[color:var(--rule)] py-2">
          <ChangeRow label={popupSend.summary.fee} value={fee} unit="MON" />
          <ChangeRow label={popupSend.summary.total} value={total} unit={asset.symbol} />
          <ChangeRow label={popupSend.summary.remaining} value={left} unit={asset.symbol} />
        </div>

        <div className="grid gap-2">
          <Button type="submit" variant="primary" size="lg" block disabled={scanning}>
            {scanning ? popupSend.scanning : popupSend.action.label}
          </Button>
          <p className={T.small}>{popupSend.reviewNote}</p>
        </div>
      </form>
    </Sheet>
  );
}
