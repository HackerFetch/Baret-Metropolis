import { agents, policy as policyCopy } from "@baret/content";
import type { CheckResult } from "@baret/web-ui/lib/check-types";
import { counted, fill } from "@baret/web-ui/lib/util";
import { type PolicyName, verdictFor } from "./sample.js";
import { isNotSent } from "./source.js";

/**
 * What the playground's terminal prints, and which result it shows. Pure, so
 * the tests read the same lines the page prints.
 */

const { terminal } = agents.playground;

export type Outcome = "safe" | "caution" | "blocked" | "unreachable" | "notSent";

/**
 * A failed check (no answer, a bad answer, a timeout) is its own outcome:
 * Blocked. So is a pasted transaction this build did not send, which says so
 * instead of blaming the network.
 */
export function outcomeOf(result: CheckResult): Outcome {
  if (isNotSent(result)) return "notSent";
  return result.source === "failed" ? "unreachable" : result.verdict;
}

/**
 * The reason a sample was blocked: the rule's name as a reason where the
 * policy toggle's label would read the other way, else the toggle's label. A
 * live answer is not re-judged here (the server's rule could differ from the
 * local weights), so it, like a block no rule explains, gets the fallback.
 */
export function ruleLabel(result: CheckResult, name: PolicyName): string {
  const rule = result.source === "sample" ? verdictFor(result.findings, name).rule : null;
  if (!rule) return terminal.ruleFallback;
  const names = terminal.ruleNames as Record<string, string | undefined>;
  const fields = policyCopy.fields as Record<string, { label: string } | undefined>;
  return names[rule] ?? fields[rule]?.label ?? terminal.ruleFallback;
}

/** The terminal: the agent asks, then (once answered) Baret's verdict and what the agent does. */
export function terminalLines(result: CheckResult | null, name: PolicyName): readonly string[] {
  if (!result) return [terminal.asking];
  const outcome = outcomeOf(result);
  const lines =
    outcome === "caution"
      ? terminal.caution.map((l, i) =>
          i === 0
            ? counted(result.findings.length, l, terminal.cautionOne)
            : fill(l, { count: String(result.findings.length) }),
        )
      : outcome === "blocked"
        ? terminal.blocked.map((l) => fill(l, { rule: ruleLabel(result, name) }))
        : terminal[outcome];
  return [terminal.asking, ...lines];
}
