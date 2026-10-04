import { optionsAllowances } from "@baret/content/extension/options/allowances.content";
import { optionsHome } from "@baret/content/extension/options/home.content";
import { popupActivity } from "@baret/content/extension/popup/activity.content";
import { alerts } from "@baret/content/extension/popup/alerts.content";
import { policy } from "@baret/content/shared/policy.content";
import { truncateAddress } from "@baret/ui";
import { amount, when } from "@baret/wallet-ui/data/format";
import { fillParts, type Part } from "@baret/wallet-ui/lib/parts";
import { fill } from "@baret/web-ui/lib/util";
import { ago, dayGroup, leftToday, now } from "./derive.js";
import type { Activity, Alert, Asset, GuardPolicyField, Permission } from "./types.js";

/**
 * The sentences the screens print from the data, all from content: a log
 * row, its time, an alert, a permission. Addresses are shortened in a
 * sentence and shown whole in a detail. Pure, tested in data.test.ts.
 */

export function short(value: string): string {
  return value.startsWith("0x") && value.length === 42 ? truncateAddress(value) : value;
}

/** Every address in a set of values, shortened; amounts grouped. */
function shown(values: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = key === "amount" && /^\d/.test(value) ? amount(value) : short(value);
  }
  return out;
}

/** "Sent 2.50 MON", "Paid 0.50 USDC", "Signed a message". */
export function activityText(item: Activity): string {
  return fill(popupActivity.rows[item.kind], shown(item.values));
}

/** The bold half of a row: the site that asked, or the other address. */
export function partyOf(item: Activity): string {
  if (item.origin) return item.origin;
  if (item.counterparty) return short(item.counterparty);
  return "";
}

/** The status, said only when it is not the plain outcome. */
export function statusOf(item: Activity): string | null {
  return item.status === "confirmed" ? null : popupActivity.status[item.status];
}

/** "4 min ago" today, "2 Oct, 18:31" before. */
export function timeOf(iso: string, at: string = now()): string {
  return dayGroup(iso, at) === "today" ? ago(iso, at) : when(iso);
}

export function ruleLabel(field: GuardPolicyField): string {
  return policy.fields[field].label;
}

export function alertTitle(alert: Alert): string {
  return fill(alerts.types[alert.kind].title, shown(alert.values));
}

/** The values a display headline keeps in their own case: sites and addresses. */
export const KEEP_CASE: ReadonlySet<string> = new Set([
  "origin",
  "merchant",
  "spender",
  "operator",
]);

/** A headline split so a site or an address keeps its case in the uppercase display face. */
export function headline(template: string, values: Readonly<Record<string, string>>): Part[] {
  return fillParts(template, shown(values), KEEP_CASE);
}

export function alertBody(alert: Alert): string {
  return fill(alerts.types[alert.kind].body, shown(alert.values));
}

/** The options page's one sentence for a permission (content optionsAllowances.kinds). */
export function permissionLine(p: Permission): string {
  const { kinds } = optionsAllowances;
  if (p.kind === "allowance") {
    return p.amount === null
      ? fill(kinds.allowance.unlimited, { spender: short(p.spender), asset: p.asset })
      : fill(kinds.allowance.capped, {
          spender: short(p.spender),
          amount: amount(p.amount, 6),
          asset: p.asset,
        });
  }
  if (p.kind === "operator") {
    return fill(kinds.operator.line, { operator: short(p.operator), contract: p.contract });
  }
  return fill(kinds.payment.line, { merchant: p.merchant });
}

/** Who holds it, in a sentence's own words: the spender, the operator or the merchant. */
export function holderOf(p: Permission): string {
  if (p.kind === "allowance") return short(p.spender);
  if (p.kind === "operator") return short(p.operator);
  return p.merchant;
}

/**
 * What a permission can take right now, in a few words: the exposure column.
 * An allowance with no limit counts as the whole balance of its token, when
 * the wallet holds any; otherwise it reads "No limit".
 */
export function exposureText(p: Permission, assets: readonly Asset[] = []): string {
  if (p.kind === "allowance") {
    if (p.amount !== null) return `${amount(p.amount, 6)} ${p.asset}`;
    const held = assets.find((a) => a.symbol === p.asset);
    return held
      ? `${amount(held.balance, held.decimals)} ${p.asset}`
      : optionsHome.permissions.unlimited;
  }
  if (p.kind === "operator") return p.contract;
  return `${leftToday(p)} ${p.asset}`;
}

/** The singular twin of a counted line when the count is 1. */
export { counted } from "@baret/web-ui/lib/util";
