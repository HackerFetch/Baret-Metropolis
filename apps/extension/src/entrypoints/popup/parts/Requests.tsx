import { signRequest } from "@baret/content/extension/popup/sign-request.content";
import { common } from "@baret/content/shared/common.content";
import { policy } from "@baret/content/shared/policy.content";
import { sign } from "@baret/content/wallet/sign.content";
import { Button, Meter, truncateAddress, VerdictTag } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Findings } from "@baret/wallet-ui/components/Findings";
import { Parts } from "@baret/wallet-ui/components/Parts";
import { day, toUnits } from "@baret/wallet-ui/data/format";
import { fillParts } from "@baret/wallet-ui/lib/parts";
import { HoldButton } from "@baret/wallet-ui/sign/HoldButton";
import { DUR } from "@baret/web-ui/lib/motion";
import { T } from "@baret/web-ui/lib/type";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { counted, fill } from "@baret/web-ui/lib/util";
import { m } from "motion/react";
import { type JSX, type ReactNode, useEffect, useId, useState } from "react";
import type {
  Caps,
  MessageRequest,
  Network,
  PaymentRequest,
  TypedDataRequest,
} from "../../../data/types.js";
import { useLatest } from "../../../lib/useLatest.js";

/**
 * What the extension adds to the wallet's sign request: a message to sign
 * (nothing to simulate), structured data and the allowance a permit hides in
 * it, and a payment a site asks for over HTTP 402. They share the request's
 * grammar: who asks and what for, the sections on hairlines, the decision
 * pinned at the foot with its countdown, and the window note.
 */

export type Decision = "signed" | "declined" | "expired" | "overridden";

/** BRAND 08 product enter: a 6 px rise over 160 ms, ease-out; off under reduced motion. */
export const RISE_PX = 6;

const KEEP = new Set(["origin"]);

/** Seconds left, counting down while `running`; `onExpire` once at zero. */
export function useCountdown(seconds: number, running: boolean, onExpire: () => void): number {
  const [left, setLeft] = useState(seconds);
  const expire = useLatest(onExpire);
  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      expire.current();
      return;
    }
    const id = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, running, expire]);
  return left;
}

