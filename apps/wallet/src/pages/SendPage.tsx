import { receive, send, sign, walletFrame } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Block, Problem, Rows } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount, fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import { ready, useWallet } from "@baret/wallet-ui/data/store";
import type { Asset, SignRequest as Request } from "@baret/wallet-ui/data/types";
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
import { SignRequest } from "@baret/wallet-ui/sign/SignRequest";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { WALLET_ART } from "../assets.js";
import { type LiveRequest, useLive } from "../live/live.js";
import { sessionTime } from "../live/session.js";
import { signWithSettings } from "../live/signWithSettings.js";
import { routes } from "../routes.js";
import { unchecked } from "./unchecked.js";

/**
 * Send: the asset, the recipient and the amount, a summary, and "Check and
 * review", which opens the same sign request a site's request gets. Before
 * the review, a recipient that imitates an address from the account's
 * history is called out (address poisoning). Errors sit under their field
 * and say what to do; a contract recipient warns without stopping.
 */

const { fields, summary, action, errors, poisoning } = send;

const INPUT =
  "w-full border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-4 py-3 text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)]";

function recipientError(issue: RecipientIssue, asset?: string): { title: string; body: string } {
  const words = errors[issue];
  return { title: fill(words.title, { asset: asset ?? "" }), body: words.body };
}

function amountError(issue: AmountIssue, asset: Asset): { title: string; body: string } {
  if (issue.issue === "amountZero") return errors.amountZero;
  if (issue.issue === "noFee")
    return { title: errors.noFee.title, body: fill(errors.noFee.body, { amount: issue.amount }) };
  return {
    title: fill(errors.amountTooHigh.title, { asset: asset.symbol }),
    body: fill(errors.amountTooHigh.body, { amount: `${issue.short} ${asset.symbol}` }),
  };
}

