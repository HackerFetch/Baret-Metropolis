import type { PolicyName } from "./playground/sample.js";

/**
 * The quickstart's code samples follow the policy picked in the playground:
 * the SDK's `policyTemplate: "balanced"` and the CLI's
 * `BARET_POLICY_TEMPLATE=balanced` take the picked template's id.
 */
export function withPolicy(lines: readonly string[], policy: PolicyName): string {
  return lines
    .map((line) =>
      line
        .replace(/policyTemplate: "balanced"/, `policyTemplate: "${policy}"`)
        .replace(/BARET_POLICY_TEMPLATE=balanced\b/, `BARET_POLICY_TEMPLATE=${policy}`),
    )
    .join("\n");
}
