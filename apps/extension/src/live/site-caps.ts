import { allowances } from "@baret/content/extension/popup/allowances.content";
import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import type { CheckFinding } from "@baret/web-ui/lib/check-types";
import { fill } from "@baret/web-ui/lib/util";
import { siteOf } from "../core/protocol.js";
import type { FiredRule, Payment, PaymentPermission, Permission } from "../data/types.js";

/**
 * A site's own payment caps and its pause, read before a payment is signed.
 *
 * The caps a reader sets for one site (per payment, per hour, per day) and
 * the Pause on its card live in the wallet, not on a server: nothing but this
 * check stands between them and the key. It runs before Baret's own check
 * and, when it stops a payment, nothing is asked of the server and nothing
 * is signed. What the site has already been paid is counted from the
 * payments this wallet signed for it, over the last hour and the last 24.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const DECIMALS = 6;

export interface SiteStop {
  readonly reason: "paused" | "overCap";
  /** What the screen shows under Blocked; none for a pause. */
  readonly finding: CheckFinding | null;
  readonly rule: FiredRule;
  /** What the site is told. */
  readonly message: string;
}

export interface SitePayment {
  /** The site as the log names it (no scheme). */
  readonly origin: string;
  /** As the payments page shows it: whole units and the asset's symbol. */
  readonly amount: string;
  readonly asset: string;
}

const units = (amount: string): bigint => toUnits(amount, DECIMALS) ?? 0n;
const shown = (amount: bigint): string => fromUnits(amount, DECIMALS, { min: 2, max: 6 });

/** The caps card of a site, if the reader made one. */
export function capsOf(
  permissions: readonly Permission[],
  origin: string,
): PaymentPermission | null {
  // A card names its site with or without the scheme; the log never has one.
  const found = permissions.find((p) => p.kind === "payment" && siteOf(p.origin) === origin);
  return found?.kind === "payment" ? found : null;
}

/** What this wallet signed for a site since `since`, in the asset's base units. */
function spentSince(
  payments: readonly Payment[],
  by: { origin: string; asset: string },
  since: number,
): bigint {
  return payments
    .filter((p) => p.facilitator === by.origin && p.asset === by.asset)
    .filter((p) => Date.parse(p.at) >= since)
    .reduce((sum, p) => sum + units(p.amount), 0n);
}

/** Why a site's payment stops here, or null when its own caps let it through. */
export function siteStop(
  payment: SitePayment,
  permissions: readonly Permission[],
  payments: readonly Payment[],
  now: number,
): SiteStop | null {
  const card = capsOf(permissions, payment.origin);
  if (!card) return null;
  const { declines } = allowances;
  if (card.status === "paused") {
    return {
      reason: "paused",
      finding: null,
      rule: { rule: "allowedMerchantOrigins" },
      message: fill(declines.paused, { origin: payment.origin }),
    };
  }
  const message = fill(declines.overCap, { origin: payment.origin });
  // Caps are in the card's asset. A payment in another one is not theirs to
  // measure: Baret's check and the rules on allowed assets decide it.
  if (card.asset !== payment.asset) return null;
  const asked = units(payment.amount);
  const money = (amount: bigint) => `${shown(amount)} ${card.asset}`;

  const perPayment = units(card.caps.perPayment);
  if (asked > perPayment) {
    return {
      reason: "overCap",
      finding: {
        code: "X402_PER_TX_CAP_EXCEEDED",
        values: { origin: payment.origin, actual: money(asked), cap: money(perPayment) },
      },
      rule: { rule: "maxPerTxCap", limit: shown(perPayment), actual: shown(asked) },
      message,
    };
  }
  const by = { origin: payment.origin, asset: card.asset };
  if (card.caps.hour !== null) {
    const cap = units(card.caps.hour);
    const total = spentSince(payments, by, now - HOUR) + asked;
    if (total > cap) {
      return {
        reason: "overCap",
        finding: {
          code: "X402_HOURLY_CAP_EXCEEDED",
          values: { amount: money(asked), actual: money(total), cap: money(cap) },
        },
        rule: { rule: "maxHourlyCap", limit: shown(cap), actual: shown(total) },
        message,
      };
    }
  }
  const cap = units(card.caps.day);
  const total = spentSince(payments, by, now - DAY) + asked;
  if (total > cap) {
    return {
      reason: "overCap",
      finding: {
        code: "X402_DAILY_CAP_EXCEEDED",
        values: { amount: money(asked), actual: money(total), cap: money(cap) },
      },
      rule: { rule: "maxDailyCap", limit: shown(cap), actual: shown(total) },
      message,
    };
  }
  return null;
}

/** A site's caps card after one more signed payment: its meters and its last use. */
export function cardAfter(
  card: PaymentPermission,
  payments: readonly Payment[],
  at: string,
  amount: string,
): PaymentPermission {
  const now = Date.parse(at);
  const by = { origin: siteOf(card.origin), asset: card.asset };
  const today = payments.filter(
    (p) => p.facilitator === by.origin && p.asset === by.asset && Date.parse(p.at) >= now - DAY,
  );
  return {
    ...card,
    lastUsed: at,
    uses: [{ at, amount }, ...card.uses],
    spent: {
      hour: shown(spentSince(payments, by, now - HOUR)),
      day: shown(spentSince(payments, by, now - DAY)),
    },
    paymentsToday: today.length,
  };
}
