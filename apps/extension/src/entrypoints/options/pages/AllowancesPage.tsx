import { common, extFrame, optionsAllowances } from "@baret/content";
import { Button, Meter, Tag, truncateAddress } from "@baret/ui";
import { Block, Empty } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { day } from "@baret/wallet-ui/data/format";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ExternalLink } from "lucide-react";
import { type JSX, useEffect, useId, useState } from "react";
import { OPTIONS_ART } from "../../../assets.js";
import { byExposure, now, payments, unusedFor30Days } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import type {
  AllowancePermission,
  Asset,
  PaymentPermission,
  Permission,
} from "../../../data/types.js";
import {
  counted,
  exposureText,
  holderOf,
  permissionLine,
  short,
  timeOf,
} from "../../../data/words.js";
import { Dialog, INPUT, Search, Select } from "../parts/kit.js";

/**
 * Permissions: everything that can move funds out of this wallet without a
 * new signature (allowances, collection access, payment caps), largest
 * exposure first, each with a revoke button. A row opens into its spending
 * over seven days, its caps, who holds it and its uses. The clean-up states
 * the exact count before every button, and each revoke is a transaction with
 * its own fee, so the dialogs say that too. Pausing a payment cap happens on
 * this device; nothing else can be paused.
 */

const { summary, filters, sort, kinds, columns, detail, actions, revoke, bulk } = optionsAllowances;

type FilterId = (typeof filters)[number]["id"];
type SortId = Exclude<keyof typeof sort, "label">;

const KIND_OF: Record<Exclude<FilterId, "all">, Permission["kind"]> = {
  allowances: "allowance",
  operators: "operator",
  payments: "payment",
};

/** "{count} permissions" as a figure: the value large, the rest of the sentence under it. */
function split(template: string, value: string): { value: string; label: string } {
  const match = /^\{(\w+)\}\s*/.exec(template);
  return match
    ? { value, label: template.slice(match[0].length) }
    : { value, label: fill(template, { value }) };
}

function kindLabel(p: Permission): string {
  return kinds[p.kind].label;
}

function toCsv(items: readonly Permission[], assets: readonly Asset[]): string {
  const cell = (text: string) => `"${text.replaceAll('"', '""')}"`;
  const head = [
    columns.permission,
    columns.origin,
    columns.exposure,
    columns.lastUsed,
    columns.status,
  ];
  const lines = items.map((p) =>
    [permissionLine(p), p.origin, exposureText(p, assets), p.lastUsed ?? "", p.status]
      .map(cell)
      .join(","),
  );
  return [head.map(cell).join(","), ...lines].join("\n");
}

