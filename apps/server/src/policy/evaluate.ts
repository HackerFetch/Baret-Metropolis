import {
  type Decision,
  FINDING_SPECS,
  type Finding,
  type FiredRule,
  type GuardPolicyField,
} from "@baret/guard";
import { type Address, getAddress } from "viem";
import type { AnalysisContext, FindingDraft } from "../analysis/context.js";
import { formatAmount, formatPercent, toBaseUnits, tokenMeta } from "../analysis/format.js";
import { actualPayment } from "../risk/detectors/x402.js";

/** The user's net change in one asset (MON when token is null), fee included for MON. */
export function netDelta(ctx: AnalysisContext, token: Address | null): bigint | null {
  let delta = 0n;
  for (const t of ctx.effects.transfers) {
    if (t.nft || t.token !== token) continue;
    if (t.from === ctx.user) delta -= t.amount;
    if (t.to === ctx.user) delta += t.amount;
  }
  if (token === null && ctx.tx && ctx.tx.from === ctx.user) {
    if (ctx.feeWei === null) return null;
    delta -= ctx.feeWei;
  }
  return delta;
}

function before(ctx: AnalysisContext, token: Address | null): bigint | null {
  return token === null
    ? ctx.balancesBefore.native
    : (ctx.balancesBefore.tokens.get(token) ?? null);
}

/** Loss rule: the largest share of any one balance the request takes. */
function lossRule(ctx: AnalysisContext): FindingDraft[] {
  const max = ctx.policy.maxLossPercent;
  if (max === null) return [];
  const assets = new Set<Address | null>([null]);
  for (const t of ctx.effects.transfers) if (!t.nft) assets.add(t.token);

  let worst = 0;
  for (const asset of assets) {
    const delta = netDelta(ctx, asset);
    const pre = before(ctx, asset);
    if (delta === null || (delta < 0n && (pre === null || pre === 0n))) {
      return [{ code: "LOSS_PERCENT_UNAVAILABLE", values: {}, rule: "maxLossPercent" }];
    }
    if (delta >= 0n || pre === null) continue;
    // Basis points of a basis point, so tiny balances still compare exactly.
    const pct = Number((-delta * 1_000_000n) / pre) / 10_000;
    worst = Math.max(worst, pct);
  }
  if (worst <= max) return [];
  return [
    {
      code: "ESTIMATED_LOSS_EXCEEDS_MAX",
      values: { actual: formatPercent(worst), limit: formatPercent(max) },
      rule: "maxLossPercent",
    },
  ];
}

function floorRule(
  ctx: AnalysisContext,
  field: "minPostUsdcBalance" | "minPostNativeBalance",
): FindingDraft[] {
  const min = ctx.policy[field];
  if (min === null) return [];
  const token = field === "minPostNativeBalance" ? null : ctx.network.usdcAddress;
  const asset = field === "minPostNativeBalance" ? "MON" : "USDC";
  if (field === "minPostUsdcBalance" && token === null) {
    return [{ code: "POST_BALANCE_UNAVAILABLE", values: { asset }, rule: field }];
  }
  const pre = before(ctx, token);
  const delta = netDelta(ctx, token);
  if (pre === null || delta === null) {
    return [{ code: "POST_BALANCE_UNAVAILABLE", values: { asset }, rule: field }];
  }
  const { decimals } = tokenMeta(ctx, token);
  const after = pre + delta;
  // A request that does not lower this balance cannot break the floor.
  if (delta >= 0n || after >= toBaseUnits(min, decimals)) return [];
  return [
    {
      code: "POST_BALANCE_TOO_LOW",
      values: { actual: formatAmount(after < 0n ? 0n : after, decimals), limit: min, asset },
      rule: field,
    },
  ];
}

const HOUR = 3600;
const DAY = 86_400;

