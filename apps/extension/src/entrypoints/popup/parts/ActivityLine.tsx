import { common, extFrame, findings as findingCopy, popupActivity, sign } from "@baret/content";
import { ChangeRow, truncateAddress, VerdictTag } from "@baret/ui";
import { amount } from "@baret/wallet-ui/data/format";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ExternalLink } from "lucide-react";
import type { JSX } from "react";
import type { Activity } from "../../../data/types.js";
import { activityText, partyOf, ruleLabel, short, statusOf, timeOf } from "../../../data/words.js";
import { Dot, TEXT_BUTTON } from "../frame/bits.js";

/**
 * One row of the popup's log (docs/WALLET.md 2.2): a status dot, the site or
 * the other address in bold, then what happened and when, muted. In the
 * Activity tab a row opens in place into its details; on Home it only reads.
 */

function Line({ item }: { item: Activity }): JSX.Element {
  const status = statusOf(item);
  return (
    <>
      <span className="pt-1.5">
        <Dot verdict={item.verdict} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-[color:var(--fg)]">
            {partyOf(item) || activityText(item)}
          </span>
          <time
            dateTime={item.at}
            className={`shrink-0 font-mono text-xs text-[color:var(--fg-muted)] ${T.num}`}
          >
            {timeOf(item.at)}
          </time>
        </span>
        <span className="truncate text-sm text-[color:var(--fg-muted)]">
          {activityText(item)}
          {status ? ` · ${status}` : ""}
        </span>
      </span>
    </>
  );
}

const ROW = "grid w-full grid-cols-[10px_minmax(0,1fr)] items-start gap-x-3 px-4 py-3 text-left";

export function ActivityLine({ item }: { item: Activity }): JSX.Element {
  return (
    <div className={ROW}>
      <Line item={item} />
    </div>
  );
}

/** The row as a disclosure: the details open under it. */
export function ActivityDisclosure({
  item,
  open,
  onToggle,
  onFull,
}: {
  item: Activity;
  open: boolean;
  onToggle: () => void;
  onFull: () => void;
}): JSX.Element {
  const { detail } = popupActivity;
  return (
    <div className={open ? "bg-[color:var(--surface)]" : ""}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`${ROW} transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]`}
      >
        <Line item={item} />
      </button>
      {open ? (
        <div className="grid gap-4 px-4 pt-1 pb-4 pl-[38px]">
          {item.verdict ? (
            <div className="grid gap-1.5">
              <p className={T.label}>{detail.verdict}</p>
              <div className="flex flex-wrap items-center gap-2">
                <VerdictTag kind={item.verdict} label={common.verdicts[item.verdict].label} />
                {item.rule ? (
                  <span className="text-sm text-[color:var(--fg)]">
                    {fill(detail.rule, { rule: ruleLabel(item.rule) })}
                  </span>
                ) : null}
              </div>
              {item.status === "overridden" ? <p className={T.small}>{detail.overridden}</p> : null}
              {item.status === "unchecked" ? <p className={T.small}>{detail.unchecked}</p> : null}
            </div>
          ) : null}

          {item.findings.length > 0 ? (
            <div className="grid gap-2">
              <p className={T.label}>{detail.findings}</p>
              <ul className="grid gap-2">
                {item.findings.map((finding) => {
                  const words = findingCopy[finding.code];
                  const values = Object.fromEntries(
                    Object.entries(finding.values).map(([k, v]) => [k, short(v)]),
                  );
                  return (
                    <li
                      key={finding.code}
                      className="grid gap-0.5 border-l-2 border-[color:var(--rule-strong)] pl-3"
                    >
                      <span className="text-sm font-medium text-[color:var(--fg)]">
                        {fill(words.title, values)}
                      </span>
                      <span className={`${T.small} [overflow-wrap:anywhere]`}>
                        {fill(words.body, values)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {item.changes.length > 0 ? (
            <div className="grid gap-1">
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

          {item.fee ? <ChangeRow label={detail.fee} value={amount(item.fee)} unit="MON" /> : null}

          {item.hash ? (
            <div className="grid gap-1">
              <p className={T.label}>{detail.hash}</p>
              <p className="flex flex-wrap items-center justify-between gap-2">
                <code className="font-mono text-xs text-[color:var(--fg)]" title={item.hash}>
                  {truncateAddress(item.hash)}
                </code>
                <a
                  href={`${extFrame.links.explorer}/tx/${item.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${TEXT_BUTTON} gap-1.5`}
                >
                  {detail.explorer}
                  <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                </a>
              </p>
            </div>
          ) : null}

          <div className="flex">
            <button type="button" onClick={onFull} className={TEXT_BUTTON}>
              {detail.openFull}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
