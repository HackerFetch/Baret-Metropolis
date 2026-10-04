import { common, type popupActivity, type popupHome } from "@baret/content";
import { amount as grouped, toUnits } from "@baret/wallet-ui/data/format";
import { changedFields } from "@baret/wallet-ui/data/rules";
import { SAMPLE_NOW } from "./sample.js";
import type { ExtState } from "./store.js";
import type { Activity, Alert, PaymentPermission, Permission, Site } from "./types.js";

/**
 * What the screens work out from the state: times against the sample's
 * present, the one banner the popup shows, how close a cap is, the order of
 * exposure and the label of the rules. Pure, tested in data.test.ts.
 */

/** The present the screens read times against: the sample's own, until the wallet is live. */
export function now(): string {
  return SAMPLE_NOW;
}

const MINUTE = 60_000;

/** "just now", "4 min ago", "2 h ago", "3 d ago". */
export function ago(iso: string, at: string = now()): string {
  const minutes = Math.max(0, Math.floor((Date.parse(at) - Date.parse(iso)) / MINUTE));
  const { time } = common;
  if (minutes < 1) return time.justNow;
  if (minutes < 60) return `${minutes} ${time.minutesAgo}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${time.hoursAgo}`;
  return `${Math.floor(hours / 24)} ${time.daysAgo}`;
}

export type DayGroup = keyof typeof popupActivity.groups;

/** Today, Yesterday or Earlier, by calendar day in UTC (the sample's dates are UTC). */
export function dayGroup(iso: string, at: string = now()): DayGroup {
  const day = (value: string) => Math.floor(Date.parse(value) / 86_400_000);
  const diff = day(at) - day(iso);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return "earlier";
}

/** Rows split into Today, Yesterday and Earlier, in order, empty groups left out. */
export function byDay(items: readonly Activity[], at: string = now()) {
  const order: DayGroup[] = ["today", "yesterday", "earlier"];
  return order
    .map((group) => ({ group, items: items.filter((item) => dayGroup(item.at, at) === group) }))
    .filter((entry) => entry.items.length > 0);
}

function number(text: string | null | undefined): number {
  const value = Number.parseFloat(text ?? "");
  return Number.isFinite(value) ? value : 0;
}

/** How full a cap is, 0 to 1. A missing cap is never full. */
export function fill(spent: string, cap: string | null): number {
  if (cap === null) return 0;
  const max = number(cap);
  return max <= 0 ? 0 : Math.min(number(spent) / max, 1);
}

/** Amber well before the cap: the same threshold the Meter turns at. */
export const NEAR = 0.8;

export function nearCap(p: PaymentPermission): boolean {
  return (
    p.status === "active" &&
    Math.max(fill(p.spent.hour, p.caps.hour), fill(p.spent.day, p.caps.day)) >= NEAR
  );
}

export function capReached(p: PaymentPermission): boolean {
  return Math.max(fill(p.spent.hour, p.caps.hour), fill(p.spent.day, p.caps.day)) >= 1;
}

export function payments(permissions: readonly Permission[]): PaymentPermission[] {
  return permissions.filter((p): p is PaymentPermission => p.kind === "payment");
}

/** What a payment cap can still take today, in its asset. */
export function leftToday(p: PaymentPermission): string {
  return Math.max(number(p.caps.day) - number(p.spent.day), 0).toFixed(2);
}

/**
 * Largest exposure first: an allowance with no limit (the whole balance),
 * then collection access (every item), then the rest by what each can take
 * right now.
 */
export function exposureOf(p: Permission): number {
  if (p.kind === "allowance")
    return p.amount === null ? Number.POSITIVE_INFINITY : number(p.amount);
  if (p.kind === "operator") return Number.MAX_VALUE;
  return number(leftToday(p));
}

export function byExposure(list: readonly Permission[]): Permission[] {
  return [...list].sort((a, b) => exposureOf(b) - exposureOf(a));
}

export function unread(alerts: readonly Alert[]): number {
  return alerts.filter((a) => !a.read).length;
}

export type BannerKind = keyof typeof popupHome.banners;

export interface Banner {
  readonly kind: BannerKind;
  readonly values: Readonly<Record<string, string>>;
}

/**
 * The one banner the popup shows, in the content's order of priority: funds
 * that moved without you, Baret unreachable, a revoked site, an unsettled
 * payment, a cap nearly used, then the backup and the fee money.
 */
export function bannerOf(state: ExtState): Banner | null {
  const alert = (kind: Alert["kind"]) => state.alerts.find((a) => a.kind === kind && !a.read);
  const drift = alert("drift");
  if (drift) return { kind: "drift", values: drift.values };
  if (!state.reachable) return { kind: "unreachable", values: {} };
  const revoked = alert("revoked");
  if (revoked) return { kind: "revoked", values: revoked.values };
  const unsettled = alert("unsettled");
  if (unsettled) return { kind: "unsettled", values: unsettled.values };
  const near = payments(state.permissions).find(
    (p) => p.status === "active" && fill(p.spent.hour, p.caps.hour) >= NEAR,
  );
  if (near) {
    return {
      kind: "capNear",
      values: {
        origin: near.origin,
        actual: `${near.spent.hour} ${near.asset}`,
        cap: `${near.caps.hour ?? ""} ${near.asset}`,
      },
    };
  }
  if (!state.settings.backedUp) return { kind: "backup", values: {} };
  const mon = state.assets.find((a) => a.symbol === "MON");
  if (!mon || (toUnits(mon.balance, mon.decimals) ?? 0n) === 0n)
    return { kind: "noFunds", values: {} };
  return null;
}

/** "Balanced", or Custom once the rules differ from the template they started from. */
export function rulesTemplate(state: ExtState): "strict" | "balanced" | "permissive" | "custom" {
  return changedFields(state.policy, state.template).length === 0 ? state.template : "custom";
}

/** Whether a site holds anything that can spend from the wallet. */
export function canSpend(site: Site, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => p.origin === site.origin);
}

/** A balance as the screens print it: grouped, 2 to 4 decimals. */
export function money(value: string, decimals = 18): string {
  return grouped(value, decimals);
}

export type PopupFilter = (typeof popupActivity.filters)[number]["id"];

/** Whether a row belongs under one of the popup's filter chips. */
export function matchesPopupFilter(item: Activity, filter: PopupFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "sent":
      return item.kind === "sent";
    case "received":
      return item.kind === "received";
    case "sites":
      return item.origin !== null && item.kind !== "payment" && item.kind !== "alert";
    case "payments":
      return item.kind === "payment";
    case "alerts":
      return item.kind === "alert";
  }
}
