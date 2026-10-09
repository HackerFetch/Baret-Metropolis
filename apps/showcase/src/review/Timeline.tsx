import { review } from "@baret/content";
import { Tag, Verdict, type VerdictKind } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import type { JSX, ReactNode } from "react";
import type { TimelineState, ToolStep } from "./reducer.js";

/**
 * The live timeline of one review: Baret's verdict, the plan, each tool call
 * as it arrives, then the decision and, for a sent payment, its hash. The
 * page owns the one polite live region; nothing here announces itself.
 */

export const EXPLORER = "https://testnet.monadexplorer.com";

const copy = review.timeline;

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function verdictKind(decision: string): VerdictKind {
  if (decision === "safe" || decision === "caution" || decision === "blocked") return decision;
  return "blocked";
}

/** Short arguments for the tool line: `address 0x46F1...2158`. */
export function shortArguments(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      const short = /^0x[0-9a-fA-F]{12,}$/.test(text)
        ? `${text.slice(0, 6)}...${text.slice(-4)}`
        : text;
      return `${key} ${short}`;
    })
    .join(", ");
}

/** One line on what a tool answered, from the fields the reviewer's tools return. */
export function toolSummary(step: ToolStep): string {
  if (!step.ok) return typeof step.result === "string" ? step.result : copy.toolError;
  const result = step.result as Record<string, unknown> | null;
  if (!result || typeof result !== "object") {
    // A result cut at 2000 chars does not parse; its first fields still read.
    const text = String(step.result ?? "");
    const fits = /"fits":(true|false)/.exec(text)?.[1];
    if (step.tool === "read_vault" && fits)
      return fits === "true" ? copy.summary.fits : copy.summary.doesNotFit;
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }
  if (step.tool === "check_reputation") {
    return result.listed === true ? copy.summary.listed : copy.summary.notListed;
  }
  if (step.tool === "read_vault") {
    const fits = (result.thisPayment as { fits?: unknown } | null | undefined)?.fits;
    if (typeof fits === "boolean") return fits ? copy.summary.fits : copy.summary.doesNotFit;
  }
  if (step.tool === "decode_transaction") {
    const args = (result.args ?? {}) as Record<string, unknown>;
    return `${String(result.function ?? "call")}: amount ${String(args.amount ?? "?")} to ${shortArguments({ m: args.merchant }).slice(2)}`;
  }
  if (step.tool === "get_baret_verdict") {
    const findings = Array.isArray(result.findings) ? result.findings.length : 0;
    return `${String(result.decision ?? "?")}, ${findings} findings`;
  }
  const keys = Object.keys(result).slice(0, 4).join(", ");
  return keys ? `fields: ${keys}` : "";
}

function Block({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <li className="border-t border-[color:var(--rule)] pt-5">
      <h3 className={`${T.label} mb-3`}>{title}</h3>
      {children}
    </li>
  );
}

function ToolRow({ step, index }: { step: ToolStep; index: number }): JSX.Element {
  return (
    <li className="grid gap-1.5 border-l-2 border-[color:var(--rule)] py-1 pl-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <code className="font-mono text-sm text-[color:var(--fg)]">{step.tool}</code>
        <Tag tone={step.ok ? "safe" : "blocked"} size="sm">
          {step.ok ? copy.toolOk : copy.toolError}
        </Tag>
        <span className={`${T.small} ${T.num}`} data-numeric>
          {step.ms} ms
        </span>
      </div>
      {Object.keys(step.arguments).length > 0 ? (
        <p className={`${T.small} break-all font-mono`}>{shortArguments(step.arguments)}</p>
      ) : null}
      <p className={`${T.small} break-words`}>{toolSummary(step)}</p>
      <details name="review-tool-result" className="group">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]">
          {copy.fullResult} <span className="sr-only">{`(${index + 1})`}</span>
        </summary>
        <pre className="max-h-80 overflow-auto bg-[color:var(--ground-deep)] p-3 font-mono text-xs leading-relaxed text-[color:var(--fg)]">
          {JSON.stringify(step.result, null, 2)}
        </pre>
      </details>
    </li>
  );
}

