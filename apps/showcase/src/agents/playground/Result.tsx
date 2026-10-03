import { agents, findings as findingCopy, sign } from "@baret/content";
import { ChangeRow } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { hasValues } from "@baret/web-ui/components/CheckBlocks";
import type { CheckResult } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import type { JSX } from "react";
import type { PolicyName } from "./sample.js";
import { type Outcome, outcomeOf, terminalLines } from "./terminal.js";

/**
 * The right-hand side of the playground: a terminal that prints what the
 * agent and Baret say, then the answer itself. A tag (hung on each new
 * verdict), the plain sentence, every finding in Baret's own words, and what
 * would change. Before the first run: the empty state. Long terminal lines
 * wrap instead of scrolling, so a phone reads the whole exchange.
 */

const { result: copy, empty } = agents.playground;

const TONE: Record<Outcome, "safe" | "caution" | "blocked" | "neutral"> = {
  safe: "safe",
  caution: "caution",
  blocked: "blocked",
  unreachable: "neutral",
};

export function Terminal({ lines }: { lines: readonly string[] }): JSX.Element {
  return (
    <pre className="min-h-[7.5rem] whitespace-pre-wrap border border-graphite bg-graphite px-4 py-3 font-mono text-sm leading-relaxed text-chalk/85 [overflow-wrap:anywhere] dark:border-[color:var(--rule-strong)] dark:bg-ink">
      {lines.join("\n")}
    </pre>
  );
}

export function Result({
  state,
  policy,
  runKey,
}: {
  state: { phase: "idle" } | { phase: "checking" } | { phase: "done"; result: CheckResult };
  policy: PolicyName;
  runKey: number;
}): JSX.Element {
  if (state.phase === "idle") {
    return (
      <div className="grid gap-2 border border-dashed border-[color:var(--rule-strong)] p-6">
        <p className={`${T.h3} text-[color:var(--fg)]`}>{empty.title}</p>
        <p className={T.body}>{empty.body}</p>
      </div>
    );
  }
  if (state.phase === "checking") return <Terminal lines={terminalLines(null, policy)} />;

  const { result } = state;
  const outcome = outcomeOf(result);
  return (
    <div className="grid gap-6">
      <Terminal lines={terminalLines(result, policy)} />
      <div className="grid gap-3">
        <div className="flex">
          <Tag key={runKey} tone={TONE[outcome]} hang>
            {copy[outcome].label}
          </Tag>
        </div>
        <p className={`${T.body} text-[color:var(--fg)]`}>{copy[outcome].body}</p>
      </div>
      {outcome === "unreachable" ? null : (
        <section className="grid gap-3 border-t border-[color:var(--rule)] pt-5">
          <h4 className={T.label}>{copy.findings}</h4>
          {result.findings.length === 0 ? (
            <p className={T.body}>{copy.noFindings}</p>
          ) : (
            <ul className="grid gap-4">
              {result.findings.map((item) => {
                const words = findingCopy[item.code];
                return (
                  <li
                    key={item.code}
                    className="grid gap-1 border-l-4 border-[color:var(--rule-strong)] pl-3"
                  >
                    <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]">
                      {fill(words.title, item.values)}
                    </p>
                    <p className={`${T.body} [overflow-wrap:anywhere]`}>
                      {fill(words.body, item.values)}
                    </p>
                    {"fix" in words && words.fix && hasValues(words.fix, item.values) ? (
                      <p className={T.small}>{fill(words.fix, item.values)}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      {result.changes.length > 0 || result.approvals.length > 0 ? (
        <section className="grid gap-2 border-t border-[color:var(--rule)] pt-5">
          <h4 className={T.label}>{copy.changes}</h4>
          {result.changes.map((row) => (
            <ChangeRow
              key={`${row.direction}-${row.unit}`}
              label={row.direction === "out" ? sign.changes.out : sign.changes.in}
              value={row.value}
              unit={row.unit}
              direction={row.direction}
            />
          ))}
          {result.approvals.map((item) => (
            <ChangeRow
              key={`${item.unit}-${item.spender}`}
              label={sign.changes.allow}
              value={item.unlimited || item.amount === null ? sign.changes.unlimited : item.amount}
              unit={item.unit}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
