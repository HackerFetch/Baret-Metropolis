import type { FindingCode } from "@baret/content";

/**
 * What the Baret panel shows for one request on a demo dApp.
 *
 * Frontend only for now: every result is a prepared sample from the site's
 * own `sample.ts`, labelled as such in the panel. The shape follows
 * AnalyzeResponse in packages/guard/src/analyze.ts (decision, findings with
 * values, estimated changes), so the live adapter can map onto it later
 * without touching the panel.
 */

export type DemoMode = "safe" | "danger";

export type SampleVerdict = "safe" | "caution" | "blocked";

/** A finding the client renders from shared/findings: the code plus its values. */
export interface SampleFinding {
  readonly code: FindingCode;
  readonly values: Readonly<Record<string, string>>;
}

/** One "What changes" row, already in display units. */
export interface SampleChange {
  readonly direction: "in" | "out";
  readonly value: string;
  readonly unit: string;
  /** Optional note under the row, from the site's own copy. */
  readonly note?: string;
}

export interface SampleResult {
  readonly verdict: SampleVerdict;
  readonly findings: readonly SampleFinding[];
  readonly changes: readonly SampleChange[];
  /** The contract the request calls, shown in "What the site asks for". */
  readonly contract: string;
}

/**
 * The seam for the live check. Today every site passes a function that
 * returns its prepared sample; later the same signature can call Baret.
 */
export type CheckSource = (mode: DemoMode) => SampleResult;