function download(csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "baret-permissions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Seven bars, one per day, oldest first: what a payment cap spent. */
function Week({ p }: { p: PaymentPermission }): JSX.Element {
  const top = Math.max(...p.week, 0.0001);
  const total = p.week.reduce((sum, v) => sum + v, 0);
  if (total === 0) return <p className={T.small}>{detail.chart.empty}</p>;
  const today = Date.parse(now());
  return (
    <figure className="grid gap-2">
      <div
        aria-hidden="true"
        className="flex h-24 items-end gap-1.5 border-b border-[color:var(--rule-strong)]"
      >
        {p.week.map((value, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: one bar per day, never reordered.
            key={i}
            className="flex-1 bg-[color:var(--accent)]"
            style={{ height: `${Math.max((value / top) * 100, value > 0 ? 4 : 0)}%` }}
          />
        ))}
      </div>
      <figcaption className="flex justify-between gap-2">
        {p.week.map((value, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: one label per day, never reordered.
            key={i}
            className={`flex-1 text-center font-mono text-[10px] text-[color:var(--fg-muted)] ${T.num}`}
          >
            <span className="sr-only">
              {day(new Date(today - (6 - i) * 86_400_000).toISOString())}:{" "}
            </span>
            {value.toFixed(2)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function CapLine({
  label,
  spent,
  cap,
  asset,
}: {
  label: string;
  spent: string;
  cap: string | null;
  asset: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[color:var(--fg-muted)]">{label}</span>
        <span id={id} className={`text-[color:var(--fg)] ${T.num}`}>
          {cap === null
            ? common.ui.none
            : fill(detail.caps.used, { spent: `${spent} ${asset}`, cap: `${cap} ${asset}` })}
        </span>
      </p>
      {cap === null ? null : <Meter value={Number(spent)} max={Number(cap)} describedBy={id} />}
    </div>
  );
}

function Detail({
  p,
  onRevoke,
  onLimit,
  onPause,
}: {
  p: Permission;
  onRevoke: () => void;
  onLimit: () => void;
  onPause: () => void;
}): JSX.Element {
  return (
    <div className="grid gap-8 border-t border-[color:var(--rule)] bg-[color:var(--surface)] p-5 md:grid-cols-2 md:p-6">
      {p.kind === "payment" ? (
        <>
          <div className="grid content-start gap-3">
            <p className={T.label}>{detail.chart.title}</p>
            <Week p={p} />
          </div>
          <div className="grid content-start gap-3">
            <p className={T.label}>{detail.caps.title}</p>
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-[color:var(--fg-muted)]">{detail.caps.perPayment}</span>
              <span className={`text-[color:var(--fg)] ${T.num}`}>
                {p.caps.perPayment} {p.asset}
              </span>
            </p>
            <CapLine
              label={detail.caps.perHour}
              spent={p.spent.hour}
              cap={p.caps.hour}
              asset={p.asset}
            />
            <CapLine
              label={detail.caps.perDay}
              spent={p.spent.day}
              cap={p.caps.day}
              asset={p.asset}
            />
          </div>
        </>
      ) : null}
      <div className="grid content-start gap-2">
        <p className={T.label}>{detail.holder.title}</p>
        <p className={T.small}>{detail.holder.hint}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <code className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
            {p.holder}
          </code>
          {p.holder.startsWith("0x") ? (
            <a
              href={`${extFrame.links.explorer}/address/${p.holder}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
            >
              {detail.holder.explorer}
              <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            </a>
          ) : null}
        </p>
        <p className={`${T.small} ${T.num}`}>
          {fill(detail.granted, { date: day(p.granted), origin: p.origin })}
          <br />
          {p.lastUsed ? fill(detail.lastUsed, { date: day(p.lastUsed) }) : detail.neverUsed}
        </p>
      </div>
      <div className="grid content-start gap-2">
        <p className={T.label}>{detail.history.title}</p>
        {p.uses.length === 0 ? (
          <p className={T.small}>{detail.history.empty}</p>
        ) : (
          <ul className="grid border-t border-[color:var(--rule)]">
            {p.uses.map((use) => (
              <li
                key={use.at}
                className={`flex justify-between gap-4 border-b border-[color:var(--rule)] py-2 text-sm ${T.num}`}
              >
                <time dateTime={use.at} className="text-[color:var(--fg-muted)]">
                  {timeOf(use.at)}
                </time>
                <span className="text-[color:var(--fg)]">
                  {use.amount} {p.kind === "operator" ? "" : p.asset}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 md:col-span-2">
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="danger" size="sm" onClick={onRevoke}>
            {actions.revoke.label}
          </Button>
          {p.kind === "allowance" ? (
            <Button type="button" variant="ghost" size="sm" onClick={onLimit}>
              {actions.limit.label}
            </Button>
          ) : null}
          {p.kind === "payment" ? (
            <Button type="button" variant="ghost" size="sm" onClick={onPause}>
              {p.status === "paused" ? actions.resume.label : actions.pause.label}
            </Button>
          ) : null}
        </div>
        <ul className="grid gap-1">
          <li className={T.small}>{actions.revoke.hint}</li>
          {p.kind === "allowance" ? <li className={T.small}>{actions.limit.hint}</li> : null}
          {p.kind === "payment" ? <li className={T.small}>{actions.pause.hint}</li> : null}
        </ul>
      </div>
    </div>
  );
}

/** What revoking this one ends, in the dialog's own words. */
function revokeLine(p: Permission): string {
  if (p.kind === "allowance")
    return fill(revoke.allowance, { spender: short(p.spender), asset: p.asset });
  if (p.kind === "operator")
    return fill(revoke.operator, { operator: short(p.operator), contract: p.contract });
  return fill(revoke.payment, { merchant: p.merchant });
}

const AMOUNT = /^\d+(?:[.,]\d{1,6})?$/;

export function Component() {
  const { state, dispatch } = useExtension();
  const filterName = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [order, setOrder] = useState<SortId>("exposure");
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // One dialog at a time: what it is about, and the permissions it acts on.
  const [dialog, setDialog] = useState<
    | { kind: "revoke"; ids: readonly string[]; title: string; body: string }
    | { kind: "limit"; ids: readonly string[] }
    | null
  >(null);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; ids: readonly string[] } | null>(null);
  const [said, setSaid] = useState("");

  const mine = state.permissions.filter((p) => p.account === state.active);
  const sorted =
    order === "exposure"
      ? byExposure(mine)
      : order === "recent"
        ? [...mine].sort((a, b) => Date.parse(b.lastUsed ?? "0") - Date.parse(a.lastUsed ?? "0"))
        : [...mine].sort((a, b) => Date.parse(a.granted) - Date.parse(b.granted));
  const rows = sorted.filter((p) => {
    if (filter !== "all" && p.kind !== KIND_OF[filter]) return false;
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return [p.origin, holderOf(p), p.holder, p.kind === "operator" ? p.contract : p.asset]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const unlimited = mine.filter(
    (p): p is AllowancePermission => p.kind === "allowance" && p.amount === null,
  );
  const unused = mine.filter((p) => unusedFor30Days(p));
  const paused = mine.filter((p) => p.status === "paused");
  const spent = payments(mine)
    .reduce((sum, p) => sum + Number(p.spent.day), 0)
    .toFixed(2);
  const picked = rows.filter((p) => selected.has(p.id));

  // The revokes, one transaction each, stood in for by a short wait per permission.
  useEffect(() => {
    if (!progress) return;
    if (progress.done >= progress.ids.length) {
      dispatch({ type: "revoke", ids: progress.ids, at: new Date().toISOString() });
      setSelected(new Set());
      setSaid(
        progress.ids.length === 1
          ? revoke.done
          : fill(bulk.progress, {
              count: String(progress.ids.length),
              total: String(progress.ids.length),
            }),
      );
      setProgress(null);
      setDialog(null);
      return;
    }
    const id = window.setTimeout(() => setProgress({ ...progress, done: progress.done + 1 }), 450);
    return () => window.clearTimeout(id);
  }, [progress, dispatch]);

  function askRevoke(ids: readonly string[], title: string, body: string): void {
    setDialog({ kind: "revoke", ids, title, body });
  }

  const working = progress !== null;
  const limitIds = dialog?.kind === "limit" ? dialog.ids : [];
  const limitsValid = limitIds.every((id) => AMOUNT.test((limits[id] ?? "").trim()));

  const sortOptions = (["exposure", "recent", "oldest"] as const).map((value) => ({
    value,
    label: sort[value],
  }));
  const figures = [
    split(mine.length === 1 ? summary.totalOne : summary.total, String(mine.length)),
    split(summary.unlimited, String(unlimited.length)),
    split(summary.paused, String(paused.length)),
    split(summary.spent24h, `${spent} USDC`),
  ];

  return (
    <Screen
      title={optionsAllowances.title}
      body={optionsAllowances.lead}
      picture={OPTIONS_ART.permissions}
    >
      <div className="grid gap-12">
        <p role="status" className="sr-only">
          {said}
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
          {figures.map((figure) => (
            <div
              key={figure.label}
              className="grid content-start gap-1 border-t border-[color:var(--rule-strong)] pt-3"
            >
              <p
                className={`font-display text-4xl font-extrabold leading-none text-[color:var(--fg)] ${T.num}`}
              >
                {figure.value}
              </p>
              <p className={T.small}>{figure.label}</p>
            </div>
          ))}
        </div>

        {mine.length === 0 ? (
          <Empty title={optionsAllowances.empty.title} body={optionsAllowances.empty.body} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-8">
                <Search
                  label={columns.permission}
                  placeholder={optionsAllowances.search.placeholder}
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <Select
                className="md:col-span-4"
                label={sort.label}
                value={order}
                options={sortOptions}
                onChange={setOrder}
              />
              <fieldset className="md:col-span-12">
                <legend className="sr-only">{columns.permission}</legend>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {filters.map((option) => (
                    <Segment
                      key={option.id}
                      name={filterName}
                      value={option.id}
                      checked={filter === option.id}
                      label={option.label}
                      onSelect={(value) => {
                        const next = filters.find((f) => f.id === value);
                        if (next) setFilter(next.id);
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            <Block
              title={optionsAllowances.title}
              aside={<span className={`${T.label} ${T.num}`}>{rows.length}</span>}
            >
              {rows.length === 0 ? (
                <Empty
                  title={optionsAllowances.emptyFiltered.title}
                  body={optionsAllowances.emptyFiltered.body}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      {optionsAllowances.emptyFiltered.action.label}
                    </Button>
                  }
                />
              ) : (
                <ul className="grid border-t border-[color:var(--rule)]">
                  {rows.map((p) => {
                    const noLimit = p.kind === "allowance" && p.amount === null;
                    return (
                      <li key={p.id} className="border-b border-[color:var(--rule)]">
                        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-x-3">
                          <label className="flex size-11 cursor-pointer items-center justify-center">
                            <span className="sr-only">{permissionLine(p)}</span>
                            <input
                              type="checkbox"
                              checked={selected.has(p.id)}
                              onChange={(event) => {
                                const next = new Set(selected);
                                if (event.currentTarget.checked) next.add(p.id);
                                else next.delete(p.id);
                                setSelected(next);
                              }}
                              className="size-5 cursor-pointer accent-[color:var(--fg)]"
                            />
                          </label>
                          <button
                            type="button"
                            aria-expanded={open === p.id}
                            onClick={() => setOpen(open === p.id ? null : p.id)}
                            className="grid min-w-0 gap-2 py-3.5 pr-2 text-left transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] md:grid-cols-[minmax(0,1fr)_9rem_8rem_7rem] md:items-center md:gap-x-6"
                          >
                            <span className="grid min-w-0 gap-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className={T.label}>{kindLabel(p)}</span>
                                <span className="font-mono text-xs text-[color:var(--fg-muted)]">
                                  {p.origin}
                                </span>
                              </span>
                              <span className="text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                                {permissionLine(p)}
                              </span>
                            </span>
                            <span
                              className={`font-display text-lg font-bold uppercase md:text-right ${noLimit ? "text-[color:var(--blocked-ink)]" : "text-[color:var(--fg)]"} ${T.num}`}
                            >
                              <span className="sr-only">{columns.exposure}: </span>
                              {exposureText(p, state.assets)}
                            </span>
                            <span className={`text-sm text-[color:var(--fg-muted)] ${T.num}`}>
                              <span className="sr-only">{columns.lastUsed}: </span>
                              {p.lastUsed ? timeOf(p.lastUsed) : detail.neverUsed}
                            </span>
                            <span className="flex md:justify-end">
                              <Tag
                                tone={
                                  p.status === "paused"
                                    ? "neutral"
                                    : noLimit
                                      ? "blocked"
                                      : "watching"
                                }
                                size="sm"
                              >
                                {p.status === "paused"
                                  ? optionsAllowances.status.paused
                                  : noLimit
                                    ? optionsAllowances.status.unlimited
                                    : optionsAllowances.status.active}
                              </Tag>
                            </span>
                          </button>
                        </div>
                        {open === p.id ? (
                          <Detail
                            p={p}
                            onRevoke={() => askRevoke([p.id], revoke.title, revokeLine(p))}
                            onLimit={() => {
                              setLimits({});
                              setDialog({ kind: "limit", ids: [p.id] });
                            }}
                            onPause={() =>
                              dispatch({
                                type: "permissionStatus",
                                id: p.id,
                                status: p.status === "paused" ? "active" : "paused",
                              })
                            }
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Block>

            <Block title={bulk.title}>
              <p className={`text-sm font-medium text-[color:var(--fg)] ${T.num}`}>
                {fill(bulk.selected, { count: String(picked.length) })}
              </p>
              <ul className="grid border-t border-[color:var(--rule)]">
                {[
                  {
                    key: "selected",
                    count: picked.length,
                    label: counted(
                      picked.length,
                      bulk.revokeSelected.label,
                      bulk.revokeSelected.labelOne,
                    ),
                    body: counted(
                      picked.length,
                      bulk.revokeSelected.body,
                      bulk.revokeSelected.bodyOne,
                    ),
                    run: () =>
                      askRevoke(
                        picked.map((p) => p.id),
                        counted(
                          picked.length,
                          bulk.revokeSelected.label,
                          bulk.revokeSelected.labelOne,
                        ),
                        counted(
                          picked.length,
                          bulk.revokeSelected.body,
                          bulk.revokeSelected.bodyOne,
                        ),
                      ),
                  },
                  {
                    key: "unused",
                    count: unused.length,
                    label: counted(unused.length, bulk.unused.label, bulk.unused.labelOne),
                    body: counted(unused.length, bulk.unused.body, bulk.unused.bodyOne),
                    run: () =>
                      askRevoke(
                        unused.map((p) => p.id),
                        counted(unused.length, bulk.unused.label, bulk.unused.labelOne),
                        counted(unused.length, bulk.unused.body, bulk.unused.bodyOne),
                      ),
                  },
                  {
                    key: "unlimited",
                    count: unlimited.length,
                    label: counted(unlimited.length, bulk.unlimited.label, bulk.unlimited.labelOne),
                    body: counted(unlimited.length, bulk.unlimited.body, bulk.unlimited.bodyOne),
                    run: () => {
                      setLimits({});
                      setDialog({ kind: "limit", ids: unlimited.map((p) => p.id) });
                    },
                  },
                  {
                    key: "all",
                    count: mine.length,
                    label: counted(mine.length, bulk.all.label, bulk.all.labelOne),
                    body: counted(mine.length, bulk.all.body, bulk.all.bodyOne),
                    run: () =>
                      askRevoke(
                        mine.map((p) => p.id),
                        counted(mine.length, bulk.all.label, bulk.all.labelOne),
                        counted(mine.length, bulk.all.body, bulk.all.bodyOne),
                      ),
                  },
                ].map((action) => (
                  <li
                    key={action.key}
                    className="grid gap-2 border-b border-[color:var(--rule)] py-4 md:grid-cols-12 md:items-center md:gap-6"
                  >
                    <p className={`${T.small} md:col-span-8`}>{action.body}</p>
                    <div className="md:col-span-4 md:justify-self-end">
                      <Button
                        type="button"
                        variant={action.key === "unlimited" ? "ghost" : "danger"}
                        size="sm"
                        disabled={action.count === 0 || working}
                        onClick={action.run}
                      >
                        {action.label}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="grid gap-1">
                <div className="flex">
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={() => download(toCsv(mine, state.assets))}
                  >
                    {bulk.export.label}
                  </Button>
                </div>
                <p className={T.small}>{bulk.export.note}</p>
              </div>
            </Block>
          </>
        )}

        <Block title={optionsAllowances.help.title}>
          <div className="grid gap-3 md:max-w-[68ch]">
            <p className={T.body}>{optionsAllowances.help.body}</p>
            <p className="text-base text-[color:var(--fg)]">{optionsAllowances.help.exposure}</p>
          </div>
        </Block>
      </div>

      <Dialog
        open={dialog?.kind === "revoke"}
        title={dialog?.kind === "revoke" ? dialog.title : revoke.title}
        action={
          working
            ? progress && progress.ids.length > 1
              ? fill(bulk.progress, {
                  count: String(progress.done),
                  total: String(progress.ids.length),
                })
              : revoke.working
            : revoke.action
        }
        cancel={revoke.cancel}
        danger
        disabled={working}
        onCancel={() => {
          if (!working) setDialog(null);
        }}
        onConfirm={() => {
          if (dialog?.kind === "revoke") setProgress({ done: 0, ids: dialog.ids });
        }}
      >
        {dialog?.kind === "revoke" ? (
          <>
            <p className="text-base text-[color:var(--fg)]">{dialog.body}</p>
            <p className={T.small}>{revoke.fee}</p>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={dialog?.kind === "limit"}
        title={
          limitIds.length > 1
            ? counted(limitIds.length, bulk.unlimited.label, bulk.unlimited.labelOne)
            : actions.limit.label
        }
        action={actions.limit.label}
        disabled={!limitsValid}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (!limitsValid) return;
          for (const id of limitIds) {
            dispatch({ type: "limit", id, amount: (limits[id] ?? "").trim().replace(",", ".") });
          }
          setDialog(null);
        }}
      >
        <p className={T.small}>{actions.limit.hint}</p>
        {limitIds.map((id) => {
          const p = mine.find((item) => item.id === id);
          if (p?.kind !== "allowance") return null;
          return (
            <LimitField
              key={id}
              label={`${truncateAddress(p.spender)} · ${p.asset}`}
              value={limits[id] ?? ""}
              onChange={(value) => setLimits({ ...limits, [id]: value })}
              hint={common.labels.amount}
            />
          );
        })}
        <p className={T.small}>{revoke.fee}</p>
      </Dialog>
    </Screen>
  );
}

function LimitField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
}): JSX.Element {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[color:var(--fg)]">
        {label}
        <span className={`${T.label} ml-2`}>{hint}</span>
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder="0.00"
        autoComplete="off"
        className={`${INPUT} ${T.num}`}
      />
    </div>
  );
}
