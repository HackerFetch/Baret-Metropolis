import { common, extFrame, optionsAllowances, policies, policy, x402 } from "@baret/content";
import { Button, Meter, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block, Empty } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount } from "@baret/wallet-ui/data/format";
import { RuleSwitch } from "@baret/web-ui/components/RuleSwitch";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ExternalLink } from "lucide-react";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { OPTIONS_ART } from "../../../assets.js";
import { now, payments } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import type { Payment, PaymentPermission, Problem } from "../../../data/types.js";
import { timeOf } from "../../../data/words.js";
import { Dialog, Figure, INPUT, LINK } from "../parts/kit.js";
import { DECIMALS, type Draft, readDraft, spentWithin, VAULT_ASSET } from "./x402-money.js";

/**
 * Payments, the x402 page. x402 keeps no running total, so this page is where
 * the totals live: what was spent today, this week and this month, each
 * payment on its way from checked to settled, every merchant against its
 * caps, the facilitators that settled for them, what Baret declined, and the
 * receipts. Every number comes from the wallet's own ledger (the sample store
 * for now). A revoke stands in for its transaction with a short wait.
 */

const { wedge, summary, ticker, merchants, facilitators, problems, receipts, settings } = x402;
const { revoke } = optionsAllowances;

const DAY = 86_400_000;
/** The stand-in for a revoke transaction: how long confirming takes. */
const CONFIRM_MS = 700;
const STAGES = ["checked", "verified", "settled"] as const;
const DECLINED: ReadonlySet<Problem["kind"]> = new Set([
  "declined",
  "overCap",
  "mismatch",
  "asset",
]);

const DAY_NUMBER = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/** The outside link's look: the kit's link with room for its icon. */
const OUT = `${LINK} min-w-6 gap-1.5`;

function num(text: string): number {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : 0;
}

/** The calendar day in UTC, as a count of days: the sample's dates are UTC. */
function dayOf(iso: string): number {
  return Math.floor(Date.parse(iso) / DAY);
}

/** "0.50 USDC"; a cap that is not set reads None. */
function capText(value: string | null, asset: string): string {
  return value === null ? common.ui.none : `${amount(value, DECIMALS)} ${asset}`;
}

type RuleField = keyof typeof policy.fields;

function midSentence(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function isRuleField(key: string): key is RuleField {
  return Object.hasOwn(policy.fields, key);
}

/** A problem's sentence: the rule by its name, addresses shortened. */
function problemBody(problem: Problem): string {
  const { rule, expected, actual } = problem.values;
  return fill(problems.types[problem.kind].body, {
    ...problem.values,
    merchant: problem.merchant,
    // The rule sits mid-sentence ("goes over cap per payment"), so its label starts in lower case.
    ...(rule ? { rule: midSentence(isRuleField(rule) ? policy.fields[rule].label : rule) } : {}),
    ...(expected ? { expected: truncateAddress(expected) } : {}),
    ...(actual ? { actual: truncateAddress(actual) } : {}),
  });
}

/** An empty block in one line, in the dashed frame of the wallet's empty states. */
function Note({ text }: { text: string }): JSX.Element {
  return (
    <p className={`${T.body} border border-dashed border-[color:var(--rule-strong)] p-6`}>{text}</p>
  );
}

/** Three squares filled up to a payment's stage: checked, verified, settled. */
function Stages({ stage }: { stage: Payment["stage"] }): JSX.Element {
  const reached = STAGES.indexOf(stage);
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {STAGES.map((s, i) => (
        <span
          key={s}
          className={`size-2 shrink-0 sm:size-2.5 ${i <= reached ? "bg-[color:var(--fg)]" : "border border-[color:var(--fg-muted)]"}`}
        />
      ))}
    </span>
  );
}

function StatusTag({ status }: { status: PaymentPermission["status"] }): JSX.Element {
  return (
    <Tag tone={status === "active" ? "watching" : "neutral"} size="sm">
      {merchants.status[status]}
    </Tag>
  );
}

