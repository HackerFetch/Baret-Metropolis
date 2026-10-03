import type { PolicyName } from "./playground/sample.js";

/**
 * The quickstart's code samples follow the policy picked in the playground:
 * the SDK's `policy: "balanced"` and the CLI's `--policy balanced` take the
 * picked template's id. Nothing else in a sample changes (the CLI's comment
 * that lists the three templates stays as written).
 */
export function withPolicy(lines: readonly string[], policy: PolicyName): string {
  return lines
    .map((line) =>
      line
        .replace(/policy: "balanced"/, `policy: "${policy}"`)
        .replace(/--policy balanced\b/, `--policy ${policy}`),
    )
    .join("\n");
}
