import { agents, policy as policyCopy } from "@baret/content";
import type { CheckResult } from "@baret/web-ui/lib/check-types";
import { fill } from "@baret/web-ui/lib/util";
import { type PolicyName, verdictFor } from "./sample.js";

/**
 * What the playground's terminal prints, and which result it shows. Pure, so
 * the tests read the same lines the page prints.
 */

const { terminal } = agents.playground;

export type Outcome = "safe" | "caution" | "blocked" | "unreachable";

/** A failed check (no answer, a bad answer, a timeout, nothing sent) is its own outcome: Blocked. */
export function outcomeOf(result: CheckResult): Outcome {
  return result.source === "failed" ? "unreachable" : result.verdict;
}

/** The label of the rule that blocked, from the policy copy; empty when none did. */
export function ruleLabel(result: CheckResult, name: PolicyName): string {
  const rule = verdictFor(result.findings, name).rule;
  if (!rule) return "";
  const fields = policyCopy.fields as Record<string, { label: string } | undefined>;
  return fields[rule]?.label ?? "";
}

/** The terminal: the agent asks, then (once answered) Baret's verdict and what the agent does. */
export function terminalLines(result: CheckResult | null, name: PolicyName): readonly string[] {
  if (!result) return [terminal.asking];
  const outcome = outcomeOf(result);
  const lines =
    outcome === "caution"
      ? terminal.caution.map((l) => fill(l, { count: String(result.findings.length) }))
      : outcome === "blocked"
        ? terminal.blocked.map((l) => fill(l, { rule: ruleLabel(result, name) }))
        : terminal[outcome];
  return [terminal.asking, ...lines];
}
