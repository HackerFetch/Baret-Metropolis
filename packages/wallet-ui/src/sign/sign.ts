import { policy, sign } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import type { CheckFinding } from "@baret/web-ui/lib/check-types";
import { counted, fill } from "@baret/web-ui/lib/util";
// By file, not through the @baret/guard barrel, as in data/rules.ts.
import { FINDING_SPECS } from "../../../guard/src/findings.js";
import { amount } from "../data/format.js";
import type { ActivityItem, GuardPolicyField, SignRequest } from "../data/types.js";
import { fillParts, type Part } from "../lib/parts.js";

/**
 * The words of a sign request, from its data and content sign.*: the verb
 * line, what happens if you sign, the rules it breaks, the one suggested fix,
 * and the activity row each outcome leaves. Pure, tested in sign.test.ts.
 */

/** Values as a sentence prints them: amounts grouped, addresses kept whole. */
function values(request: SignRequest): Record<string, string> {
  const out: Record<string, string> = {
    ...(request.origin ? { origin: request.origin } : {}),
    ...request.values,
  };
  if (out.amount) out.amount = amount(out.amount);
  return out;
}

/** The values a headline keeps in their own case: addresses and the site. */
export const KEEP_CASE: ReadonlySet<string> = new Set([
  "recipient",
  "spender",
  "operator",
  "contract",
  "merchant",
  "origin",
  "agent",
  "address",
]);

function shortValues(request: SignRequest): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values(request)).map(([key, value]) => [
      key,
      value.startsWith("0x") && value.length === 42 ? truncateAddress(value) : value,
    ]),
  );
}

/** "Send 0.50 MON to 0x5b0e...e2f4": addresses shortened in the headline only. */
export function actionText(request: SignRequest): string {
  return fill(sign.actions[request.action], shortValues(request));
}

/** The same headline, split so the addresses keep their case. */
export function actionParts(request: SignRequest): Part[] {
  return fillParts(sign.actions[request.action], shortValues(request), KEEP_CASE);
}

export function impactText(request: SignRequest): string {
  return fill(sign.impact[request.impact], values(request));
}

type RuleHit = SignRequest["rules"][number];

/**
 * The fired rules a sentence may name. A fail-closed finding (a signature
 * Baret cannot read, a delegation it cannot simulate, a source that did not
 * answer) blocks under every rule set and still carries a field, even when
 * the reader switched that field off. A hit that only such findings explain
 * is left unnamed, so no line says an off toggle stopped the request.
 */
export function namedRules(request: SignRequest): RuleHit[] {
  const explained = new Set<string>();
  const failClosed = new Set<string>();
  for (const finding of request.findings) {
    const spec = FINDING_SPECS[finding.code as keyof typeof FINDING_SPECS];
    if (!spec) continue;
    for (const field of spec.rule.fields) {
      (spec.rule.kind === "failClosed" ? failClosed : explained).add(field);
    }
  }
  return request.rules.filter((hit) => explained.has(hit.rule) || !failClosed.has(hit.rule));
}

/**
 * The blocked verdict's summary: the first rule that fired, and how many more.
 * A block with no fired rule (a failed check counts as Blocked), or one only a
 * fail-closed finding explains, names none.
 */
export function blockedSummary(request: SignRequest): string {
  const [first, ...rest] = namedRules(request);
  const { blocked } = sign.verdict;
  if (!first) return blocked.summaryNoRule;
  const rule = policy.fields[first.rule].label;
  return rest.length === 0
    ? fill(blocked.summary, { rule })
    : counted(rest.length, blocked.summaryMany, blocked.summaryManyOne, { rule });
}

/** The override's warning: the rule it goes past, or none when no nameable rule fired. */
export function overrideBody(request: SignRequest): string {
  const { blocked } = sign.override;
  const first = namedRules(request)[0];
  return first ? fill(blocked.body, { rule: policy.fields[first.rule].label }) : blocked.bodyNoRule;
}

/** The rules that set a floor (keep at least this much): their row says so, not "allows". */
const FLOOR_RULES: ReadonlySet<string> = new Set(["minPostNativeBalance", "minPostStableBalance"]);

/**
 * A limit or an observed value with the rule's unit, when the rule's unit is
 * a symbol (MON, USDC). A worded unit ("percent of balance") is left off: the
 * server already formats those values.
 */
