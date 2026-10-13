import { walletX402 } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ArrowUpRight, CircleDollarSign, Flag, Settings2, ShieldCheck } from "lucide-react";
import { type JSX, useEffect, useRef } from "react";
import type { FeedRow } from "./audit.js";

/**
 * The console's live feed: one row an event, newest on top. A row that
 * arrived since the last read glows once (CSS, off under reduced motion), so
 * a new payment is seen without anything moving under the reader. Each row:
 * what happened, the merchant (or the flagged address), the agent, the
 * amount, when, and the transaction on Monadscan in a new tab.
 */

const copy = walletX402;
export const EXPLORER_TX = "https://testnet.monadscan.com/tx/";

/** "12 s ago" from unix seconds. */
export function ago(time: number | null, now: number): string {
  if (time === null) return "";
  const s = Math.max(0, Math.round(now / 1000 - time));
  if (s < 5) return copy.justNow;
  if (s < 60) return fill(copy.ago.s, { n: String(s) });
  if (s < 3600) return fill(copy.ago.m, { n: String(Math.floor(s / 60)) });
  if (s < 86400) return fill(copy.ago.h, { n: String(Math.floor(s / 3600)) });
  return fill(copy.ago.d, { n: String(Math.floor(s / 86400)) });
}

function KindIcon({ kind }: { kind: FeedRow["kind"] }): JSX.Element {
  const props = { className: "size-4", strokeWidth: 1.75, "aria-hidden": true } as const;
  if (kind === "payment") return <CircleDollarSign {...props} />;
  if (kind === "flagged") return <Flag {...props} />;
  if (kind === "cleared") return <ShieldCheck {...props} />;
  return <Settings2 {...props} />;
}

const TONE: Partial<Record<FeedRow["kind"], string>> = {
  payment: "bg-[color:var(--safe-dim)] text-[color:var(--safe-ink)]",
  flagged: "bg-[color:var(--blocked-dim)] text-[color:var(--blocked-ink)]",
  cleared: "bg-[color:var(--network-dim)] text-[color:var(--network-ink)]",
};

function Addr({ value }: { value: string | null }): JSX.Element {
  if (!value) return <span className="text-[color:var(--fg-faint)]">-</span>;
  return (
    <code className="font-mono text-sm text-[color:var(--fg)]" title={value}>
      {truncateAddress(value)}
    </code>
  );
}

export function Feed({
  rows,
  now,
  label,
}: {
  rows: readonly FeedRow[];
  now: number;
  label: string;
}): JSX.Element {
  // The ids seen on the previous paint; anything else is new and glows once.
  const seen = useRef<Set<string> | null>(null);
  const previous = seen.current;
  useEffect(() => {
    seen.current = new Set(rows.map((r) => r.id));
  }, [rows]);

  return (
    <div className="grid">
      <div
        aria-hidden="true"
        className={`hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_2.75rem] gap-4 border-b border-[color:var(--rule-strong)] pb-2 md:grid ${T.label}`}
      >
        <span>{copy.feed.columns.kind}</span>
        <span>{copy.feed.columns.merchant}</span>
        <span>{copy.feed.columns.agent}</span>
        <span className="text-right">{copy.feed.columns.amount}</span>
        <span className="text-right">{copy.feed.columns.time}</span>
        <span className="sr-only">{copy.feed.columns.tx}</span>
      </div>
      <ul aria-label={label} className="grid">
        {rows.map((row) => {
          const fresh = previous !== null && !previous.has(row.id);
          return (
            <li
              key={row.id}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-[color:var(--rule)] py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_2.75rem] ${fresh ? "motion-safe:animate-[feed-in_1.6s_ease-out]" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center ${TONE[row.kind] ?? "bg-[color:var(--ground-deep)] text-[color:var(--fg-muted)]"}`}
                >
                  <KindIcon kind={row.kind} />
                </span>
                <span className="grid min-w-0">
                  <span className="truncate text-sm font-medium text-[color:var(--fg)]">
                    {copy.kinds[row.kind]}
                  </span>
                  {row.reason ? (
                    <span className="truncate font-mono text-xs text-[color:var(--fg-muted)]">
                      {row.reason}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="text-right font-display text-lg font-bold tabular-nums text-[color:var(--fg)] md:order-4">
                {row.amount ? `${row.amount} ${copy.asset}` : ""}
              </span>
              <span className="col-span-2 flex flex-wrap gap-x-3 text-sm md:order-2 md:col-span-1">
                <span className="text-[color:var(--fg-muted)] md:sr-only">
                  {copy.feed.columns.merchant}
                </span>
                <Addr value={row.merchant} />
              </span>
              <span className="col-span-2 flex flex-wrap gap-x-3 text-sm md:order-3 md:col-span-1">
                <span className="text-[color:var(--fg-muted)] md:sr-only">
                  {copy.feed.columns.agent}
                </span>
                <Addr value={row.agent} />
              </span>
              <span className={`${T.small} ${T.num} md:order-5 md:text-right`}>
                {ago(row.time, now)}
              </span>
              <span className="flex justify-end md:order-6">
                {row.txHash ? (
                  <a
                    href={`${EXPLORER_TX}${row.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={fill(copy.feed.explorerLabel, {
                      hash: truncateAddress(row.txHash),
                    })}
                    title={copy.feed.explorer}
                    className="flex size-11 items-center justify-center text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
                  >
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </a>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
