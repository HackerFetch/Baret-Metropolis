import { walletSites } from "@baret/content";
import { Button } from "@baret/ui";
import { Empty } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { when } from "@baret/wallet-ui/data/format";
import { useWallet } from "@baret/wallet-ui/data/store";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { Globe } from "lucide-react";
import { type JSX, useEffect, useMemo, useState } from "react";
import { forgetStored, readSites, SITES_KEY, type SiteRecord } from "../console/siteBook.js";
import { forget, type SiteRow, sitesFrom, withStored } from "../console/sites.js";
import { useLive } from "../live/live.js";

/**
 * /sites: every site that connected to this wallet or sent it a request,
 * built from the wallet's own records (console/sites.ts). Live, that includes
 * what the request windows noted on disk (console/siteBook.ts), since a site
 * asks in a window of its own; a window answering while this screen is open
 * shows up at once. One row a site: its address, its connection, the latest
 * request and how many were stopped. Forget clears the site's records from
 * this browser, on disk too; nothing on Monad changes, and the note says so.
 */

const copy = walletSites;

function kindLabel(kind: SiteRow["lastKind"]): string {
  if (kind === null) return "";
  return (copy.kinds as Record<string, string>)[kind] ?? copy.kinds.other;
}

function SiteItem({ row, onForget }: { row: SiteRow; onForget: () => void }): JSX.Element {
  return (
    <li className="grid gap-3 border-b border-[color:var(--rule)] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center border border-[color:var(--rule)] bg-[color:var(--ground-deep)] text-[color:var(--fg-muted)]"
        >
          <Globe className="size-5" strokeWidth={1.5} />
        </span>
        <div className="grid min-w-0 gap-1">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
              {row.origin}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] ${row.connected ? "text-[color:var(--safe-ink)]" : "text-[color:var(--fg-muted)]"}`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${row.connected ? "bg-[color:var(--safe)]" : "bg-[color:var(--fg-faint)]"}`}
              />
              {row.connected ? copy.connected.yes : copy.connected.no}
            </span>
          </p>
          <p className={`${T.small} ${T.num}`}>
            {[
              row.last ? `${kindLabel(row.lastKind)}, ${when(row.last)}` : null,
              counted(row.requests, copy.requests, copy.requestsOne),
              row.stopped > 0 ? fill(copy.stopped, { count: String(row.stopped) }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={fill(copy.forgetLabel, { origin: row.origin })}
          onClick={onForget}
        >
          {copy.forget}
        </Button>
      </div>
    </li>
  );
}

export function Component(): JSX.Element {
  const { state, dispatch } = useWallet();
  const live = useLive() !== null;
  // The sample keeps to its own records: the disk holds the live wallet's sites.
  const [stored, setStored] = useState<SiteRecord[]>(() => (live ? readSites() : []));
  useEffect(() => {
    if (!live) return;
    // Another document (a request window) wrote the list: read it again.
    const onStorage = (event: StorageEvent): void => {
      if (event.key === null || event.key === SITES_KEY) setStored(readSites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [live]);
  const rows = useMemo(
    () => withStored(sitesFrom(state.activity, state.permissions), stored),
    [state.activity, state.permissions, stored],
  );
  const [forgotten, setForgotten] = useState<string | null>(null);

  function forgetSite(origin: string): void {
    dispatch({ type: "patch", patch: forget(origin, state.activity, state.permissions) });
    if (live) {
      forgetStored(origin);
      setStored(readSites());
    }
    setForgotten(origin);
  }

  return (
    <Screen title={copy.title} body={copy.body}>
      <div className="grid gap-6">
        <p role="status" aria-live="polite" className="text-sm text-[color:var(--fg)] empty:hidden">
          {forgotten ? fill(copy.forgotten, { origin: forgotten }) : ""}
        </p>
        {rows.length === 0 ? (
          <Empty
            title={copy.empty.title}
            body={copy.empty.body}
            action={
              <LinkButton
                href={copy.empty.action.href}
                label={copy.empty.action.label}
                icon="arrow-up-right"
                newTab
              />
            }
          />
        ) : (
          <ul aria-label={copy.title} className="grid border-t border-[color:var(--rule-strong)]">
            {rows.map((row) => (
              <SiteItem key={row.origin} row={row} onForget={() => forgetSite(row.origin)} />
            ))}
          </ul>
        )}
        <p className={`${T.small} max-w-[64ch]`}>{copy.note}</p>
      </div>
    </Screen>
  );
}
