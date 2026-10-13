import { review } from "@baret/content";
import { Tag, Verdict, type VerdictKind } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import type { JSX, ReactNode } from "react";
import type { TimelineState, ToolStep } from "./reducer.js";
import { Stepper } from "./Stepper.js";

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

/**
 * "Reviewed by Qwen (qwen3.8-max)": the model the answer names, for the
 * outcome's header. Null until the answer names one.
 */
export function reviewedBy(model: TimelineState["model"]): string | null {
  if (!model?.provider || !model.name) return null;
  const provider = `${model.provider.charAt(0).toUpperCase()}${model.provider.slice(1)}`;
  return fill(copy.reviewedBy, { provider, name: model.name });
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
  if (state.phase === "idle") {
    return (
      <div className="grid gap-5 border border-dashed border-[color:var(--rule-strong)] p-6">
        <Stepper state={state} />
        <p className={T.body}>{copy.idle}</p>
      </div>
    );
  }
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
      <Stepper state={state} />
      <Outcome state={state} />

      <details
        key={state.phase === "done" ? "done" : "open"}
        open={state.phase !== "done"}
        className="group border-t border-[color:var(--rule)] pt-4"
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]">
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-open:rotate-90"
          >
            &#8250;
          </span>
          {copy.steps}
        </summary>
        {state.intent ? <p className={`${T.small} mt-2 mb-6 break-words`}>{state.intent}</p> : null}
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
              {/* Which model answered, from the answer itself, so a recorded run and a live one read apart. */}
              {state.model ? (
                <p className={T.small}>
                  {fill(copy.model, { name: state.model.name, provider: state.model.provider })}
                </p>
              ) : null}
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
          {state.phase === "running" ? (
            <li aria-hidden="true" className="grid gap-2 border-t border-[color:var(--rule)] pt-5">
              <span className={`${T.label} text-[color:var(--fg-faint)]`}>{copy.waiting}</span>
              <span className="h-3 w-4/5 animate-pulse bg-[color:var(--rule)] motion-reduce:animate-none" />
              <span className="h-3 w-3/5 animate-pulse bg-[color:var(--rule)] motion-reduce:animate-none" />
            </li>
          ) : null}
        </ol>
      </details>

      {state.phase === "error" && state.error ? (
        <p className={`${T.body} text-[color:var(--blocked-ink)]`}>
          {fill(copy.error, { message: state.error })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The answer first, once there is one: the model's decision with its reason,
 * or Baret's stop when the model was never asked, and what happened to the
 * payment. The steps below keep every detail.
 */
function Outcome({ state }: { state: TimelineState }): JSX.Element | null {
  const stopped = state.baret !== null && state.baret.decision !== "safe";
  if (!state.decision && !(stopped && state.phase === "done")) return null;
  const approve = state.decision?.decision === "approve";
  const sent = state.phase === "done" ? state.sent : null;
  // Only when the model was asked: a call Baret stopped never reached it.
  const byline = state.decision ? reviewedBy(state.model) : null;
  return (
    <section className="grid gap-3 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-5 motion-safe:animate-[review-rise_320ms_ease-out] md:p-6">
      <style>
        {
          "@keyframes review-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}"
        }
      </style>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={T.label}>{copy.outcome}</h3>
        {byline ? <p className={`${T.small} break-words`}>{byline}</p> : null}
      </div>
      {state.decision ? (
        <Verdict
          kind={approve ? "safe" : "blocked"}
          label={approve ? copy.approve : copy.veto}
          body={state.decision.reason}
          announce={false}
        />
      ) : (
        <Verdict
          kind={verdictKind(state.baret?.decision ?? "blocked")}
          label={state.baret?.decision ?? "blocked"}
          body={copy.baretStopped}
          announce={false}
        />
      )}
      {state.phase === "done" ? (
        <p className={T.body}>
          {sent?.hash ? (
            <>
              {sent.status === "confirmed"
                ? copy.sent
                : sent.status === "failed"
                  ? copy.sentFailed
                  : copy.sentTimeout}{" "}
              <a
                className="font-medium text-[color:var(--fg)] underline underline-offset-4"
                href={`${EXPLORER}/tx/${sent.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.viewTx}
              </a>
            </>
          ) : sent ? (
            copy.sentNotBroadcast
          ) : (
            copy.notSent
          )}
        </p>
      ) : null}
    </section>
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
