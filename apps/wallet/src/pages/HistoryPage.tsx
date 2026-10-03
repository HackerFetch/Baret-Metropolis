import { common, history, policy, sign } from "@baret/content";
import { Button, ChangeRow, truncateAddress, VerdictTag } from "@baret/ui";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId, useState } from "react";
import { WALLET_ART } from "../assets.js";
import { ActivityRow } from "../components/ActivityRow.js";
import { Block, Empty, Rows } from "../components/Block.js";
import { Findings } from "../components/Findings.js";
import { Screen } from "../components/Screen.js";
import { type FilterId, matches, toCsv } from "../data/activity.js";
import { amount } from "../data/format.js";
import { decide } from "../data/rules.js";
import { useWallet } from "../data/store.js";
import type { ActivityItem, GuardPolicy } from "../data/types.js";

/**
 * Activity: every verdict, including requests the reader declined and the
 * ones Baret blocked. A filter (one native radio group), the rows, and under
 * an open row its details: the verdict at the time, who checked it, the
 * findings, the rule, what changed, the override, the transaction, and a
 * check of the same findings under today's rules. Export builds a CSV on this
 * device. A declined request is never logged as Blocked.
 */

function download(csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "baret-activity.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Details({ item, rules }: { item: ActivityItem; rules: GuardPolicy }): JSX.Element {
  const { detail } = history;
  const [recheck, setRecheck] = useState<ReturnType<typeof decide> | null>(null);
  const rows = [
    ...(item.hash
      ? [
          {
            label: detail.hash,
            value: <code className="font-mono">{truncateAddress(item.hash)}</code>,
          },
        ]
      : []),
    ...(item.block
      ? [{ label: detail.block, value: <span className={T.num}>{item.block}</span> }]
      : []),
    ...(item.fee ? [{ label: detail.fee, value: `${amount(item.fee)} MON` }] : []),
  ];
  return (
    <div className="grid gap-6 border-t border-[color:var(--rule)] bg-[color:var(--surface)] p-5 md:p-6">
      <p className={`${T.label}`}>{detail.title}</p>
      {item.verdict ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <p className={T.label}>{detail.verdict}</p>
            <div className="flex">
              <VerdictTag kind={item.verdict} label={common.verdicts[item.verdict].label} />
            </div>
          </div>
          <div className="grid gap-2">
            <p className={T.label}>{detail.checkedBy}</p>
            <p className="text-sm text-[color:var(--fg)]">{sign.verdict.checkedBy.value}</p>
          </div>
        </div>
      ) : null}
      {item.findings.length > 0 ? (
        <div className="grid gap-3">
          <p className={T.label}>{detail.findings}</p>
          <Findings items={item.findings} />
        </div>
      ) : null}
      {item.rule && item.kind !== "overridden" ? (
        <div className="grid gap-2">
          <p className={T.label}>{detail.rules}</p>
          <p className="text-sm text-[color:var(--fg)]">{policy.fields[item.rule].label}</p>
        </div>
      ) : null}
      {item.kind === "overridden" && item.rule ? (
        <div className="grid gap-2">
          <p className={T.label}>{detail.override}</p>
          <p className="text-sm text-[color:var(--fg)]">
            {fill(detail.overrideNote, { rule: policy.fields[item.rule].label })}
          </p>
        </div>
      ) : null}
      {item.changes.length > 0 ? (
        <div className="grid gap-2">
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
        </div>
      ) : null}
      {rows.length > 0 ? <Rows rows={rows} /> : null}
      {item.verdict ? (
        <div className="grid gap-3">
          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRecheck(decide(item.findings, rules))}
            >
              {detail.recheck}
            </Button>
          </div>
          <p
            role="status"
            className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--fg)]"
          >
            {recheck ? (
              <>
                <VerdictTag kind={recheck.verdict} label={common.verdicts[recheck.verdict].label} />
                {recheck.rule ? policy.fields[recheck.rule].label : null}
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function Component() {
  const { state } = useWallet();
  const name = useId();
  const [filter, setFilter] = useState<FilterId>("all");
  const [open, setOpen] = useState<string | null>(null);
  const rows = state.activity.filter((item) => matches(item, filter));

  const empty =
    state.activity.length === 0 ? (
      <Empty
        title={history.empty.all.title}
        body={history.empty.all.body}
        action={
          <LinkButton href={history.empty.all.action.href} label={history.empty.all.action.label} />
        }
      />
    ) : filter === "blocked" ? (
      <Empty
        title={history.empty.blocked.title}
        body={history.empty.blocked.body}
        action={
          <LinkButton
            href={history.empty.blocked.action.href}
            label={history.empty.blocked.action.label}
          />
        }
      />
    ) : (
      <Empty title={history.empty.filtered.title} body={history.empty.filtered.body} />
    );

  return (
    <Screen title={history.title} body={history.body} picture={WALLET_ART.activity}>
      <div className="grid gap-10">
        <fieldset>
          <legend className="sr-only">{history.title}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {history.filters.map((option) => (
              <Segment
                key={option.id}
                name={name}
                value={option.id}
                checked={filter === option.id}
                label={option.label}
                onSelect={(value) => {
                  setFilter(value as FilterId);
                  setOpen(null);
                }}
              />
            ))}
          </div>
        </fieldset>

        <Block
          title={history.filters.find((f) => f.id === filter)?.label ?? history.title}
          aside={<span className={`${T.label} ${T.num}`}>{rows.length}</span>}
        >
          {rows.length === 0 ? (
            empty
          ) : (
            <ul className="grid border-t border-[color:var(--rule)]">
              {rows.map((item) => (
                <li key={item.id} className="border-b border-[color:var(--rule)]">
                  <ActivityRow
                    item={item}
                    open={open === item.id}
                    onOpen={() => setOpen((current) => (current === item.id ? null : item.id))}
                  />
                  {open === item.id ? <Details item={item} rules={state.policy} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <div className="grid gap-2">
          <div className="flex">
            <Button type="button" variant="ghost" onClick={() => download(toCsv(state.activity))}>
              {history.export.label}
            </Button>
          </div>
          <p className={T.small}>{history.export.note}</p>
        </div>
      </div>
    </Screen>
  );
}
