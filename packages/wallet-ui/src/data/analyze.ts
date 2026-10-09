import { policy } from "@baret/content";
import type { CheckApproval, CheckChange, CheckFinding } from "@baret/web-ui/lib/check-types";
import type { AnalyzeResponse } from "../../../guard/src/analyze.js";
import { FINDING_CODES } from "../../../guard/src/findings.js";
import { fromUnits } from "./format.js";
import type { GuardPolicyField, SignRequest, SignSource } from "./types.js";

/**
 * The seam between Baret's /v1/analyze answer and the sign request screen.
 *
 * The wallet (or the extension's background) knows what the site asked for:
 * who asks, the action and its words, the raw call, the fee and how long the
 * request may wait. That is the context. The server's AnalyzeResponse adds
 * the verdict, findings, fired rules, balance changes, approvals, sources,
 * confidence, suggestions and expiresAt. `fromAnalyze` joins the two.
 *
 * Fail-closed: an answer that does not map (an unknown decision, finding code,
 * rule or source, a bad amount or date, a Safe answer with a blocking
 * finding) becomes the Can't reach Baret request, never a softer verdict.
 * A transport failure (no answer at all) goes through `unreachable` too.
 */

/** What the surface knows about the request before Baret answers. */
export type SignContext = Omit<
  SignRequest,
  | "verdict"
  | "findings"
  | "changes"
  | "approvals"
  | "rules"
  | "confidence"
  | "sources"
  | "suggestions"
> & {
  /** The account whose balance changes and allowances the screen shows. */
  readonly wallet: string;
};

const CODES: ReadonlySet<string> = new Set(FINDING_CODES);
const DECISIONS: ReadonlySet<string> = new Set(["safe", "caution", "blocked"]);
const SOURCES: ReadonlySet<string> = new Set([
  "alchemy",
  "nansen",
  "reputation-registry",
  "cleanverse",
]);
const STATUSES: ReadonlySet<string> = new Set(["ok", "unavailable", "skipped"]);
const CONFIDENCE: ReadonlySet<string> = new Set(["high", "medium", "low"]);

/** Thrown inside the mapper; the caller turns it into the unreachable request. */
class Unmapped extends Error {}

function check(ok: boolean, what: string): void {
  if (!ok) throw new Unmapped(what);
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A contract address cut to its head and tail, the unit of a token with no symbol. */
function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

/** Base units to the screen's amount: up to four decimals, cut, never rounded up. */
function display(raw: bigint, decimals: number): string {
  check(Number.isInteger(decimals) && decimals >= 0, "decimals");
  return fromUnits(raw, decimals, { min: 0, max: 4 });
}

function finding(
  code: string,
  values: Readonly<Record<string, string>>,
  details?: Readonly<Record<string, unknown>>,
): CheckFinding {
  check(CODES.has(code), `finding ${code}`);
  return {
    code: code as CheckFinding["code"],
    values: { ...values },
    ...(details ? { details } : {}),
  };
}

function isRule(rule: string): rule is GuardPolicyField {
  return Object.hasOwn(policy.fields, rule);
}

/** The request with no answer from Baret: Can't reach Baret, nothing to show. */
export function unreachable(context: SignContext): SignRequest {
  const { wallet: _wallet, ...rest } = context;
  return { ...rest, verdict: "unreachable", findings: [], changes: [], approvals: [], rules: [] };
}

function map(response: AnalyzeResponse, context: SignContext, now: number): SignRequest {
  check(DECISIONS.has(response.decision), "decision");
  check(CONFIDENCE.has(response.confidence), "confidence");

  const findings = response.findings.map((f) => finding(f.code, f.values, f.details));
  // A blocking finding under anything but Blocked is an answer that disagrees with itself.
  check(response.decision === "blocked" || response.findings.every((f) => !f.blocking), "blocking");

  const rules = response.firedRules.map((hit) => {
    check(isRule(hit.rule), `rule ${hit.rule}`);
    return {
      rule: hit.rule as GuardPolicyField,
      ...(hit.limit === null ? {} : { limit: hit.limit }),
      ...(hit.actual === null ? {} : { actual: hit.actual }),
    };
  });

  const changes: CheckChange[] = response.estimatedChanges
    .filter((c) => same(c.account, context.wallet))
    .flatMap((c) => {
      const delta = BigInt(c.delta);
      if (delta === 0n) return [];
      // The wallet's own MON going out includes gas, and the fee has its own
      // row: show the call's value instead, and no row when it sends none.
      if (c.asset.kind === "native" && delta < 0n) {
        const sent = BigInt(context.raw.value);
        if (sent <= 0n) return [];
        return [{ direction: "out", value: display(sent, c.asset.decimals), unit: "MON" } as const];
      }
      return [
        {
          direction: delta < 0n ? "out" : "in",
          value: display(delta < 0n ? -delta : delta, c.asset.decimals),
          unit: c.asset.symbol || (c.asset.address ? shortAddress(c.asset.address) : "MON"),
        } as const,
      ];
    });

  const approvals: CheckApproval[] = response.approvals
    .filter((a) => same(a.owner, context.wallet))
    .map((a) => ({
      unit: a.symbol || shortAddress(a.contract),
      spender: a.spender,
      unlimited: a.unlimited,
      amount:
        a.unlimited || a.amount === null || a.decimals === null
          ? null
          : display(BigInt(a.amount), a.decimals),
    }));

  const sources: SignSource[] = response.sources.map((s) => {
    check(SOURCES.has(s.name) && STATUSES.has(s.status), `source ${s.name}`);
    return { name: s.name, status: s.status };
  });

  const until = Date.parse(response.expiresAt);
  check(Number.isFinite(until), "expiresAt");
  // The answer goes stale at expiresAt; the request never waits longer than its own limit.
  const expires = Math.max(0, Math.min(context.expires, Math.floor((until - now) / 1000)));

  const { wallet: _wallet, ...rest } = context;
  return {
    ...rest,
    id: response.meta.requestId || context.id,
    verdict: response.decision,
    findings,
    changes,
    approvals,
    rules,
    expires,
    confidence: response.confidence,
    sources,
    suggestions: response.suggestions.map((s) => finding(s.code, s.values)),
  };
}

/**
 * AnalyzeResponse plus the request's context to what SignRequest reads.
 * Amounts arrive in base units and leave in display units; expiresAt (ISO)
 * becomes seconds from `now`. Anything that does not map is unreachable.
 */
export function fromAnalyze(
  response: AnalyzeResponse,
  context: SignContext,
  now: number = Date.now(),
): SignRequest {
  try {
    return map(response, context, now);
  } catch {
    return unreachable(context);
  }
}
