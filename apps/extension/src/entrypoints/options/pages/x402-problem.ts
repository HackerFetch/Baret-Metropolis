import { policy, x402 } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import { fill } from "@baret/web-ui/lib/util";
import type { Problem } from "../../../data/types.js";

const { problems } = x402;

type RuleField = keyof typeof policy.fields;

function midSentence(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function isRuleField(key: string): key is RuleField {
  return Object.hasOwn(policy.fields, key);
}

/** Every `{name}` a template asks for. */
function namesIn(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "");
}

/**
 * A problem's sentence: the rule by its name, addresses shortened, the
 * amount with its token. A live block carries only the amount, the token and
 * the site, so when the line needs a rule, a cap or the two payees that were
 * not read, it falls back to one that names none: no `{placeholder}` reaches
 * the screen.
 */
export function problemBody(problem: Problem): string {
  const { rule, expected, actual, amount, asset } = problem.values;
  const values: Record<string, string> = {
    ...problem.values,
    merchant: problem.merchant,
    // Live passes the token apart from the amount; the sample joins them.
    ...(amount && asset ? { amount: `${amount} ${asset}` } : {}),
    // The rule sits mid-sentence ("goes over cap per payment"), so its label starts in lower case.
    ...(rule ? { rule: midSentence(isRuleField(rule) ? policy.fields[rule].label : rule) } : {}),
    ...(expected ? { expected: truncateAddress(expected) } : {}),
    ...(actual ? { actual: truncateAddress(actual) } : {}),
  };
  const template = problems.types[problem.kind].body;
  const complete = namesIn(template).every((name) => Boolean(values[name]));
  return fill(complete ? template : problems.types.declined.bodyNoRule, values);
}
