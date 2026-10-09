import { findings as findingCopy, sign } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import { bodyOf, hasValues } from "@baret/web-ui/components/CheckBlocks";
import type { CheckFinding } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId } from "react";
// By file: findings.ts imports types only, so zod stays out of this chunk.
import { FINDING_SPECS } from "../../../guard/src/findings.js";

/**
 * Findings in Baret's own words: the severity, the title, the sentence with
 * the request's values, the fix when every value it needs is there, and why
 * it matters behind a native disclosure (one open at a time, 44 px target). Shared by the sign request and the
 * activity log's details. Addresses are shortened in the title only; the
 * sentence keeps them whole, wrapped.
 */
export function Findings({ items }: { items: readonly CheckFinding[] }): JSX.Element {
  // One shared name makes the "why" disclosures exclusive.
  const group = useId();
  if (items.length === 0) return <p className={T.body}>{sign.findings.none}</p>;
  return (
    <ul className="grid gap-5">
      {items.map((item) => {
        const words = findingCopy[item.code];
        const severity = FINDING_SPECS[item.code].severity;
        const titleValues = Object.fromEntries(
          Object.entries(item.values).map(([key, value]) => [
            key,
            value.startsWith("0x") && value.length === 42 ? truncateAddress(value) : value,
          ]),
        );
        const { template, values } = bodyOf(words, item);
        return (
          <li
            key={item.code}
            className="grid gap-1.5 border-l-4 border-[color:var(--rule-strong)] pl-4"
          >
            <p className={T.label}>{sign.findings.severity[severity]}</p>
            <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]">
              {fill(words.title, titleValues)}
            </p>
            <p className={`${T.body} [overflow-wrap:anywhere]`}>{fill(template, values)}</p>
            {"fix" in words && words.fix && hasValues(words.fix, item.values) ? (
              <p className={`${T.small} [overflow-wrap:anywhere]`}>
                {fill(words.fix, item.values)}
              </p>
            ) : null}
            {"why" in words && words.why ? (
              <details name={group} className="group">
                <summary className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-2 text-sm font-medium text-[color:var(--fg)] [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden="true"
                    className="font-mono text-base text-[color:var(--fg-muted)] transition-transform duration-[160ms] group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                  {sign.findings.why}
                </summary>
                <p className={`${T.small} mt-2 max-w-[60ch] [overflow-wrap:anywhere]`}>
                  {fill(words.why, item.values)}
                </p>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