function Summary(): JSX.Element {
  const { state } = useExtension();
  const figures = [
    { label: summary.today, value: spentWithin(state.payments, 1, now()) },
    { label: summary.week, value: spentWithin(state.payments, 7, now()) },
    { label: summary.month, value: spentWithin(state.payments, 30, now()) },
    { label: summary.merchants, value: String(payments(state.permissions).length) },
    {
      label: summary.declined,
      value: String(state.problems.filter((p) => DECLINED.has(p.kind)).length),
    },
    { label: summary.attention, value: String(state.problems.length) },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
      {figures.map((figure) => (
        <Figure key={figure.label} value={figure.value} label={figure.label} />
      ))}
    </div>
  );
}

/** The last 7 days, oldest on the left: each payment a row of three squares. */
function Ticker(): JSX.Element {
  const { state } = useExtension();
  const today = dayOf(now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = today - 6 + i;
    return {
      day,
      items: state.payments
        .filter((p) => dayOf(p.at) === day)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    };
  });
  const any = days.some((d) => d.items.length > 0);

  return (
    <Block
      title={ticker.title}
      aside={
        <Tag tone="watching" size="sm">
          {ticker.live}
        </Tag>
      }
    >
      <p className={`${T.body} max-w-[60ch]`}>{ticker.body}</p>
      {any ? (
        <>
          <ol className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {days.map(({ day, items }) => {
              const date = new Date(day * DAY);
              const isToday = day === today;
              return (
                <li
                  key={day}
                  aria-current={isToday ? "date" : undefined}
                  className={`grid min-w-0 content-start gap-3 ${isToday ? "border-t-2 border-[color:var(--fg)] pt-[11px]" : "border-t border-[color:var(--rule)] pt-3"}`}
                >
                  <time dateTime={date.toISOString().slice(0, 10)} className="grid gap-0.5">
                    <span
                      className={`font-display text-lg font-bold leading-none ${T.num} ${isToday ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}
                    >
                      {DAY_NUMBER.format(date)}
                    </span>
                    <span className={T.label}>{MONTH.format(date)}</span>
                  </time>
                  {items.length > 0 ? (
                    <ul className="grid gap-1.5">
                      {items.map((p) => {
                        const line = fill(ticker.row, {
                          amount: `${amount(p.amount, DECIMALS)} ${p.asset}`,
                          merchant: p.merchant,
                          stage: ticker.stages[p.stage].label,
                        });
                        return (
                          <li key={p.id} title={line}>
                            <Stages stage={p.stage} />
                            <span className="sr-only">{line}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <dl className="grid gap-4 border-t border-[color:var(--rule)] pt-4 sm:grid-cols-3 sm:gap-6">
            {STAGES.map((stage) => (
              <div key={stage} className="grid content-start gap-1.5">
                <dt className="flex items-center gap-2.5 text-sm font-medium text-[color:var(--fg)]">
                  <Stages stage={stage} />
                  {ticker.stages[stage].label}
                </dt>
                <dd className={T.small}>{ticker.stages[stage].hint}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <Note text={ticker.empty} />
      )}
    </Block>
  );
}

function CapField({
  label,
  unit,
  value,
  hint,
  error,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  hint?: string | undefined;
  error?: string | undefined;
  onChange: (value: string) => void;
}): JSX.Element {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const described = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={T.label}>
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={described || undefined}
          className={`${INPUT} ${T.num}`}
        />
        <span className="shrink-0 font-mono text-sm text-[color:var(--fg-muted)]">{unit}</span>
      </div>
      {hint ? (
        <p id={hintId} className={T.small}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-[color:var(--blocked-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Merchants(): JSX.Element {
  const { state, dispatch } = useExtension();
  const { columns, actions, capsDialog } = merchants;
  // Most recently used first: a change of caps keeps the row where it is.
  const list = payments(state.permissions).sort(
    (a, b) => Date.parse(b.lastUsed ?? b.granted) - Date.parse(a.lastUsed ?? a.granted),
  );
  const [notice, setNotice] = useState("");
  const [queued, setQueued] = useState<string | null>(null);
  const [capsFor, setCapsFor] = useState<PaymentPermission | null>(null);
  const [capsOpen, setCapsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ perPayment: "", hour: "", day: "" });
  const [revokeFor, setRevokeFor] = useState<PaymentPermission | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const status = useRef<HTMLParagraphElement>(null);
  const { caps: next, errors } = readDraft(draft);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Said once the dialog has closed, so the page behind it is no longer inert
  // and the status line is heard. A revoked row takes its button with it, so
  // the focus lands on the status line rather than the top of the page.
  useEffect(() => {
    if (queued === null) return;
    setNotice(queued);
    setQueued(null);
    const active = document.activeElement;
    if (!active || active === document.body) status.current?.focus();
  }, [queued]);

  function openCaps(p: PaymentPermission): void {
    setCapsFor(p);
    setDraft({ perPayment: p.caps.perPayment, hour: p.caps.hour ?? "", day: p.caps.day });
    setCapsOpen(true);
  }

  function saveCaps(): void {
    if (!capsFor || !next) return;
    const current = list.find((p) => p.id === capsFor.id) ?? capsFor;
    dispatch({ type: "caps", permission: { ...current, caps: next } });
    setCapsOpen(false);
    setQueued(fill(capsDialog.saved, { merchant: current.merchant }));
  }

  function openRevoke(p: PaymentPermission): void {
    setRevokeFor(p);
    setRevokeOpen(true);
  }

  // The stand-in for the revoke transaction: a short wait, then the row goes.
  function confirmRevoke(): void {
    if (!revokeFor || working) return;
    const id = revokeFor.id;
    setWorking(true);
    timer.current = window.setTimeout(() => {
      dispatch({ type: "revoke", ids: [id], at: now() });
      setWorking(false);
      setRevokeOpen(false);
      setQueued(revoke.done);
    }, CONFIRM_MS);
  }

  return (
    <Block title={merchants.title}>
      <p className={`${T.body} max-w-[60ch]`}>{merchants.body}</p>
      {list.length === 0 ? (
        <Empty
          title={merchants.empty.title}
          body={merchants.empty.body}
          action={
            <a href={extFrame.links.showcase} target="_blank" rel="noreferrer" className={OUT}>
              {merchants.empty.action.label}
              <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </a>
          }
        />
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">{merchants.title}</caption>
          <thead>
            <tr className="border-b border-[color:var(--rule)]">
              <th scope="col" className={`${T.label} py-3 pr-4 text-left font-normal`}>
                {columns.merchant}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 pr-4 text-right font-normal md:table-cell`}
              >
                {columns.perPayment}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 pr-4 text-right font-normal md:table-cell`}
              >
                {columns.hourly}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 pr-4 text-right font-normal md:table-cell`}
              >
                {columns.daily}
              </th>
              <th scope="col" className={`${T.label} py-3 text-left font-normal sm:pr-4`}>
                {columns.spent}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 text-right font-normal sm:table-cell`}
              >
                {columns.status}
              </th>
            </tr>
          </thead>
          {list.map((p) => {
            const nameId = `x402-merchant-${p.id}`;
            const spentId = `x402-spent-${p.id}`;
            const caps = [
              { label: columns.perPayment, value: p.caps.perPayment },
              { label: columns.hourly, value: p.caps.hour },
              { label: columns.daily, value: p.caps.day },
            ];
            return (
              <tbody key={p.id}>
                <tr>
                  <th scope="row" className="pt-4 pr-4 pb-3 text-left align-top font-normal">
                    <span
                      id={nameId}
                      className="block font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere] sm:text-base"
                    >
                      {p.merchant}
                    </span>
                    <span className="mt-2 flex sm:hidden">
                      <StatusTag status={p.status} />
                    </span>
                  </th>
                  {caps.map((cap) => (
                    <td
                      key={cap.label}
                      className={`hidden pt-4 pr-4 pb-3 text-right align-top text-sm text-[color:var(--fg)] md:table-cell ${T.num}`}
                    >
                      {capText(cap.value, p.asset)}
                    </td>
                  ))}
                  <td className="pt-4 pb-3 align-top sm:pr-4">
                    <span id={spentId} className={`block text-sm text-[color:var(--fg)] ${T.num}`}>
                      {fill(merchants.spent, {
                        spent: amount(p.spent.day, DECIMALS),
                        cap: capText(p.caps.day, p.asset),
                      })}
                    </span>
                    <Meter
                      value={num(p.spent.day)}
                      max={num(p.caps.day)}
                      describedBy={spentId}
                      className="mt-2 min-w-24"
                    />
                  </td>
                  <td className="hidden pt-4 pb-3 text-right align-top sm:table-cell">
                    <StatusTag status={p.status} />
                  </td>
                </tr>
                <tr className="border-b border-[color:var(--rule)]">
                  <td colSpan={6} className="pb-4">
                    <div className="grid gap-4">
                      <dl className="grid grid-cols-3 gap-x-3 md:hidden">
                        {caps.map((cap) => (
                          <div key={cap.label} className="grid content-start gap-1">
                            <dt className={T.label}>{cap.label}</dt>
                            <dd className={`text-sm text-[color:var(--fg)] ${T.num}`}>
                              {capText(cap.value, p.asset)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          aria-describedby={nameId}
                          onClick={() =>
                            dispatch({
                              type: "permissionStatus",
                              id: p.id,
                              status: p.status === "active" ? "paused" : "active",
                            })
                          }
                        >
                          {p.status === "active" ? actions.pause : actions.resume}
                        </Button>
                        <Button
                          type="button"
                          variant="soft"
                          size="md"
                          aria-describedby={nameId}
                          onClick={() => openCaps(p)}
                        >
                          {actions.caps}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="md"
                          aria-describedby={nameId}
                          disabled={working}
                          onClick={() => openRevoke(p)}
                        >
                          {actions.revoke}
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
      )}
      <div className="grid gap-2">
        {list.length > 0 ? <p className={T.small}>{merchants.firstPayment}</p> : null}
        {list.length > 0 ? <p className={T.small}>{merchants.pauseHint}</p> : null}
        <p
          ref={status}
          role="status"
          tabIndex={-1}
          className="text-sm font-medium text-[color:var(--fg)]"
        >
          {notice}
        </p>
      </div>

      <Dialog
        open={capsOpen}
        title={actions.caps}
        action={capsDialog.action}
        disabled={next === null}
        onConfirm={saveCaps}
        onCancel={() => setCapsOpen(false)}
      >
        <p className={T.body}>
          {capsFor ? fill(capsDialog.body, { merchant: capsFor.merchant }) : null}
        </p>
        <p className={T.small}>{capsDialog.onchain}</p>
        <CapField
          label={columns.perPayment}
          unit={capsFor?.asset ?? ""}
          value={draft.perPayment}
          error={errors.perPayment}
          onChange={(value) => setDraft((d) => ({ ...d, perPayment: value }))}
        />
        <CapField
          label={columns.hourly}
          unit={capsFor?.asset ?? ""}
          value={draft.hour}
          hint={capsDialog.hourHint}
          error={errors.hour}
          onChange={(value) => setDraft((d) => ({ ...d, hour: value }))}
        />
        <CapField
          label={columns.daily}
          unit={capsFor?.asset ?? ""}
          value={draft.day}
          error={errors.day}
          onChange={(value) => setDraft((d) => ({ ...d, day: value }))}
        />
      </Dialog>

      <Dialog
        open={revokeOpen}
        title={revoke.title}
        action={working ? revoke.working : revoke.action}
        cancel={revoke.cancel}
        danger
        disabled={working}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeOpen(false)}
      >
        <p className={T.body}>
          {revokeFor ? fill(revoke.payment, { merchant: revokeFor.merchant }) : null}
        </p>
        <p className={T.small}>{revoke.fee}</p>
      </Dialog>
    </Block>
  );
}

function Facilitators(): JSX.Element {
  const { state } = useExtension();
  const { columns, standing } = facilitators;
  return (
    <Block title={facilitators.title}>
      <p className={`${T.body} max-w-[60ch]`}>{facilitators.body}</p>
      {state.facilitators.length === 0 ? (
        <Note text={facilitators.empty} />
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">{facilitators.title}</caption>
          <thead>
            <tr className="border-b border-[color:var(--rule)]">
              <th scope="col" className={`${T.label} py-3 pr-4 text-left font-normal`}>
                {columns.name}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 pr-4 text-right font-normal sm:table-cell`}
              >
                {columns.payments}
              </th>
              <th scope="col" className={`${T.label} py-3 text-right font-normal sm:pr-4`}>
                {columns.volume}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 text-right font-normal sm:table-cell`}
              >
                {columns.standing}
              </th>
            </tr>
          </thead>
          <tbody>
            {state.facilitators.map((f) => {
              const tag = (
                <Tag tone={f.known ? "neutral" : "caution"} size="sm">
                  {f.known ? standing.known : standing.new}
                </Tag>
              );
              return (
                <tr key={f.id} className="border-b border-[color:var(--rule)]">
                  <td className="py-3.5 pr-4 align-top">
                    <span className="block font-mono text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                      {f.name}
                    </span>
                    <span className="mt-2 flex sm:hidden">{tag}</span>
                    {f.known ? null : (
                      <span className={`${T.small} mt-1.5 block max-w-[48ch]`}>
                        {facilitators.newHint}
                      </span>
                    )}
                  </td>
                  <td
                    className={`hidden py-3.5 pr-4 text-right align-top text-sm text-[color:var(--fg)] sm:table-cell ${T.num}`}
                  >
                    {f.payments}
                  </td>
                  <td
                    className={`whitespace-nowrap py-3.5 text-right align-top text-sm text-[color:var(--fg)] sm:pr-4 ${T.num}`}
                  >
                    {`${amount(f.volume, DECIMALS)} ${state.payments.find((p) => p.facilitator === f.id)?.asset ?? VAULT_ASSET}`}
                  </td>
                  <td className="hidden py-3.5 text-right align-top sm:table-cell">{tag}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Block>
  );
}

function Problems(): JSX.Element {
  const { state, dispatch } = useExtension();
  const held = payments(state.permissions);
  const region = useRef<HTMLDivElement>(null);
  const dismissId = (id: string) => `x402-dismiss-${id}`;

  // The row goes, and its buttons with it: the focus moves to the next row's
  // Dismiss, or the previous one's, or the block when none is left.
  function dismiss(index: number, id: string): void {
    const near = state.problems[index + 1] ?? state.problems[index - 1];
    dispatch({ type: "dismissProblem", id });
    if (near) document.getElementById(dismissId(near.id))?.focus();
    else region.current?.focus();
  }

  return (
    <Block title={problems.title}>
      <p className={`${T.body} max-w-[60ch]`}>{problems.body}</p>
      <div ref={region} tabIndex={-1}>
        {state.problems.length === 0 ? (
          <Empty title={problems.empty.title} body={problems.empty.body} />
        ) : (
          <ul className="grid gap-8">
            {state.problems.map((problem, index) => {
              const merchant = held.find((p) => p.origin === problem.merchant);
              const titleId = `x402-problem-${problem.id}`;
              return (
                <li
                  key={problem.id}
                  className={`grid gap-2 border-l-4 py-1 pl-4 ${problem.kind === "unsettled" ? "border-[color:var(--caution)]" : "border-[color:var(--blocked)]"}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p
                      id={titleId}
                      className="font-display text-lg font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]"
                    >
                      {problems.types[problem.kind].title}
                    </p>
                    <time
                      dateTime={problem.at}
                      className={`font-mono text-sm text-[color:var(--fg-muted)] ${T.num}`}
                    >
                      {timeOf(problem.at)}
                    </time>
                  </div>
                  <p className={`${T.body} max-w-[60ch] [overflow-wrap:anywhere]`}>
                    {problemBody(problem)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
                    <Link to="/activity" aria-describedby={titleId} className={LINK}>
                      {problems.actions.details}
                    </Link>
                    {merchant && merchant.status !== "paused" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          dispatch({ type: "permissionStatus", id: merchant.id, status: "paused" });
                          document.getElementById(dismissId(problem.id))?.focus();
                        }}
                      >
                        {problems.actions.pause}
                      </Button>
                    ) : null}
                    <Button
                      id={dismissId(problem.id)}
                      type="button"
                      variant="soft"
                      aria-describedby={titleId}
                      onClick={() => dismiss(index, problem.id)}
                    >
                      {problems.actions.dismiss}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Block>
  );
}

function Receipts(): JSX.Element {
  const { state } = useExtension();
  const { columns } = receipts;
  const settled = state.payments
    .filter((p) => p.stage === "settled")
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <Block title={receipts.title}>
      <p className={`${T.body} max-w-[60ch]`}>{receipts.body}</p>
      {settled.length === 0 ? (
        <Note text={receipts.empty} />
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">{receipts.title}</caption>
          <thead>
            <tr className="border-b border-[color:var(--rule)]">
              <th scope="col" className={`${T.label} py-3 pr-4 text-left font-normal`}>
                {columns.time}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 pr-4 text-left font-normal sm:table-cell`}
              >
                {columns.merchant}
              </th>
              <th scope="col" className={`${T.label} py-3 pr-4 text-right font-normal`}>
                {columns.amount}
              </th>
              <th
                scope="col"
                className={`${T.label} hidden py-3 pr-4 text-left font-normal md:table-cell`}
              >
                {columns.facilitator}
              </th>
              <th scope="col" className={`${T.label} py-3 text-right font-normal`}>
                {/* On a phone the column holds an icon only, so its header is for readers. */}
                <span className="sr-only sm:not-sr-only">{columns.transaction}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {settled.map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--rule)]">
                <th scope="row" className="py-3.5 pr-4 text-left align-top font-normal">
                  <time dateTime={p.at} className={`block text-sm text-[color:var(--fg)] ${T.num}`}>
                    {timeOf(p.at)}
                  </time>
                  <span className="mt-1 block font-mono text-sm text-[color:var(--fg-muted)] [overflow-wrap:anywhere] sm:hidden">
                    {p.merchant}
                  </span>
                </th>
                <td className="hidden py-3.5 pr-4 align-top font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere] sm:table-cell">
                  {p.merchant}
                </td>
                <td
                  className={`whitespace-nowrap py-3.5 pr-4 text-right align-top text-sm text-[color:var(--fg)] ${T.num}`}
                >
                  {`${amount(p.amount, DECIMALS)} ${p.asset}`}
                </td>
                <td className="hidden py-3.5 pr-4 align-top font-mono text-sm text-[color:var(--fg-muted)] md:table-cell">
                  {state.facilitators.find((f) => f.id === p.facilitator)?.name ?? common.ui.none}
                </td>
                <td className="py-3.5 text-right align-top">
                  {p.hash ? (
                    <a
                      href={`${extFrame.links.explorer}/tx/${p.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`${OUT} min-w-11 justify-end font-mono`}
                    >
                      <span className="hidden sm:inline">{truncateAddress(p.hash)}</span>
                      <span className="sr-only">{receipts.explorer}</span>
                      <ExternalLink
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                        strokeWidth={1.75}
                      />
                    </a>
                  ) : (
                    <span className="text-sm text-[color:var(--fg-muted)]">{common.ui.none}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Block>
  );
}

function PaymentSettings(): JSX.Element {
  const { state, dispatch } = useExtension();
  const on = state.settings.autoPay;
  return (
    <Block title={settings.title}>
      <p className={`${T.body} max-w-[60ch]`}>{settings.body}</p>
      <div className="grid border-t border-[color:var(--rule)]">
        <div className="grid gap-1 border-b border-[color:var(--rule)] py-3">
          <RuleSwitch
            label={settings.autoApprove.label}
            stateWord={on ? policies.values.on : policies.values.off}
            on={on}
            onToggle={(value) => dispatch({ type: "settings", patch: { autoPay: value } })}
          />
          <p className={`${T.small} max-w-[60ch]`}>{settings.autoApprove.hint}</p>
        </div>
        <div className="grid gap-2 border-b border-[color:var(--rule)] py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-[color:var(--fg)]">{settings.caps.label}</p>
            <p className={T.small}>{settings.caps.hint}</p>
          </div>
          <Link to={settings.caps.action.href} className={`${LINK} w-max`}>
            {settings.caps.action.label}
          </Link>
        </div>
      </div>
    </Block>
  );
}

export function Component() {
  const wedgeId = useId();
  return (
    <Screen
      title={x402.title}
      body={x402.lead}
      picture={OPTIONS_ART.payments}
      actions={
        <Tag tone="neutral" size="sm">
          {x402.tag}
        </Tag>
      }
    >
      <div className="grid gap-14">
        <section
          aria-labelledby={wedgeId}
          className="grid gap-4 border-t-2 border-[color:var(--fg)] pt-6"
        >
          <h2
            id={wedgeId}
            className={`${T.statement} max-w-[24ch] text-balance text-[color:var(--fg)]`}
          >
            {wedge.title}
          </h2>
          <p className={`${T.body} max-w-[60ch]`}>{wedge.body}</p>
        </section>

        <Summary />
        <Ticker />
        <Merchants />
        <Facilitators />
        <Problems />
        <Receipts />
        <PaymentSettings />
      </div>
    </Screen>
  );
}
