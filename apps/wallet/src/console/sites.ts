import type { ActivityItem, Permission } from "@baret/wallet-ui/data/types";
import type { SiteRecord } from "./siteBook.js";

/**
 * The Sites screen's pure part: one row per site, built from the wallet's
 * own records (its activity log, its site permissions and the sites the
 * request windows noted on disk, siteBook.ts). Nothing here is read from a
 * server, so the screen never shows a site this browser did not see. Tested
 * in sites.test.ts.
 */

/** Activity kinds where Baret or the reader stopped the request. */
const STOPPED = new Set<ActivityItem["kind"]>(["blocked", "declined", "expired"]);

export interface SiteRow {
  readonly origin: string;
  /** ISO time of the latest record; null for a site known only by its permission. */
  readonly last: string | null;
  /** The latest record's kind. */
  readonly lastKind: ActivityItem["kind"] | null;
  readonly requests: number;
  readonly stopped: number;
  readonly connected: boolean;
}

/** Every site, the most recent first; sites known only by a permission go last. */
export function sitesFrom(
  activity: readonly ActivityItem[],
  permissions: readonly Permission[],
): SiteRow[] {
  const rows = new Map<
    string,
    {
      last: string | null;
      lastKind: ActivityItem["kind"] | null;
      requests: number;
      stopped: number;
    }
  >();
  for (const item of activity) {
    const origin = item.values.origin;
    if (!origin) continue;
    const row = rows.get(origin) ?? { last: null, lastKind: null, requests: 0, stopped: 0 };
    row.requests += 1;
    if (STOPPED.has(item.kind)) row.stopped += 1;
    if (row.last === null || item.at > row.last) {
      row.last = item.at;
      row.lastKind = item.kind;
    }
    rows.set(origin, row);
  }
  const connected = new Set(
    permissions.flatMap((p) => (p.kind === "site" && p.values.origin ? [p.values.origin] : [])),
  );
  for (const origin of connected) {
    if (!rows.has(origin))
      rows.set(origin, { last: null, lastKind: null, requests: 0, stopped: 0 });
  }
  return [...rows.entries()]
    .map(([origin, row]) => ({ origin, ...row, connected: connected.has(origin) }))
    .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
}

/**
 * The rows from this tab's memory joined with the records on disk
 * (siteBook.ts), which the request windows write from their own documents.
 * One row a site. Where both saw a site, the larger count and the later time
 * win: the two can hold the same request, and adding them would count it twice.
 */
export function withStored(rows: readonly SiteRow[], records: readonly SiteRecord[]): SiteRow[] {
  const byOrigin = new Map(rows.map((row) => [row.origin, row]));
  for (const record of records) {
    const row = byOrigin.get(record.origin);
    const stored: SiteRow = {
      origin: record.origin,
      last: record.last,
      lastKind: record.lastKind,
      requests: record.connects + record.signs,
      stopped: record.stopped,
      connected: record.connected,
    };
    if (!row) {
      byOrigin.set(record.origin, stored);
      continue;
    }
    const later = row.last === null || record.last > row.last;
    byOrigin.set(record.origin, {
      origin: record.origin,
      last: later ? record.last : row.last,
      lastKind: later ? record.lastKind : row.lastKind,
      requests: Math.max(row.requests, stored.requests),
      stopped: Math.max(row.stopped, stored.stopped),
      connected: row.connected || record.connected,
    });
  }
  return [...byOrigin.values()].sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
}

/** The records left once a site is forgotten: its rows and its connection go. */
export function forget(
  origin: string,
  activity: readonly ActivityItem[],
  permissions: readonly Permission[],
): { activity: ActivityItem[]; permissions: Permission[] } {
  return {
    activity: activity.filter((item) => item.values.origin !== origin),
    permissions: permissions.filter((p) => !(p.kind === "site" && p.values.origin === origin)),
  };
}

/**
 * A site's request as the activity log keeps it: the record carries the
 * site's origin, without its scheme as /connect writes it, so /sites counts
 * signs and messages and not only connects.
 */
export function fromSite(item: ActivityItem, origin: string): ActivityItem {
  const host = origin.replace(/^https?:\/\//, "");
  if (!host) return item;
  return { ...item, values: { ...item.values, origin: host } };
}
