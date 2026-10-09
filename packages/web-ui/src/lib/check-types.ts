import type { FindingCode } from "@baret/content";

/**
 * What the Baret panel shows for one request on a demo dApp.
 *
 * A result comes from one of two sources: a prepared sample from the site's
 * own `sample.ts`, or Baret's `/v1/analyze` answer mapped by `kit/live.ts`.
 * The shape follows AnalyzeResponse in packages/guard/src/analyze.ts
 * (decision, findings with values, balance changes, approvals), already in
 * display units, so the panel never knows which source it is reading.
 */

export type DemoMode = "safe" | "danger";

export type Verdict = "safe" | "caution" | "blocked";

/**
 * sample: prepared on the page. live: Baret's server answered. failed: the
 * check did not finish (network error, bad answer, timeout); the verdict is
 * then Blocked, because with no answer nothing should be signed.
 */
export type ResultSource = "sample" | "live" | "failed";

/** A finding the client renders from shared/findings: the code plus its values. */
export interface CheckFinding {
  readonly code: FindingCode;
  readonly values: Readonly<Record<string, string>>;
  /**
   * Extra facts a finding's wording can branch on (server `analyze.ts`
   * `findingSchema.details`) — today only `asset`: set when an asset's own
   * policy demands something, not the caller's rules (compliance.ts).
   */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** One "What changes" row, already in display units. */
export interface CheckChange {
  readonly direction: "in" | "out";
  readonly value: string;
  readonly unit: string;
  /** Optional note under the row, from the site's own copy. */
  readonly note?: string;
}

/** An allowance the request grants: who may spend which token, and how much. */
export interface CheckApproval {
  readonly unit: string;
  readonly spender: string;
  readonly unlimited: boolean;
  /** Display units; null when unlimited or unknown. */
  readonly amount: string | null;
}

export interface CheckResult {
  readonly source: ResultSource;
  readonly verdict: Verdict;
  readonly findings: readonly CheckFinding[];
  readonly changes: readonly CheckChange[];
  readonly approvals: readonly CheckApproval[];
  /** Live answers only: Baret's meta.requestId, which /v1/explain takes. */
  readonly requestId?: string;
}

/**
 * The seam between a site and Baret. A site passes one function: today it
 * resolves the prepared sample, with a wallet connected it calls Baret.
 * It may reject or hang; `runCheck` turns both into a failed result.
 */
export type CheckSource<I> = (input: I, signal: AbortSignal) => Promise<CheckResult>;