function FieldError({
  id,
  error,
  tone = "error",
}: {
  id: string;
  error: { title: string; body: string };
  tone?: "error" | "note";
}): JSX.Element {
  return (
    <div
      id={id}
      className={`grid gap-0.5 border-l-4 pl-3 ${tone === "error" ? "border-[color:var(--blocked)]" : "border-[color:var(--rule-strong)]"}`}
    >
      <p className="text-sm font-medium text-[color:var(--fg)]">{error.title}</p>
      <p className={T.small}>{error.body}</p>
    </div>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const live = useLive();
  // Live: Baret's answer is on its way, and what can be signed once it is in.
  const [pending, setPending] = useState(false);
  const signable = useRef<LiveRequest["signable"]>(null);
  const ids = {
    asset: useId(),
    to: useId(),
    toHint: useId(),
    toError: useId(),
    amount: useId(),
    amountHint: useId(),
    amountError: useId(),
  };
  const [symbol, setSymbol] = useState(state.assets[0]?.symbol ?? "MON");
  const [recipient, setRecipient] = useState("");
  const [value, setValue] = useState("");
  const [tried, setTried] = useState(false);
  const [kept, setKept] = useState<string | null>(null);
  const [review, setReview] = useState<Request | null>(null);
  const [run, setRun] = useState(0);

  const asset = state.assets.find((a) => a.symbol === symbol) ?? state.assets[0];
  // Fail-closed: no readable balance, or nothing held, means nothing to send.
  if (!ready(state, "balances") || !asset) {
    const reason = ready(state, "balances") ? send.errors.noAssets : send.errors.balance;
    return (
      <Screen title={send.title} body={send.body} picture={WALLET_ART.send}>
        <Problem
          title={reason.title}
          body={reason.body}
          {...(reason === send.errors.noAssets
            ? {
                // A new tab, so the open session is still here on the way back.
                action: (
                  <LinkButton
                    href={walletFrame.links.faucet}
                    label={receive.faucet.action.label}
                    icon="arrow-up-right"
                    newTab
                  />
                ),
              }
            : {})}
        />
      </Screen>
    );
  }

  const sentTo = state.activity
    .filter((item) => item.kind === "sent")
    .map((item) => item.values.recipient ?? "");
  const toIssue =
    recipient.trim() === ""
      ? { issue: "invalidAddress" as const }
      : checkRecipient(recipient, state.address, state.assets);
  const amountIssue = checkAmount(value, asset, state.assets);
  const blocking = toIssue && toIssue.issue !== "contractAddress";
  const expected = lookalikeOf(recipient, sentTo);
  const warnPoisoning = expected !== null && kept !== recipient.trim();

  const fee = feeFor(asset.symbol);
  const units = toUnits(value, asset.decimals);
  const shown = units === null ? "0.00" : fromUnits(units, asset.decimals, { group: true });
  // Live: the fee is read from the chain on the sign request, so the summary
  // does not guess it; the sample keeps its constant.
  const left = (() => {
    const balance = toUnits(asset.balance, asset.decimals) ?? 0n;
    const feeUnits = asset.symbol === "MON" && !live ? (toUnits(fee, 18) ?? 0n) : 0n;
    const spend = (units ?? 0n) + feeUnits;
    return fromUnits(balance - spend, asset.decimals, { group: true });
  })();

  function check(): void {
    setTried(true);
    if (blocking || amountIssue || warnPoisoning || !asset) return;
    const request = transferRequest(asset, value, recipient.trim(), state.policy);
    if (live) {
      // Live: the screen shows Checking on an unchecked request until the
      // server answers; with no answer it stays Can't reach Baret.
      signable.current = null;
      setReview(unchecked(request));
      setPending(true);
      void ask().then(() => setPending(false));
      return;
    }
    // Without Baret the transfer is not checked, so it reads as unreachable and is not sent.
    setReview(ready(state, "analyzer") ? request : unchecked(request));
  }

  /** Live: builds the transfer, asks Baret and shows what came back. */
  async function ask(): Promise<Request | null> {
    if (!live || !asset) return null;
    const answer = await live.transfer(asset, value, recipient.trim());
    signable.current = answer.signable;
    setReview(answer.request);
    return answer.request;
  }

  /** Live: signs and sends what Baret cleared, after the passkey when the setting asks for it. */
  async function signLive(
    outcome: "sent" | "overridden",
    sending: () => void,
    progress: (step: "signing" | "sending") => void,
  ) {
    const cleared = signable.current;
    if (!live || !cleared) throw new Error("nothing was cleared to sign");
    return signWithSettings(
      live,
      state.settings.passkeyEverySignature,
      cleared,
      outcome,
      sending,
      progress,
    );
  }

  // Live: an open session signs without a prompt, and the request says until when.
  const sessionNote =
    live && state.sessionEndsAt && !state.settings.passkeyEverySignature
      ? fill(sign.session.note, { time: sessionTime(state.sessionEndsAt) })
      : null;

  if (review) {
    return (
      <Screen title={send.title} body={send.body}>
        <div className="max-w-[640px]">
          <SignRequest
            key={run}
            request={review}
            onDecline={() => setReview(null)}
            onAgain={() => {
              setReview(null);
              setRecipient("");
              setValue("");
              setTried(false);
              setRun((n) => n + 1);
            }}
            {...(live
              ? {
                  pending,
                  onCheckAgain: ask,
                  onSign: signLive,
                  explorer: (hash: string) => `${walletFrame.links.explorer}/tx/${hash}`,
                  // The wallet does not sign a block: the way past is the rule.
                  canOverride: false,
                }
              : {})}
            {...(sessionNote ? { sessionNote } : {})}
            // KIMI words a checked answer only: its id is Baret's requestId.
            {...(live && review.verdict !== "unreachable" ? { explainId: review.id } : {})}
            onLog={(item) =>
              // Live balances are read from Monad after the send, never worked out here.
              !live && (item.kind === "sent" || item.kind === "overridden")
                ? dispatch({ type: "send", asset: asset.symbol, amount: value, fee, item })
                : dispatch({ type: "log", item })
            }
            passkey={state.settings.passkeyEverySignature}
            editRules={(label, className) => (
              <Link to={routes.policies.path} className={className}>
                {label}
              </Link>
            )}
          />
        </div>
      </Screen>
    );
  }

  return (
    <Screen title={send.title} body={send.body} picture={WALLET_ART.send}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          check();
        }}
        className="grid gap-12 lg:grid-cols-12 lg:gap-8"
      >
        <div className="grid content-start gap-8 lg:col-span-7">
          <fieldset className="grid gap-3">
            <legend className={T.label}>{fields.asset.label}</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {state.assets.map((option) => (
                <Segment
                  key={option.symbol}
                  name={ids.asset}
                  value={option.symbol}
                  checked={symbol === option.symbol}
                  label={option.symbol}
                  onSelect={(next) => setSymbol(next)}
                />
              ))}
            </div>
            <p className={T.small}>{fields.asset.hint}</p>
          </fieldset>

          <div className="grid gap-2">
            <label htmlFor={ids.to} className={T.label}>
              {fields.recipient.label}
            </label>
            <input
              id={ids.to}
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value);
                setKept(null);
              }}
              placeholder={fields.recipient.placeholder}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={tried && blocking ? true : undefined}
              aria-describedby={tried && toIssue ? `${ids.toHint} ${ids.toError}` : ids.toHint}
              className={`${INPUT} font-mono text-sm`}
            />
            <p id={ids.toHint} className={T.small}>
              {fields.recipient.hint}
            </p>
            {tried && toIssue ? (
              <FieldError
                id={ids.toError}
                error={recipientError(
                  toIssue.issue,
                  "asset" in toIssue ? toIssue.asset : undefined,
                )}
                tone={toIssue.issue === "contractAddress" ? "note" : "error"}
              />
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <label htmlFor={ids.amount} className={T.label}>
                {fields.amount.label}
              </label>
              <span className={T.small}>
                {fill(fields.amount.available, {
                  amount: amount(asset.balance, asset.decimals),
                  asset: asset.symbol,
                })}
              </span>
            </div>
            <div className="flex items-stretch border border-[color:var(--control-edge)] bg-[color:var(--ground)] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-solid focus-within:outline-[color:var(--focus)]">
              <input
                id={ids.amount}
                inputMode="decimal"
                autoComplete="off"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={tried && amountIssue ? true : undefined}
                aria-describedby={
                  tried && amountIssue ? `${ids.amountHint} ${ids.amountError}` : ids.amountHint
                }
                className="w-0 min-w-0 flex-1 bg-transparent px-4 py-4 font-display text-3xl font-extrabold tabular-nums text-[color:var(--fg)] outline-none"
              />
              <button
                type="button"
                onClick={() => setValue(maxOf(asset))}
                className="px-4 font-mono text-label uppercase text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
              >
                {fields.amount.max}
              </button>
              <span className="flex items-center border-l border-[color:var(--rule)] px-4 font-display text-lg font-bold text-[color:var(--fg)]">
                {asset.symbol}
              </span>
            </div>
            <p id={ids.amountHint} className={T.small}>
              {fields.amount.hint}
            </p>
            {tried && amountIssue ? (
              <FieldError id={ids.amountError} error={amountError(amountIssue, asset)} />
            ) : null}
          </div>

          {tried && expected && warnPoisoning ? (
            <div role="alert" className="grid gap-4 border-2 border-[color:var(--fg)] p-5">
              <p className="font-display text-xl font-extrabold uppercase text-[color:var(--fg)]">
                {poisoning.title}
              </p>
              <p className={`${T.body} [overflow-wrap:anywhere]`}>
                {fill(poisoning.body, { expected })}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRecipient(expected);
                    setKept(null);
                  }}
                >
                  {poisoning.action.label}
                </Button>
                <Button type="button" variant="soft" onClick={() => setKept(recipient.trim())}>
                  {poisoning.keep.label}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid content-start gap-6 lg:col-span-5">
          <Block title={summary.title}>
            <Rows
              rows={[
                {
                  label: summary.to,
                  value: (
                    <code className="font-mono">
                      {recipient.trim() && !blocking ? truncateAddress(recipient.trim()) : "0x..."}
                    </code>
                  ),
                },
                { label: summary.amount, value: `${shown} ${asset.symbol}` },
                { label: summary.fee, value: live ? summary.feeLater : `${amount(fee)} MON` },
                {
                  label: summary.total,
                  value: live
                    ? fill(summary.totalPlusFee, { amount: `${shown} ${asset.symbol}` })
                    : asset.symbol === "MON"
                      ? `${amount(fromUnits((units ?? 0n) + (toUnits(fee, 18) ?? 0n), 18))} MON`
                      : `${shown} ${asset.symbol} + ${amount(fee)} MON`,
                },
                { label: summary.remaining, value: `${left} ${asset.symbol}` },
              ]}
            />
          </Block>
          <div className="grid gap-3">
            <Button type="submit" variant="primary" size="lg" className="w-full">
              {action.label}
            </Button>
            <p className={T.small}>{action.note}</p>
          </div>
        </div>
      </form>
    </Screen>
  );
}