function withUnit(value: string, rule: GuardPolicyField): string {
  const field = policy.fields[rule] as { unit?: string };
  return field.unit && !field.unit.includes(" ") ? `${value} ${field.unit}` : value;
}

/** One row per nameable rule that fired: its label, and the request against the limit when known. */
export function ruleRows(request: SignRequest): { label: string; detail: string | null }[] {
  return namedRules(request).map((hit) => ({
    label: policy.fields[hit.rule].label,
    detail:
      hit.actual !== undefined && hit.limit !== undefined
        ? fill(FLOOR_RULES.has(hit.rule) ? sign.rules.floorRow : sign.rules.row, {
            actual: withUnit(hit.actual, hit.rule),
            limit: withUnit(hit.limit, hit.rule),
          })
        : null,
  }));
}

/** A finding's fix line, when the finding carries the values the line needs. */
function fixLine(finding: CheckFinding): string | null {
  const { fix } = sign.verdict.blocked;
  const { values: v } = finding;
  switch (finding.code) {
    case "ERC20_APPROVAL_UNLIMITED":
      return v.amount
        ? fill(fix.boundedAllowance, { amount: v.amount, asset: v.asset ?? "" })
        : null;
    case "NFT_OPERATOR_GRANTED":
      return fix.singleItem;
    case "POST_BALANCE_TOO_LOW":
      return v.limit
        ? fill(fix.keepFloor, { limit: [v.limit, v.asset].filter(Boolean).join(" ") })
        : null;
    default:
      return null;
  }
}

/**
 * The one suggested fix for a blocked request: the server's first suggestion
 * when it has one this screen can word, then the findings, then the fallback.
 */
export function fixFor(request: SignRequest): string {
  const first = request.suggestions?.[0];
  const suggested = first ? fixLine(first) : null;
  if (suggested) return suggested;
  const unlimited = request.findings.find((f) => f.code === "ERC20_APPROVAL_UNLIMITED");
  const fromUnlimited = unlimited ? fixLine(unlimited) : null;
  if (fromUnlimited) return fromUnlimited;
  if (request.findings.some((f) => f.code === "NFT_OPERATOR_GRANTED")) {
    return sign.verdict.blocked.fix.singleItem;
  }
  return sign.verdict.blocked.fix.fallback;
}

/** "signed": a typed message was signed for the site; nothing was sent, so there is no block or fee. */
export type Outcome = "sent" | "signed" | "overridden" | "declined" | "expired";

/** The activity row an outcome leaves. A declined request is never logged as Blocked. */
export function logFor(
  request: SignRequest,
  outcome: Outcome,
  at: string,
  block: string,
): ActivityItem {
  const base = {
    id: `${request.id}-${outcome}-${at}`,
    at,
    verdict: request.verdict,
    findings: request.findings,
    changes: request.changes,
  };
  // A fee that was not estimated leaves no fee on the row.
  const fee = request.fee === null ? {} : { fee: request.fee };
  if (outcome === "overridden") {
    const rule = request.rules[0]?.rule;
    return request.verdict === "unreachable" || !rule
      ? { ...base, kind: "unchecked", values: {}, ...fee, block }
      : { ...base, kind: "overridden", values: {}, rule, ...fee, block };
  }
  if (outcome === "signed") {
    return { ...base, kind: "signed", values: { origin: request.origin ?? "" } };
  }
  if (outcome === "sent") {
    return request.action === "transfer"
      ? {
          ...base,
          kind: "sent",
          values: {
            amount: request.values.amount ?? "",
            asset: request.values.asset ?? "",
            recipient: request.values.recipient ?? "",
          },
          ...fee,
          block,
        }
      : {
          ...base,
          kind: "signed",
          values: { origin: request.origin ?? "" },
          ...fee,
          block,
        };
  }
  if (outcome === "expired")
    return { ...base, kind: "expired", values: { origin: request.origin ?? "" } };
  // Decline: Blocked when a rule stopped it, Declined when it was the reader's call.
  const rule = request.rules[0]?.rule;
  return request.verdict === "blocked"
    ? {
        ...base,
        kind: "blocked",
        values: { origin: request.origin ?? "" },
        ...(rule ? { rule } : {}),
      }
    : { ...base, kind: "declined", values: { origin: request.origin ?? "" } };
}
