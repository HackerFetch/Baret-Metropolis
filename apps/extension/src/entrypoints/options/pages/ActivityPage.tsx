import {
  common,
  extFrame,
  findings as findingCopy,
  optionsActivity,
  popupActivity,
  sign,
} from "@baret/content";
import { Button, ChangeRow, VerdictTag } from "@baret/ui";
import { Block, Empty } from "@baret/wallet-ui/components/Block";
import { Findings } from "@baret/wallet-ui/components/Findings";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount, when } from "@baret/wallet-ui/data/format";
import { decide } from "@baret/wallet-ui/data/rules";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { ExternalLink } from "lucide-react";
import { type JSX, useEffect, useId, useState } from "react";
import { OPTIONS_ART } from "../../../assets.js";
import { now } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import type { Activity, ActivityStatus, LoggedVerdict } from "../../../data/types.js";
import { partyOf, ruleLabel, short } from "../../../data/words.js";
import { INPUT, Search, Select } from "../parts/kit.js";

/**
 * Activity, the full log: every verdict Baret gave, with the reason behind
 * it, the declined requests too. Search, six filters and an amount range;
 * each row opens into its verdict, findings, rules, what changed and the
 * transaction. Selected rows can be checked again under today's rules
 * (nothing is signed and nothing changes on-chain) or exported as CSV, built
 * on this device. On a phone the table becomes a list.
 */

const { filters, columns, detail, bulk } = optionsActivity;

type TypeId = "all" | keyof typeof filters.type.options;
type OutcomeId = "all" | keyof typeof filters.outcome.options;
type DateId = Exclude<keyof typeof filters.dateRange, "label">;

const DAY = 86_400_000;

function typeOf(item: Activity): Exclude<TypeId, "all"> {
  if (item.kind === "sent") return "sent";
  if (item.kind === "received") return "received";
  if (item.kind === "payment") return "payments";
  if (item.kind === "alert") return "alerts";
  return "requests";
}

function outcomeOf(status: ActivityStatus): Exclude<OutcomeId, "all"> | null {
  if (status === "confirmed") return "signed";
  if (status === "overridden" || status === "unchecked") return "signedAnyway";
  if (status === "declined" || status === "blocked" || status === "expired") return status;
  return null;
}

/** What became of it. An alert has no outcome; nothing was signed for an incoming transfer or a connection. */
function outcomeText(item: Activity): string {
  if (item.kind === "alert") return "";
  if (item.status === "confirmed" && (item.kind === "received" || item.kind === "connect")) {
    return popupActivity.status.confirmed;
  }
  const id = outcomeOf(item.status);
  return id ? filters.outcome.options[id] : popupActivity.status[item.status];
}

/** Why it got its verdict: the rule that fired, or the first finding in words. */
function reasonOf(item: Activity): string {
  if (item.rule) return ruleLabel(item.rule);
  const first = item.findings[0];
  if (!first) return "";
  const values = Object.fromEntries(Object.entries(first.values).map(([k, v]) => [k, short(v)]));
  return fill(findingCopy[first.code].title, values);
}

function amountOf(item: Activity): string {
  const value = item.values.amount;
  return value ? `${amount(value)} ${item.values.asset ?? ""}`.trim() : "";
}

function toCsv(items: readonly Activity[]): string {
  const cell = (text: string) => `"${text.replaceAll('"', '""')}"`;
  const head = [
    columns.time,
    columns.type,
    columns.site,
    columns.amount,
    columns.verdict,
    columns.reason,
    columns.outcome,
  ];
  const lines = items.map((item) =>
    [
      item.at,
      filters.type.options[typeOf(item)],
      partyOf(item),
      amountOf(item),
      item.verdict ? common.verdicts[item.verdict].label : "",
      reasonOf(item),
      outcomeText(item),
    ]
      .map(cell)
      .join(","),
  );
  return [head.map(cell).join(","), ...lines].join("\n");
}

