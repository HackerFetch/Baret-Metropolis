import type { AnalyzeResponse } from "@baret/guard";

/** Baret did not clear the transaction. Nothing was signed. */
export class GuardBlockedError extends Error {
  constructor(public readonly verdict: AnalyzeResponse) {
    const codes = verdict.findings.map((f) => f.code).join(", ") || "no findings";
    super(`Baret answered ${verdict.decision}: ${codes}`);
    this.name = "GuardBlockedError";
  }
}
