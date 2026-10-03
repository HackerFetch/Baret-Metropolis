import { history, policy } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import { fill } from "@baret/web-ui/lib/util";
import { amount } from "./format.js";
import type { ActivityItem } from "./types.js";

/**
 * The activity log's words, filters and CSV export. Pure, tested in
 * data.test.ts. Addresses are shortened in a row's sentence; the details
 * show them whole.
 */

const ADDRESS_KEYS = new Set(["recipient", "spender", "operator", "contract"]);

/** The row's values as the sentence prints them. */
export function rowValues(item: ActivityItem): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(item.values)) {
    if (ADDRESS_KEYS.has(key) && value.startsWith("0x")) values[key] = truncateAddress(value);
    else if (key === "amount") values[key] = amount(value);
    else values[key] = value;
  }
  if (item.rule) values.rule = policy.fields[item.rule].label;
  return values;
}

/** The sentence for a row, from content history.rows. */
export function rowText(item: ActivityItem): string {
  return fill(history.rows[item.kind], rowValues(item));
}

export type FilterId = (typeof history.filters)[number]["id"];

const SITE_KINDS = new Set<ActivityItem["kind"]>([
  "signed",
  "allowance",
  "revoke",
  "blocked",
  "declined",
  "expired",
  "connect",
  "disconnect",
]);

/** Whether a row belongs under a filter. Pure, exported for tests. */
export function matches(item: ActivityItem, filter: FilterId): boolean {
  switch (filter) {
    case "all":
      return true;
    case "sent":
      return item.kind === "sent";
    case "received":
      return item.kind === "received";
    case "sites":
      return SITE_KINDS.has(item.kind);
    case "agent":
      return item.kind === "payment";
    case "blocked":
      return item.kind === "blocked";
    case "declined":
      return item.kind === "declined" || item.kind === "expired";
    case "overrides":
      return item.kind === "overridden" || item.kind === "unchecked";
  }
}

/** The log as CSV: time, what happened, the verdict at the time, the transaction. */
export function toCsv(items: readonly ActivityItem[]): string {
  const cell = (text: string) => `"${text.replaceAll('"', '""')}"`;
  const lines = items.map((item) =>
    [item.at, rowText(item), item.verdict ?? "", item.hash ?? ""].map(cell).join(","),
  );
  return ["time,activity,verdict,transaction", ...lines].join("\n");
}
