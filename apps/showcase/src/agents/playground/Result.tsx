import { agents, findings as findingCopy, sign } from "@baret/content";
import { ChangeRow } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { bodyOf, hasValues } from "@baret/web-ui/components/CheckBlocks";
import type { CheckResult } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import type { JSX } from "react";
import { StageProgress } from "../StageProgress.js";
import type { PolicyName } from "./sample.js";
import { type Outcome, outcomeOf, terminalLines } from "./terminal.js";

/**
 * The right-hand side of the playground: a terminal that prints what the
 * agent and Baret say, then the answer itself. A tag (hung on each new
 * verdict), the plain sentence, every finding in Baret's own words, and what
 * would change. Before the first run: the empty state. Long terminal lines
 * wrap instead of scrolling, so a phone reads the whole exchange.
 */

const { result: copy, empty, progress } = agents.playground;

const TONE: Record<Outcome, "safe" | "caution" | "blocked" | "neutral"> = {
  safe: "safe",
  caution: "caution",
  blocked: "blocked",
  unreachable: "neutral",
  notSent: "neutral",
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
  if (state.phase === "checking") {
    return (
      <div className="grid gap-4">
        <Terminal lines={terminalLines(null, policy)} />
        <StageProgress stages={progress.stages} title={progress.title} stepMs={420} />
      </div>
    );
  }

  const { result } = state;
  const outcome = outcomeOf(result);
  return (
    <div className="grid gap-6 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-5 motion-safe:animate-[baret-rise_320ms_ease-out] md:p-6">
      <style>
        {
          "@keyframes baret-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"
        }
      </style>
      <div className="grid gap-3">
        <div className="flex">
          <Tag key={runKey} tone={TONE[outcome]} hang>
            {copy[outcome].label}
          </Tag>
        </div>
        <p className="text-lg leading-snug font-medium text-[color:var(--fg)]">
          {copy[outcome].body}
        </p>
      </div>
      {result.changes.length > 0 || result.approvals.length > 0 ? (
        <section className="grid gap-2 border-t border-[color:var(--rule)] pt-5">
          <h3 className={T.label}>{copy.changes}</h3>
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
      {outcome === "unreachable" || outcome === "notSent" ? null : (
        <section className="grid gap-3 border-t border-[color:var(--rule)] pt-5">
          <h3 className={T.label}>{copy.findings}</h3>
          {result.findings.length === 0 ? (
            <p className={T.body}>{copy.noFindings}</p>
          ) : (
            <ul className="grid gap-4">
              {result.findings.map((item, i) => {
                const words = findingCopy[item.code];
                const { template, values } = bodyOf(words, item);
                return (
                  <li
                    // biome-ignore lint/suspicious/noArrayIndexKey: a live answer can repeat a code, and the list never reorders.
                    key={`${item.code}-${i}`}
                    className="grid gap-1 border-l-4 border-[color:var(--rule-strong)] pl-3"
                  >
                    <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-[color:var(--fg)]">
                      {fill(words.title, item.values)}
                    </p>
                    <p className={`${T.body} [overflow-wrap:anywhere]`}>{fill(template, values)}</p>
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
      <details className="group border-t border-[color:var(--rule)] pt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]">
          <span
            aria-hidden="true"
            className="mr-2 inline-block transition-transform group-open:rotate-90"
          >
            &#8250;
          </span>
          {copy.exchange}
        </summary>
        <div className="mt-3">
          <Terminal lines={terminalLines(result, policy)} />
        </div>
      </details>
    </div>
  );
}
