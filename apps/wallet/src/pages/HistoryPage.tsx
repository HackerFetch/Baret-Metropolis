import { common, history, policy, sign, walletFrame } from "@baret/content";
import { Button, ChangeRow, truncateAddress, VerdictTag } from "@baret/ui";
import { ActivityRow } from "@baret/wallet-ui/components/ActivityRow";
import { Block, Empty, Problem, Rows } from "@baret/wallet-ui/components/Block";
import { Findings } from "@baret/wallet-ui/components/Findings";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { type FilterId, matches, toCsv } from "@baret/wallet-ui/data/activity";
import { amount } from "@baret/wallet-ui/data/format";
import { decide } from "@baret/wallet-ui/data/rules";
import { type RuleChange, ready, useWallet } from "@baret/wallet-ui/data/store";
import type { ActivityItem, GuardPolicy, GuardPolicyField } from "@baret/wallet-ui/data/types";
import { valueText } from "@baret/wallet-ui/rules/fields";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId, useState } from "react";
import { WALLET_ART } from "../assets.js";

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

/** The explorer's base address, for a transaction hash. */
const EXPLORER = walletFrame.links.explorer;

/** Only a full transaction hash gets an explorer link; anything else would open a dead page. */
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/** A rule's value when the item happened: the earliest later change holds what it was. */
function valueAt(
  field: GuardPolicyField,
  at: string,
  rules: GuardPolicy,
  changes: readonly RuleChange[],
): GuardPolicy[GuardPolicyField] {
  const later = changes
    .filter((change) => change.field === field && change.at > at)
    .sort((a, b) => a.at.localeCompare(b.at));
  return later[0] ? later[0].previous : rules[field];
}

function Details({
  item,
  rules,
  changes,
}: {
  item: ActivityItem;
  rules: GuardPolicy;
  changes: readonly RuleChange[];
}): JSX.Element {
  const { detail } = history;
  const [recheck, setRecheck] = useState<ReturnType<typeof decide> | null>(null);
  const rows = [
    ...(item.hash
      ? [
          {
            label: detail.hash,
            value: (
              <span className="inline-flex flex-wrap items-center gap-x-4">
                <code className="font-mono">{truncateAddress(item.hash)}</code>
                {TX_HASH.test(item.hash) ? (
                  <a
                    href={`${EXPLORER}/tx/${item.hash}`}
                    rel="noreferrer"
                    target="_blank"
                    className="inline-flex min-h-11 items-center underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
                  >
                    {history.detail.explorer}
                  </a>
                ) : null}
              </span>
            ),
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
      {item.rule ? (
        <div className="grid gap-2">
          <p className={T.label}>{detail.rulesInForce}</p>
          <p className="text-sm text-[color:var(--fg)]">
            {policy.fields[item.rule].label}:{" "}
            {valueText(item.rule, valueAt(item.rule, item.at, rules, changes))}
          </p>
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
  // Fail-closed: activity that did not load is an error, never an empty log.
  const loaded = ready(state, "activity");
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
          {!loaded ? (
            <Problem
              title={history.errors.load.title}
              body={history.errors.load.body}
              action={
                <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
                  {history.errors.load.action.label}
                </Button>
              }
            />
          ) : rows.length === 0 ? (
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
                  {open === item.id ? (
                    <Details item={item} rules={state.policy} changes={state.ruleChanges} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <div className={loaded ? "grid gap-2" : "hidden"}>
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
