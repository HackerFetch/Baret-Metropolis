import type { ActivityItem } from "@baret/wallet-ui/data/types";

/**
 * The sites this browser saw, kept on disk so /sites can list them.
 *
 * A site connects and asks for signatures in a window of its own (/connect,
 * /sign), a separate document whose memory goes when it closes; /sites is
 * read in another tab. So the request windows note each answered request
 * here, under a key of its own, and /sites reads it back. Nothing secret:
 * the site's host, two times and three counts. The passkey, the session and
 * the rules keep their own keys (live/storage.ts) and are never touched.
 * Every read and write is wrapped: storage that throws or is full keeps the
 * screen working, with fewer rows. Tested in siteBook.test.ts.
 */

/** Its own key, versioned: a later shape gets a new one. */
export const SITES_KEY = "baret.sites.v1";

/** Enough for any real use; the oldest site goes first past it. */
const MAX_SITES = 100;

/** Activity kinds where Baret or the reader stopped the request (as sites.ts counts them). */
const STOPPED = new Set<ActivityItem["kind"]>(["blocked", "declined", "expired"]);

export interface SiteRecord {
  /** The host, without its scheme, as the request windows log it. */
  readonly origin: string;
  /** ISO time of the first and the latest request. */
  readonly first: string;
  readonly last: string;
  readonly lastKind: ActivityItem["kind"];
  /** Connects answered yes. */
  readonly connects: number;
  /** Every other request: signatures, messages, payments, blocked or not. */
  readonly signs: number;
  /** Of those, the ones Baret stopped or the reader declined. */
  readonly stopped: number;
  /** True after a connect, false again after a disconnect. */
  readonly connected: boolean;
}

/** The storage to use, or null where there is none or it refuses access. */
function local(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** One stored entry, or null when it is not one this version wrote. */
function readOne(value: unknown): SiteRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.origin !== "string" || r.origin === "") return null;
  if (typeof r.first !== "string" || typeof r.last !== "string") return null;
  if (typeof r.lastKind !== "string") return null;
  if (!isCount(r.connects) || !isCount(r.signs) || !isCount(r.stopped)) return null;
  if (typeof r.connected !== "boolean") return null;
  return {
    origin: r.origin,
    first: r.first,
    last: r.last,
    lastKind: r.lastKind as ActivityItem["kind"],
    connects: r.connects,
    signs: r.signs,
    stopped: r.stopped,
    connected: r.connected,
  };
}

/** Every site on disk, the most recent first. Anything unreadable reads as no record. */
export function readSites(storage: Storage | null = local()): SiteRecord[] {
  try {
    const text = storage?.getItem(SITES_KEY);
    if (!text) return [];
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(readOne)
      .filter((record): record is SiteRecord => record !== null)
      .sort((a, b) => b.last.localeCompare(a.last));
  } catch {
    return [];
  }
}

function write(records: readonly SiteRecord[], storage: Storage | null): void {
  try {
    if (!storage) return;
    if (records.length === 0) storage.removeItem(SITES_KEY);
    else storage.setItem(SITES_KEY, JSON.stringify(records.slice(0, MAX_SITES)));
  } catch {
    // Full or refused: the request was answered anyway; only the list misses it.
  }
}

/** The records with one more request from its site counted in. Pure. */
export function withRequest(records: readonly SiteRecord[], item: ActivityItem): SiteRecord[] {
  const origin = item.values.origin;
  if (!origin) return [...records];
  const before = records.find((record) => record.origin === origin);
  const connect = item.kind === "connect";
  const next: SiteRecord = {
    origin,
    first: before && before.first < item.at ? before.first : item.at,
    last: before && before.last > item.at ? before.last : item.at,
    lastKind: before && before.last > item.at ? before.lastKind : item.kind,
    connects: (before?.connects ?? 0) + (connect ? 1 : 0),
    signs: (before?.signs ?? 0) + (connect || item.kind === "disconnect" ? 0 : 1),
    stopped: (before?.stopped ?? 0) + (STOPPED.has(item.kind) ? 1 : 0),
    connected: connect ? true : item.kind === "disconnect" ? false : (before?.connected ?? false),
  };
  return [next, ...records.filter((record) => record.origin !== origin)].sort((a, b) =>
    b.last.localeCompare(a.last),
  );
}

/** Counts a site's answered request on disk. Called by /connect and /sign. */
export function noteSite(item: ActivityItem, storage: Storage | null = local()): void {
  if (!item.values.origin) return;
  write(withRequest(readSites(storage), item), storage);
}

/** Forget on /sites: the site's record leaves the disk too. */
export function forgetStored(origin: string, storage: Storage | null = local()): void {
  write(
    readSites(storage).filter((record) => record.origin !== origin),
    storage,
  );
}