function download(csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "baret-activity.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Details({ item }: { item: Activity }): JSX.Element {
  const notSent =
    item.status === "declined" || item.status === "blocked" || item.status === "expired";
  return (
    <div className="grid gap-6 border-t border-[color:var(--rule)] bg-[color:var(--surface)] p-5 md:p-6">
      <p className={T.label}>{detail.title}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <p className={T.label}>{detail.verdict}</p>
          <div className="flex">
            {item.verdict ? (
              <VerdictTag kind={item.verdict} label={common.verdicts[item.verdict].label} />
            ) : (
              <span className="text-sm text-[color:var(--fg-muted)]">{common.ui.none}</span>
            )}
          </div>
          {item.status === "overridden" || item.status === "unchecked" ? (
            <p className="border-l-4 border-[color:var(--blocked)] pl-3 text-sm text-[color:var(--fg)]">
              {detail.signedAnyway}
            </p>
          ) : null}
          {notSent ? <p className={T.small}>{detail.notSent}</p> : null}
        </div>
        {reasonOf(item) ? (
          <div className="grid content-start gap-2">
            <p className={T.label}>{item.rule ? detail.rules : detail.reason}</p>
            <p className="text-base text-[color:var(--fg)]">{reasonOf(item)}</p>
          </div>
        ) : null}
      </div>
      {item.findings.length > 0 ? (
        <div className="grid gap-3">
          <p className={T.label}>{detail.findings}</p>
          <Findings items={item.findings} />
        </div>
      ) : null}
      {item.changes.length > 0 || item.fee ? (
        <div className="grid gap-1 md:max-w-[480px]">
          <p className={T.label}>{detail.changes}</p>
          {item.changes.map((change) => (
            <ChangeRow
              key={`${change.direction}-${change.unit}`}
              label={change.direction === "out" ? sign.changes.out : sign.changes.in}
              value={change.value}
              unit={change.unit}
              direction={change.direction}
            />
          ))}
          {item.fee ? <ChangeRow label={detail.fee} value={amount(item.fee)} unit="MON" /> : null}
        </div>
      ) : null}
      {item.hash ? (
        <div className="grid gap-1">
          <p className={T.label}>{detail.hash}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <code className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
              {item.hash}
            </code>
            <a
              href={`${extFrame.links.explorer}/tx/${item.hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
            >
              {detail.explorer}
              <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex size-11 cursor-pointer items-center justify-center">
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="size-5 cursor-pointer accent-[color:var(--fg)]"
      />
    </label>
  );
}

export function Component() {
  const { state } = useExtension();
  const ids = { from: useId(), to: useId(), min: useId(), max: useId() };
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeId>("all");
  const [verdict, setVerdict] = useState<"all" | LoggedVerdict>("all");
  const [outcome, setOutcome] = useState<OutcomeId>("all");
  const [dates, setDates] = useState<DateId>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [account, setAccount] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [checking, setChecking] = useState<readonly string[] | null>(null);
  const [result, setResult] = useState<{ blocked: ReadonlySet<string>; total: number } | null>(
    null,
  );

  const at = Date.parse(now());
  const rows = state.activity.filter((item) => {
    if (account !== "all" && item.account !== account) return false;
    if (type !== "all" && typeOf(item) !== type) return false;
    if (verdict !== "all" && item.verdict !== verdict) return false;
    if (outcome !== "all" && outcomeOf(item.status) !== outcome) return false;
    const time = Date.parse(item.at);
    if (dates === "today" && at - time > DAY) return false;
    if (dates === "week" && at - time > 7 * DAY) return false;
    if (dates === "month" && at - time > 30 * DAY) return false;
    if (dates === "custom") {
      if (from && time < Date.parse(`${from}T00:00:00Z`)) return false;
      if (to && time > Date.parse(`${to}T23:59:59Z`)) return false;
    }
    const value = Number.parseFloat(item.values.amount ?? "");
    if (min && !(value >= Number.parseFloat(min))) return false;
    if (max && !(value <= Number.parseFloat(max))) return false;
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      const haystack = [
        item.origin,
        item.counterparty,
        item.values.amount,
        item.values.asset,
        reasonOf(item),
        filters.type.options[typeOf(item)],
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const filtered =
    query !== "" ||
    type !== "all" ||
    verdict !== "all" ||
    outcome !== "all" ||
    dates !== "all" ||
    min !== "" ||
    max !== "" ||
    account !== "all";

  function clear(): void {
    setQuery("");
    setType("all");
    setVerdict("all");
    setOutcome("all");
    setDates("all");
    setFrom("");
    setTo("");
    setMin("");
    setMax("");
    setAccount("all");
  }

  // The re-check: today's rules over the chosen rows, after a short wait.
  useEffect(() => {
    if (!checking) return;
    const id = window.setTimeout(() => {
      const chosen = state.activity.filter((item) => checking.includes(item.id));
      const blocked = new Set(
        chosen
          .filter((item) => decide(item.findings, state.policy).verdict === "blocked")
          .map((i) => i.id),
      );
      setResult({ blocked, total: chosen.length });
      setChecking(null);
    }, 800);
    return () => window.clearTimeout(id);
  }, [checking, state.activity, state.policy]);

  const picked = rows.filter((item) => selected.has(item.id));
  const allPicked = rows.length > 0 && picked.length === rows.length;

  function toggle(id: string, on: boolean): void {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  const typeOptions = [
    { value: "all" as const, label: filters.type.all },
    ...(Object.keys(filters.type.options) as Exclude<TypeId, "all">[]).map((value) => ({
      value,
      label: filters.type.options[value],
    })),
  ];
  const verdictOptions = [
    { value: "all" as const, label: filters.verdict.all },
    ...(["safe", "caution", "blocked", "unreachable"] as const).map((value) => ({
      value,
      label: common.verdicts[value].label,
    })),
  ];
  const outcomeOptions = [
    { value: "all" as const, label: filters.outcome.all },
    ...(Object.keys(filters.outcome.options) as Exclude<OutcomeId, "all">[]).map((value) => ({
      value,
      label: filters.outcome.options[value],
    })),
  ];
  const dateOptions = (["all", "today", "week", "month", "custom"] as const).map((value) => ({
    value,
    label: filters.dateRange[value],
  }));
  const accountOptions = [
    { value: "all", label: filters.account.all },
    ...state.accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Screen
      title={optionsActivity.title}
      body={optionsActivity.lead}
      picture={OPTIONS_ART.activity}
      picturePosition="10% 50%"
    >
      <div className="grid gap-10">
        <p className={`${T.small} -mt-4`}>{optionsActivity.storage}</p>

        {state.activity.length === 0 ? (
          <Empty title={optionsActivity.empty.title} body={optionsActivity.empty.body} />
        ) : (
          <>
            <div className="grid gap-4">
              <Search
                label={columns.site}
                placeholder={optionsActivity.search.placeholder}
                value={query}
                onChange={setQuery}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Select
                  label={filters.type.label}
                  value={type}
                  options={typeOptions}
                  onChange={setType}
                />
                <Select
                  label={filters.verdict.label}
                  value={verdict}
                  options={verdictOptions}
                  onChange={setVerdict}
                />
                <Select
                  label={filters.outcome.label}
                  value={outcome}
                  options={outcomeOptions}
                  onChange={setOutcome}
                />
                <Select
                  label={filters.dateRange.label}
                  value={dates}
                  options={dateOptions}
                  onChange={setDates}
                />
                <Select
                  label={filters.account.label}
                  value={account}
                  options={accountOptions}
                  onChange={setAccount}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {dates === "custom" ? (
                  <>
                    <div className="grid min-w-0 gap-1.5">
                      <label htmlFor={ids.from} className={T.label}>
                        {filters.amount.min}
                      </label>
                      <input
                        id={ids.from}
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                      <label htmlFor={ids.to} className={T.label}>
                        {filters.amount.max}
                      </label>
                      <input
                        id={ids.to}
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </>
                ) : null}
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor={ids.min} className={T.label}>
                    {`${filters.amount.label}: ${filters.amount.min}`}
                  </label>
                  <input
                    id={ids.min}
                    inputMode="decimal"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder="0"
                    className={`${INPUT} ${T.num}`}
                  />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor={ids.max} className={T.label}>
                    {`${filters.amount.label}: ${filters.amount.max}`}
                  </label>
                  <input
                    id={ids.max}
                    inputMode="decimal"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    placeholder="0"
                    className={`${INPUT} ${T.num}`}
                  />
                </div>
                {filtered ? (
                  <div className="col-span-2 flex items-end sm:col-span-1">
                    <Button type="button" variant="soft" size="sm" onClick={clear}>
                      {filters.clear}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 border-y border-[color:var(--rule-strong)] py-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="-ml-3 flex cursor-pointer items-center gap-1 pr-2 text-sm font-medium text-[color:var(--fg)]">
                  <span className="flex size-11 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allPicked}
                      onChange={(event) =>
                        setSelected(
                          event.currentTarget.checked ? new Set(rows.map((r) => r.id)) : new Set(),
                        )
                      }
                      className="size-5 cursor-pointer accent-[color:var(--fg)]"
                    />
                  </span>
                  {bulk.selectAll}
                </label>
                <p className={`text-sm font-medium text-[color:var(--fg)] ${T.num}`}>
                  {fill(bulk.selected, { count: String(picked.length) })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={picked.length === 0 || checking !== null}
                  onClick={() => {
                    setResult(null);
                    setChecking(picked.map((item) => item.id));
                  }}
                >
                  {checking
                    ? counted(checking.length, bulk.recheck.working, bulk.recheck.workingOne)
                    : bulk.recheck.label}
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  disabled={picked.length === 0}
                  onClick={() => download(toCsv(picked))}
                >
                  {fill(bulk.export.label, { count: String(picked.length) })}
                </Button>
              </div>
              <p className={`${T.small} max-w-[72ch]`}>
                {counted(picked.length, bulk.recheck.body, bulk.recheck.bodyOne)}
              </p>
              <p role="status" className="text-sm font-medium text-[color:var(--fg)]">
                {result
                  ? fill(bulk.recheck.result, {
                      count: String(result.blocked.size),
                      total: String(result.total),
                    })
                  : ""}
              </p>
            </div>

            <Block
              title={optionsActivity.title}
              aside={<span className={`${T.label} ${T.num}`}>{rows.length}</span>}
            >
              {rows.length === 0 ? (
                <Empty
                  title={optionsActivity.emptyFiltered.title}
                  body={optionsActivity.emptyFiltered.body}
                  action={
                    <Button type="button" variant="ghost" size="sm" onClick={clear}>
                      {optionsActivity.emptyFiltered.action.label}
                    </Button>
                  }
                />
              ) : (
                <div className="grid">
                  <div
                    aria-hidden="true"
                    className={`hidden grid-cols-[44px_minmax(0,8.5rem)_minmax(0,8rem)_minmax(0,1fr)_minmax(0,7rem)_minmax(0,8rem)_minmax(0,1fr)_minmax(0,7rem)] items-center gap-x-3 border-b border-[color:var(--rule)] pb-2 lg:grid ${T.label}`}
                  >
                    <span />
                    <span>{columns.time}</span>
                    <span>{columns.type}</span>
                    <span>{columns.site}</span>
                    <span className="text-right">{columns.amount}</span>
                    <span>{columns.verdict}</span>
                    <span>{columns.reason}</span>
                    <span>{columns.outcome}</span>
                  </div>
                  <ul className="grid">
                    {rows.map((item) => {
                      const flagged = result?.blocked.has(item.id) ?? false;
                      return (
                        <li
                          key={item.id}
                          className={`border-b border-[color:var(--rule)] ${flagged ? "border-l-4 border-l-[color:var(--blocked)]" : ""}`}
                        >
                          <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-x-3 lg:grid-cols-[44px_minmax(0,8.5rem)_minmax(0,8rem)_minmax(0,1fr)_minmax(0,7rem)_minmax(0,8rem)_minmax(0,1fr)_minmax(0,7rem)] lg:items-center">
                            <Check
                              label={partyOf(item) || filters.type.options[typeOf(item)]}
                              checked={selected.has(item.id)}
                              onChange={(on) => toggle(item.id, on)}
                            />
                            <button
                              type="button"
                              aria-expanded={open === item.id}
                              onClick={() => setOpen(open === item.id ? null : item.id)}
                              className="min-w-0 py-3 text-left transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] lg:col-span-7 lg:grid lg:grid-cols-subgrid lg:items-center lg:gap-x-3"
                            >
                              {/* Phones: who and how much, then what and when, then the verdict and the outcome. */}
                              <span className="grid gap-1.5 pr-1 lg:hidden">
                                <span className="flex items-baseline justify-between gap-3">
                                  <span className="truncate font-mono text-sm text-[color:var(--fg)]">
                                    {partyOf(item)}
                                  </span>
                                  <span
                                    className={`shrink-0 text-sm text-[color:var(--fg)] ${T.num}`}
                                  >
                                    {amountOf(item)}
                                  </span>
                                </span>
                                <span className={`text-sm text-[color:var(--fg-muted)] ${T.num}`}>
                                  {filters.type.options[typeOf(item)]} · {when(item.at)}
                                </span>
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {item.verdict ? (
                                    <VerdictTag
                                      kind={item.verdict}
                                      label={common.verdicts[item.verdict].label}
                                    />
                                  ) : null}
                                  <span className="text-sm text-[color:var(--fg)]">
                                    {outcomeText(item)}
                                  </span>
                                </span>
                                {reasonOf(item) ? (
                                  <span className="text-sm text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">
                                    {reasonOf(item)}
                                  </span>
                                ) : null}
                              </span>
                              <time
                                dateTime={item.at}
                                className={`hidden font-mono text-sm text-[color:var(--fg-muted)] lg:block ${T.num}`}
                              >
                                {when(item.at)}
                              </time>
                              <span className="hidden text-sm text-[color:var(--fg)] lg:block">
                                {filters.type.options[typeOf(item)]}
                              </span>
                              <span className="hidden truncate font-mono text-sm text-[color:var(--fg)] lg:block">
                                {partyOf(item)}
                              </span>
                              <span
                                className={`hidden text-right text-sm text-[color:var(--fg)] lg:block ${T.num}`}
                              >
                                {amountOf(item)}
                              </span>
                              <span className="hidden lg:flex">
                                {item.verdict ? (
                                  <VerdictTag
                                    kind={item.verdict}
                                    label={common.verdicts[item.verdict].label}
                                  />
                                ) : null}
                              </span>
                              <span className="hidden text-sm text-[color:var(--fg-muted)] [overflow-wrap:anywhere] lg:block">
                                {reasonOf(item)}
                              </span>
                              <span className="hidden text-sm text-[color:var(--fg)] lg:block">
                                {outcomeText(item)}
                              </span>
                            </button>
                          </div>
                          {open === item.id ? <Details item={item} /> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Block>

            <div className="grid gap-2">
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => download(toCsv(state.activity))}
                >
                  {bulk.export.all}
                </Button>
              </div>
              <p className={T.small}>{bulk.export.note}</p>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