function paymentRules(ctx: AnalysisContext): FindingDraft[] {
  const payment = ctx.payment;
  if (!payment) return [];
  const p = ctx.policy;
  const out: FindingDraft[] = [];

  const origin = new URL(payment.origin).origin;
  if (
    p.allowedMerchantOrigins.length > 0 &&
    !p.allowedMerchantOrigins.some((o) => new URL(o).origin === origin)
  ) {
    out.push({
      code: "X402_MERCHANT_NOT_ALLOWED",
      values: { origin },
      rule: "allowedMerchantOrigins",
    });
  }

  const asset = getAddress(payment.asset);
  const { decimals } = tokenMeta(ctx, asset);
  const requested = BigInt(payment.amount);
  const paid = actualPayment(ctx);
  // Judge the larger of what was asked and what actually leaves.
  const amount = paid && paid.amount > requested ? paid.amount : requested;
  const fmt = (v: bigint) => formatAmount(v, decimals);

  if (p.maxPerTxCap !== null && amount > toBaseUnits(p.maxPerTxCap, decimals)) {
    out.push({
      code: "X402_PER_TX_CAP_EXCEEDED",
      values: { origin, actual: fmt(amount), cap: p.maxPerTxCap },
      rule: "maxPerTxCap",
    });
  }

  const windows = [
    { field: "maxHourlyCap", seconds: HOUR, code: "X402_HOURLY_CAP_EXCEEDED" },
    { field: "maxDailyCap", seconds: DAY, code: "X402_DAILY_CAP_EXCEEDED" },
  ] as const;
  const capsSet = windows.filter((w) => p[w.field] !== null);
  if (capsSet.length > 0 && !payment.spendHistory) {
    out.push({
      code: "X402_SPEND_HISTORY_UNAVAILABLE",
      values: {},
      rule: capsSet[0]?.field ?? "maxDailyCap",
    });
    return out;
  }
  for (const w of capsSet) {
    const cap = p[w.field] as string;
    const spent = (payment.spendHistory ?? [])
      .filter((s) => s.timestamp > ctx.now - w.seconds && s.timestamp <= ctx.now)
      .reduce((sum, s) => sum + BigInt(s.amount), 0n);
    const total = spent + amount;
    if (total > toBaseUnits(cap, decimals)) {
      out.push({
        code: w.code,
        values: { amount: fmt(amount), actual: fmt(total), cap },
        rule: w.field,
      });
    }
  }
  return out;
}

/** Codes only the engine can produce: they need the user's limits or spend history. */
export function policyFindings(ctx: AnalysisContext): FindingDraft[] {
  return [
    ...lossRule(ctx),
    ...floorRule(ctx, "minPostUsdcBalance"),
    ...floorRule(ctx, "minPostNativeBalance"),
    ...paymentRules(ctx),
  ];
}

export interface Verdict {
  decision: Decision;
  findings: Finding[];
  firedRules: FiredRule[];
}

/**
 * Applies the policy to the findings.
 *
 *   toggle      blocks when its field is on; otherwise it is a warning.
 *   threshold   blocks (its emitter only fires when the rule is set and broken).
 *   failClosed  always blocks.
 *   warning     blocks only when allowWarnings is off.
 *
 * Any blocking finding makes the request Blocked. Findings that do not block
 * make it Caution. No findings: Safe.
 */
export function decide(ctx: AnalysisContext, drafts: FindingDraft[]): Verdict {
  const findings: Finding[] = [];
  const firedRules: FiredRule[] = [];
  const seen = new Set<string>();

  for (const d of drafts) {
    const key = `${d.code}|${JSON.stringify(d.values)}|${String(d.details?.side ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const spec = FINDING_SPECS[d.code];
    let rule: GuardPolicyField | null = null;
    switch (spec.rule.kind) {
      case "toggle": {
        const field = spec.rule.fields[0];
        if (ctx.policy[field] === true) rule = field;
        break;
      }
      case "threshold":
      case "failClosed":
        rule = d.rule ?? spec.rule.fields[0] ?? null;
        break;
      case "warning":
        break;
    }
    if (rule === null && !ctx.policy.allowWarnings) rule = "allowWarnings";

    findings.push({
      code: d.code,
      severity: spec.severity,
      values: d.values,
      blocking: rule !== null,
      ...(d.details ? { details: d.details } : {}),
    });
    if (rule !== null) {
      firedRules.push({
        rule,
        code: d.code,
        limit: d.values.limit ?? d.values.cap ?? null,
        actual: d.values.actual ?? null,
      });
    }
  }

  const decision: Decision =
    firedRules.length > 0 ? "blocked" : findings.length > 0 ? "caution" : "safe";
  return { decision, findings, firedRules };
}
