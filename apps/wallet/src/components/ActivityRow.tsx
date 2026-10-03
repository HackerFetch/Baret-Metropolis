import { common } from "@baret/content";
import { VerdictTag } from "@baret/ui";
import type { JSX } from "react";
import { rowText } from "../data/activity.js";
import { when } from "../data/format.js";
import type { ActivityItem } from "../data/types.js";

/**
 * One line of the activity log: the verdict at the time (when a check ran),
 * the sentence for what happened, and when. Addresses are shortened in the
 * sentence; the detail view shows them in full.
 */

export function VerdictOf({ item }: { item: ActivityItem }): JSX.Element | null {
  if (!item.verdict) return null;
  return <VerdictTag kind={item.verdict} label={common.verdicts[item.verdict].label} />;
}

export function ActivityRow({
  item,
  onOpen,
  open,
}: {
  item: ActivityItem;
  /** When given, the row is a button that opens its details. */
  onOpen?: () => void;
  open?: boolean;
}): JSX.Element {
  // Phones: the verdict and the time on one line, the sentence under them.
  // From 640 px: verdict, sentence, time in one row.
  const body = (
    <>
      <span className="col-start-1 row-start-1 flex">
        <VerdictOf item={item} />
      </span>
      <span className="col-span-2 row-start-2 min-w-0 text-base text-[color:var(--fg)] [overflow-wrap:break-word] sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {rowText(item)}
      </span>
      <time
        dateTime={item.at}
        className="col-start-2 row-start-1 justify-self-end font-mono text-sm text-[color:var(--fg-muted)] tabular-nums sm:col-start-3"
      >
        {when(item.at)}
      </time>
    </>
  );
  const row =
    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto]";
  return onOpen ? (
    <button
      type="button"
      aria-expanded={open}
      onClick={onOpen}
      className={`${row} w-full text-left transition-colors hover:bg-[color:var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]`}
    >
      {body}
    </button>
  ) : (
    <div className={row}>{body}</div>
  );
}