function Block({ title, children }: { title?: string; children: ReactNode }): JSX.Element {
  const id = useId();
  return (
    <section
      {...(title ? { "aria-labelledby": id } : {})}
      className="grid gap-3 border-t border-[color:var(--rule)] px-5 py-5"
    >
      {title ? (
        <h2 id={id} className={T.label}>
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/** The frame every extension request shares, top to pinned foot. */
export function RequestShell({
  label,
  title,
  subtitle,
  origin,
  network,
  children,
  actions,
  seconds,
}: {
  label: string;
  title: string;
  /** A template with {origin}; the address keeps its case. Left out: the site alone. */
  subtitle?: string;
  origin: string;
  /** The network the request is for, from the request itself. */
  network: Network;
  children: ReactNode;
  actions: ReactNode;
  /** Shown while the request waits; null once it is answered. */
  seconds: number | null;
}): JSX.Element {
  const titleId = useId();
  const reduce = useReduce();
  return (
    <article aria-labelledby={titleId} className="flex min-h-full flex-col">
      <header className="grid gap-3 px-5 pt-5 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={T.label}>{label}</p>
          <Tag tone="network" size="sm">
            {common.networks[network].label}
          </Tag>
        </div>
        <h1
          id={titleId}
          className="font-display text-3xl font-extrabold uppercase leading-[1.02] text-[color:var(--fg)]"
        >
          {title}
        </h1>
        <p className="text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
          {subtitle ? (
            <Parts parts={fillParts(subtitle, { origin }, KEEP)} />
          ) : (
            <span className="font-mono">{origin}</span>
          )}
          <span className="block text-[color:var(--fg-muted)]">{sign.header.originNote}</span>
        </p>
      </header>
      <m.div
        className="flex-1"
        initial={reduce ? false : { opacity: 0, y: RISE_PX }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : DUR.enter, ease: "easeOut" }}
      >
        {children}
      </m.div>
      <footer className="sticky bottom-0 z-10 grid gap-2.5 border-t border-[color:var(--rule-strong)] bg-[color:var(--ground)] px-5 pt-3 pb-3">
        {actions}
        <div className="grid gap-0.5">
          {seconds !== null ? (
            <p className={`font-mono text-xs text-[color:var(--fg)] ${T.num}`} aria-hidden="true">
              {counted(seconds, sign.countdown.label, sign.countdown.labelOne, {
                seconds: String(seconds),
              })}
            </p>
          ) : null}
          <p className="text-xs text-[color:var(--fg-muted)]">{signRequest.windowNote}</p>
        </div>
      </footer>
    </article>
  );
}

function TwoActions({
  decline,
  primary,
  onDecline,
  onPrimary,
  disabled,
}: {
  decline: string;
  primary: string;
  onDecline: () => void;
  onPrimary: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="ghost" onClick={onDecline}>
        {decline}
      </Button>
      <Button type="button" variant="primary" disabled={disabled} onClick={onPrimary}>
        {primary}
      </Button>
    </div>
  );
}

/* ── Message (personal_sign) ──────────────────────────────────────────── */

export function MessageView({
  request,
  onDecide,
}: {
  request: MessageRequest;
  onDecide: (decision: Decision) => void;
}): JSX.Element {
  const { message } = signRequest;
  const left = useCountdown(request.expires, true, () => onDecide("expired"));
  return (
    <RequestShell
      label={sign.header.title}
      title={message.title}
      subtitle={message.subtitle}
      origin={request.origin}
      network={request.network}
      seconds={left}
      actions={
        <TwoActions
          decline={message.actions.decline}
          primary={message.actions.sign}
          onDecline={() => onDecide("declined")}
          onPrimary={() => onDecide("signed")}
        />
      }
    >
      <Block>
        <p className={T.body}>{message.body}</p>
        <p className="text-sm text-[color:var(--fg)]">{message.check}</p>
      </Block>
      {request.readable ? null : (
        <Block>
          <div role="alert" className="grid gap-1 border-l-4 border-[color:var(--blocked)] pl-3">
            <p className="font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
              {message.unreadable.title}
            </p>
            <p className={T.small}>{message.unreadable.body}</p>
          </div>
        </Block>
      )}
      <Block title={message.contentLabel}>
        {/* biome-ignore lint/a11y/useSemanticElements: the message is a named region and keeps pre whitespace. */}
        <pre
          role="region"
          aria-label={message.textLabel}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a long message scrolls, so it takes focus to scroll by keyboard.
          tabIndex={0}
          className="max-h-56 overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] border border-[color:var(--rule)] bg-[color:var(--ground-deep)] p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[color:var(--fg)] [overflow-wrap:anywhere]"
        >
          {request.text}
        </pre>
      </Block>
    </RequestShell>
  );
}

/* ── Structured data (eth_signTypedData_v4) ───────────────────────────── */

/** The verdict's title and summary for a signature, in the wallet's words. */
function typedVerdict(request: TypedDataRequest): { title: string; summary: string } {
  const { verdict } = sign;
  if (request.verdict === "safe") return verdict.safe;
  if (request.verdict === "caution") return verdict.caution;
  if (request.verdict === "unreachable") return verdict.unreachable;
  const [first, ...rest] = request.rules;
  const summary = !first
    ? verdict.blocked.summaryNoRule
    : rest.length === 0
      ? fill(verdict.blocked.summary, { rule: policy.fields[first.rule].label })
      : counted(rest.length, verdict.blocked.summaryMany, verdict.blocked.summaryManyOne, {
          rule: policy.fields[first.rule].label,
        });
  return { title: verdict.blocked.title, summary };
}

/**
 * The decision for a signature, by verdict. Only Safe gets the orange Sign;
 * Caution puts Decline first; Blocked and Can't reach Baret have no sign
 * button, only the hold to override below the findings.
 */
function TypedActions({
  request,
  onDecide,
}: {
  request: TypedDataRequest;
  onDecide: (decision: Decision) => void;
}): JSX.Element {
  const { typedData } = signRequest;
  if (request.verdict === "safe") {
    return (
      <TwoActions
        decline={typedData.actions.decline}
        primary={typedData.actions.sign}
        onDecline={() => onDecide("declined")}
        onPrimary={() => onDecide("signed")}
      />
    );
  }
  if (request.verdict === "caution") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={() => onDecide("signed")}>
          {typedData.actions.sign}
        </Button>
        <Button type="button" variant="primary" onClick={() => onDecide("declined")}>
          {typedData.actions.decline}
        </Button>
      </div>
    );
  }
  return (
    <Button type="button" variant="primary" block onClick={() => onDecide("declined")}>
      {typedData.actions.decline}
    </Button>
  );
}

export function TypedDataView({
  request,
  onDecide,
}: {
  request: TypedDataRequest;
  onDecide: (decision: Decision) => void;
}): JSX.Element {
  const { typedData } = signRequest;
  const left = useCountdown(request.expires, true, () => onDecide("expired"));
  const permit = request.permit;
  const words = typedVerdict(request);
  const stopped = request.verdict === "blocked" || request.verdict === "unreachable";
  const firstRule = request.rules[0];
  const override =
    request.verdict === "unreachable"
      ? sign.override.unreachable
      : {
          title: sign.override.blocked.title,
          body: firstRule
            ? fill(sign.override.blocked.body, { rule: policy.fields[firstRule.rule].label })
            : sign.override.blocked.bodyNoRule,
        };
  return (
    <RequestShell
      label={sign.header.title}
      title={typedData.title}
      subtitle={typedData.subtitle}
      origin={request.origin}
      network={request.network}
      seconds={left}
      actions={<TypedActions request={request} onDecide={onDecide} />}
    >
      <Block>
        <div className="grid gap-2">
          <div className="flex">
            <VerdictTag kind={request.verdict} label={common.verdicts[request.verdict].label} />
          </div>
          <p className="font-display text-xl font-extrabold uppercase leading-tight text-[color:var(--fg)]">
            {words.title}
          </p>
          <p className="text-sm text-[color:var(--fg)]">{words.summary}</p>
        </div>
        <p className={T.small}>{typedData.body}</p>
      </Block>
      {permit ? (
        <Block>
          <div role="alert" className="grid gap-2 border-l-4 border-[color:var(--blocked)] pl-3">
            <p className="font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
              {typedData.permit.title}
            </p>
            <p className="text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
              {fill(typedData.permit.body, {
                spender: truncateAddress(permit.spender),
                asset: permit.asset,
              })}
            </p>
            <p className={`text-sm text-[color:var(--fg)] ${T.num}`}>
              <span className="text-[color:var(--fg-muted)]">{typedData.permit.validUntil}: </span>
              {day(permit.deadline)}
            </p>
          </div>
        </Block>
      ) : null}
      {request.verdict === "unreachable" ? null : (
        <Block title={sign.findings.title}>
          <Findings items={request.findings} />
        </Block>
      )}
      {request.rules.length > 0 ? (
        <Block title={sign.rules.title}>
          <ul className="grid gap-1.5">
            {request.rules.map((hit) => (
              <li
                key={hit.rule}
                className="border-l-4 border-[color:var(--blocked)] pl-3 text-sm font-medium text-[color:var(--fg)]"
              >
                {policy.fields[hit.rule].label}
                {hit.actual !== undefined && hit.limit !== undefined ? (
                  <span className={`block ${T.small}`}>
                    {fill(sign.rules.row, { actual: hit.actual, limit: hit.limit })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Block>
      ) : null}
      <Block title={typedData.fieldsLabel}>
        <dl className="grid border-t border-[color:var(--rule)]">
          {request.fields.map((field) => (
            <div key={field.name} className="grid gap-0.5 border-b border-[color:var(--rule)] py-2">
              <dt className="font-mono text-xs text-[color:var(--fg-muted)]">{field.name}</dt>
              <dd className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </Block>
      {stopped ? (
        <Block title={override.title}>
          <p className={T.small}>{override.body}</p>
          <HoldButton onHeld={() => onDecide("overridden")} />
          <p className={T.small}>{sign.override.logged}</p>
        </Block>
      ) : null}
    </RequestShell>
  );
}

/* ── Payment (HTTP 402) ───────────────────────────────────────────────── */

const NUMBER = /^\d+(?:[.,]\d{1,6})?$/;
/** For the meters only: a display fraction, never a decision. */
const num = (text: string) => Number.parseFloat(text.replace(",", "."));
/** Caps are compared in base units, so no float rounding decides a set. */
const CAP_DECIMALS = 6;

type CapsText = { perPayment: string; hour: string; day: string };

/** The first thing wrong with a set of caps for this payment, or null when it is valid. */
function capsError(amount: string, caps: CapsText): string | null {
  const { errors } = signRequest.payment.firstPayment;
  const read = (text: string) =>
    NUMBER.test(text.trim()) ? toUnits(text.trim(), CAP_DECIMALS) : null;
  const perPayment = read(caps.perPayment);
  const hour = read(caps.hour);
  const dayCap = read(caps.day);
  if (perPayment === null || hour === null || dayCap === null) return errors.empty;
  // An amount that cannot be read counts as over every cap: it is not sent.
  const need = toUnits(amount, CAP_DECIMALS);
  if (need === null || perPayment < need) return errors.belowPayment;
  if (hour < perPayment) return errors.hour;
  if (hour > dayCap) return errors.order;
  return null;
}

function CapsFields({
  amount,
  value,
  onChange,
  tried,
}: {
  amount: string;
  value: CapsText;
  onChange: (value: CapsText) => void;
  tried: boolean;
}): JSX.Element {
  const { firstPayment } = signRequest.payment;
  const ids = { perPayment: useId(), hour: useId(), day: useId() };
  const errorId = useId();
  const keys = ["perPayment", "hour", "day"] as const;
  const error = capsError(amount, value);
  const shown = tried && error !== null;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <div key={key} className="grid min-w-0 gap-1.5">
            <label htmlFor={ids[key]} className={T.label}>
              {firstPayment.caps[key]}
            </label>
            <input
              id={ids[key]}
              value={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={shown ? true : undefined}
              aria-describedby={shown ? errorId : undefined}
              className={`h-11 w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-2.5 text-base text-[color:var(--fg)] focus-visible:border-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] ${T.num}`}
            />
          </div>
        ))}
      </div>
      {shown ? (
        <p
          id={errorId}
          role="alert"
          className="border-l-4 border-[color:var(--blocked)] pl-3 text-sm text-[color:var(--fg)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Whether the caps a reader typed make a valid set for this payment. */
export function capsValid(amount: string, caps: CapsText): boolean {
  return capsError(amount, caps) === null;
}

export function PaymentView({
  request,
  autoPay,
  onDecide,
  onCaps,
  onEditCaps,
}: {
  request: PaymentRequest;
  autoPay: boolean;
  onDecide: (decision: Decision) => void;
  /** The first payment's caps, saved with the payment. */
  onCaps: (caps: Caps) => void;
  /** Raise or edit the caps on the options page. */
  onEditCaps: () => void;
}): JSX.Element {
  const { payment } = signRequest;
  const waiting = request.state === "first" || request.state === "overCap";
  const left = useCountdown(request.expires, waiting, () => onDecide("expired"));
  const [caps, setCaps] = useState({ perPayment: "", hour: "", day: "" });
  const [tried, setTried] = useState(false);

  const head = (
    <Block>
      <p className="flex items-baseline gap-2 text-[color:var(--fg)]">
        <span className="font-display text-5xl font-extrabold leading-none tabular-nums">
          {request.amount}
        </span>
        <span className="font-display text-xl font-bold uppercase text-[color:var(--fg-muted)]">
          {request.asset}
        </span>
      </p>
      <p className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
        {request.merchant.startsWith("0x") ? truncateAddress(request.merchant) : request.merchant}
      </p>
    </Block>
  );

  if (request.state === "auto" || request.state === "notChecked") {
    const auto = request.state === "auto";
    const cap = request.caps?.day ?? "0";
    const spent = request.spentToday ?? "0";
    const meterId = `meter-${request.id}`;
    return (
      <RequestShell
        label={payment.label}
        title={auto ? payment.auto.title : payment.notChecked.title}
        origin={request.origin}
        network={request.network}
        seconds={null}
        actions={
          <div className="grid gap-2">
            <Button type="button" variant="primary" block onClick={() => onDecide("signed")}>
              {common.actions.done}
            </Button>
            {auto ? (
              <Button type="button" variant="ghost" size="sm" onClick={onEditCaps}>
                {payment.auto.edit}
              </Button>
            ) : null}
          </div>
        }
      >
        {head}
        <Block>
          {auto ? (
            <>
              <p className="text-sm text-[color:var(--fg)]">
                {fill(payment.auto.body, {
                  amount: request.amount,
                  asset: request.asset,
                  merchant: request.origin,
                })}
              </p>
              <div className="grid gap-1.5">
                <Meter value={num(spent)} max={num(cap)} describedBy={meterId} />
                <p id={meterId} className={`text-xs text-[color:var(--fg-muted)] ${T.num}`}>
                  {fill(payment.auto.meter, {
                    actual: `${spent} ${request.asset}`,
                    cap: `${cap} ${request.asset}`,
                  })}
                </p>
              </div>
            </>
          ) : (
            <div role="alert" className="grid gap-1 border-l-4 border-[color:var(--fg)] pl-3">
              <p className="text-sm text-[color:var(--fg)]">{payment.notChecked.body}</p>
              <p className={T.small}>{common.verdicts.unreachable.line}</p>
            </div>
          )}
        </Block>
      </RequestShell>
    );
  }

  if (request.state === "overCap") {
    const hit = request.capHit ?? "perPayment";
    const cap = request.caps
      ? `${hit === "perPayment" ? request.caps.perPayment : hit === "hour" ? (request.caps.hour ?? "") : request.caps.day} ${request.asset}`
      : "";
    return (
      <RequestShell
        label={payment.label}
        title={payment.overCap.title}
        origin={request.origin}
        network={request.network}
        seconds={left}
        actions={
          <TwoActions
            decline={payment.overCap.actions.decline}
            primary={payment.overCap.actions.raise}
            onDecline={() => onDecide("declined")}
            onPrimary={onEditCaps}
          />
        }
      >
        {head}
        <Block>
          <div role="alert" className="grid gap-1.5 border-l-4 border-[color:var(--blocked)] pl-3">
            <p className="text-sm text-[color:var(--fg)]">
              {fill(payment.overCap[hit], { cap, origin: request.origin })}
            </p>
            <p className={T.small}>{payment.overCap.body}</p>
          </div>
          {request.caps ? (
            <dl className="grid grid-cols-3 border-y border-[color:var(--rule)] text-xs">
              {(["perPayment", "hour", "day"] as const).map((key) => (
                <div
                  key={key}
                  className="grid gap-0.5 py-2 not-first:border-l not-first:border-[color:var(--rule)] not-first:pl-2"
                >
                  <dt className="text-[color:var(--fg-muted)]">{payment.firstPayment.caps[key]}</dt>
                  <dd className={`text-[color:var(--fg)] ${T.num}`}>
                    {key === "hour" ? (request.caps?.hour ?? common.ui.none) : request.caps?.[key]}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {request.caps ? (
            <div className="grid gap-1.5">
              <Meter
                value={num(request.spentToday ?? "0")}
                max={num(request.caps.day)}
                describedBy={`meter-${request.id}`}
              />
              <p
                id={`meter-${request.id}`}
                className={`text-xs text-[color:var(--fg-muted)] ${T.num}`}
              >
                {fill(payment.auto.meter, {
                  actual: `${request.spentToday ?? "0"} ${request.asset}`,
                  cap: `${request.caps.day} ${request.asset}`,
                })}
              </p>
            </div>
          ) : null}
        </Block>
      </RequestShell>
    );
  }

  // The first payment to this site: its caps come first.
  const { firstPayment } = payment;
  return (
    <RequestShell
      label={payment.label}
      title={payment.title}
      origin={request.origin}
      network={request.network}
      seconds={left}
      actions={
        <TwoActions
          decline={firstPayment.actions.decline}
          primary={fill(firstPayment.actions.approve, {
            amount: request.amount,
            asset: request.asset,
          })}
          onDecline={() => onDecide("declined")}
          onPrimary={() => {
            setTried(true);
            if (!capsValid(request.amount, caps)) return;
            onCaps({
              perPayment: caps.perPayment.replace(",", "."),
              hour: caps.hour.replace(",", "."),
              day: caps.day.replace(",", "."),
            });
            onDecide("signed");
          }}
        />
      }
    >
      {head}
      <Block title={firstPayment.title}>
        <p className="text-sm text-[color:var(--fg)]">
          {fill(firstPayment.body, { origin: request.origin })}
        </p>
        <CapsFields amount={request.amount} value={caps} onChange={setCaps} tried={tried} />
        <p className={T.small}>{firstPayment.rule}</p>
        <p className="text-sm text-[color:var(--fg)]">
          {autoPay ? firstPayment.autoOn : firstPayment.autoOff}
        </p>
      </Block>
    </RequestShell>
  );
}