export function Timeline({ state }: { state: TimelineState }): JSX.Element {
  if (state.phase === "idle") return <p className={T.body}>{copy.idle}</p>;
  const baretSafe = state.baret?.decision === "safe";
  const decided = state.phase === "done" || state.decision !== null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tag tone={state.source === "live" ? "network" : "watching"}>
          {state.source === "live" ? copy.live : copy.recorded}
        </Tag>
        {state.source === "live" && state.cachedAt ? (
          <span className={T.small}>
            {fill(copy.cached, { time: new Date(state.cachedAt).toLocaleString() })}
          </span>
        ) : null}
      </div>
      {state.source === "recorded" ? <p className={T.small}>{copy.recordedNote}</p> : null}
      {state.intent ? <p className={`${T.body} break-words`}>{state.intent}</p> : null}

      <ol className="grid gap-6">
        {state.baret ? (
          <Block title={copy.baret}>
            <Verdict
              kind={verdictKind(state.baret.decision)}
              label={state.baret.decision}
              body={baretSafe ? copy.baretSafe : copy.baretStopped}
              announce={false}
            >
              {state.baret.findings.length > 0 ? (
                <span className={T.small}>
                  {fill(copy.findings, { count: String(state.baret.findings.length) })}:{" "}
                  {state.baret.findings.map((f) => f.code).join(", ")}
                </span>
              ) : null}
            </Verdict>
          </Block>
        ) : null}

        {state.plan ? (
          <Block title={copy.plan}>
            <ol className="grid list-decimal gap-1.5 pl-6">
              {state.plan.map((line) => (
                <li key={line} className={T.body}>
                  {line}
                </li>
              ))}
            </ol>
          </Block>
        ) : null}

        {state.tools.length > 0 || (decided && baretSafe) ? (
          <Block title={copy.tools}>
            {state.tools.length > 0 ? (
              <ol className="grid gap-4">
                {state.tools.map((step, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: steps only append, a tool may run twice
                  <ToolRow key={index} step={step} index={index} />
                ))}
              </ol>
            ) : (
              <p className={T.small}>{copy.noTools}</p>
            )}
          </Block>
        ) : null}

        {state.decision ? (
          <Block title={copy.decision}>
            <Verdict
              kind={state.decision.decision === "approve" ? "safe" : "blocked"}
              label={state.decision.decision === "approve" ? copy.approve : copy.veto}
              body={state.decision.reason}
              announce={false}
            >
              {state.decision.mismatches.length > 0 ? (
                <div className="mt-2">
                  <p className={T.label}>{copy.mismatches}</p>
                  <ul className="mt-1 grid list-disc gap-1 pl-5">
                    {state.decision.mismatches.map((m) => (
                      <li key={m} className={`${T.small} break-words`}>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Verdict>
          </Block>
        ) : null}

        {state.phase === "done" ? <SentBlock state={state} /> : null}
      </ol>

      {state.phase === "error" && state.error ? (
        <p className={`${T.body} text-[color:var(--blocked-ink)]`}>
          {fill(copy.error, { message: state.error })}
        </p>
      ) : null}
    </div>
  );
}

function SentBlock({ state }: { state: TimelineState }): JSX.Element {
  const sent = state.sent;
  if (!sent) {
    return (
      <Block title={copy.payment}>
        <p className={T.body}>{copy.notSent}</p>
      </Block>
    );
  }
  if (sent.hash === null) {
    return (
      <Block title={copy.payment}>
        <p className={T.body}>{copy.sentNotBroadcast}</p>
      </Block>
    );
  }
  const line =
    sent.status === "confirmed"
      ? copy.sent
      : sent.status === "failed"
        ? copy.sentFailed
        : copy.sentTimeout;
  return (
    <Block title={copy.payment}>
      <p className={T.body}>{line}</p>
      <p className={`${T.small} mt-2 break-all font-mono`}>{sent.hash}</p>
      <a
        className="mt-2 inline-flex min-h-11 items-center font-medium text-[color:var(--fg)] underline underline-offset-4"
        href={`${EXPLORER}/tx/${sent.hash}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {copy.viewTx}
      </a>
    </Block>
  );
}
