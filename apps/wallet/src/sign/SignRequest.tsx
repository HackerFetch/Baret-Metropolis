import { common, sign } from "@baret/content";
import { Button, ChangeRow, VerdictTag } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, type ReactNode, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { Findings } from "../components/Findings.js";
import { Parts } from "../components/Parts.js";
import { amount } from "../data/format.js";
import { useWallet } from "../data/store.js";
import type { ActivityItem, SignRequest as Request } from "../data/types.js";
import { routes } from "../routes.js";
import { HoldButton } from "./HoldButton.js";
import {
  actionParts,
  blockedSummary,
  fixFor,
  impactText,
  logFor,
  type Outcome,
  ruleRows,
} from "./sign.js";

/**
 * The sign request, the most-read screen in the product (content sign.*). In
 * order: who asks and what for, the site's claim (shown, never trusted), the
 * verdict and who checked it, what happens if you sign, what changes, the
 * findings, the rules it breaks, the raw request, the countdown, then the
 * actions. Blocked has no sign button: the only way past it, and past Can't
 * reach Baret, is the override, press and hold, written to the activity log.
 * The result replaces the whole screen.
 *
 * Sample requests run on timers that stand in for the server and the chain:
 * a short check, then the signing steps. Nothing is sent anywhere.
 */

type Phase =
  | { readonly kind: "checking" }
  | { readonly kind: "review" }
  | { readonly kind: "override" }
  | { readonly kind: "retrying" }
  | {
      readonly kind: "signing";
      readonly step: "passkey" | "signing" | "sending";
      readonly outcome: Outcome;
    }
  | { readonly kind: "result"; readonly outcome: Outcome };

/** The sample confirmation, as a block number. */
const SAMPLE_BLOCK = "48212045";

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid gap-3 border-t border-[color:var(--rule)] px-5 py-5 md:px-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className={T.label}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Verdict({ request, checking }: { request: Request; checking: boolean }): JSX.Element {
  const { verdict } = sign;
  if (checking) {
    return (
      <div className="grid gap-2">
        <p className="font-display text-2xl font-extrabold uppercase text-[color:var(--fg)]">
          {verdict.checking.title}
        </p>
        <p className={T.body}>{verdict.checking.body}</p>
      </div>
    );
  }
  const words =
    request.verdict === "safe"
      ? { title: verdict.safe.title, summary: verdict.safe.summary }
      : request.verdict === "caution"
        ? { title: verdict.caution.title, summary: verdict.caution.summary }
        : request.verdict === "blocked"
          ? { title: verdict.blocked.title, summary: blockedSummary(request) }
          : { title: verdict.unreachable.title, summary: verdict.unreachable.summary };
  return (
    <div className="grid gap-3">
      <div className="flex">
        <VerdictTag kind={request.verdict} label={common.verdicts[request.verdict].label} />
      </div>
      <p className="font-display text-2xl font-extrabold uppercase leading-tight text-[color:var(--fg)]">
        {words.title}
      </p>
      <p className={T.body}>{words.summary}</p>
    </div>
  );
}

function Result({ outcome, onAgain }: { outcome: Outcome; onAgain?: () => void }): JSX.Element {
  const words = sign.result[outcome];
  return (
    <div className="grid gap-4 px-5 py-8 md:px-6">
      <p className="font-display text-3xl font-extrabold uppercase text-[color:var(--fg)]">
        {words.title}
      </p>
      <p className={T.body}>{fill(words.body, { block: SAMPLE_BLOCK })}</p>
      {onAgain ? (
        <div className="flex pt-2">
          <Button type="button" variant="ghost" onClick={onAgain}>
            {common.actions.back}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SignRequest({
  request,
  onDone,
  onAgain,
  onDecline,
  onLog,
}: {
  request: Request;
  /** Called once with the outcome, after it is logged. */
  onDone?: (outcome: Outcome) => void;
  /** Shown on the result: back to the form or the sample picker. */
  onAgain?: () => void;
  /** Decline without a result: the account's own transfer goes back to its form. */
  onDecline?: () => void;
  /** Writes the outcome somewhere else than the plain log (Send also moves the balances). */
  onLog?: (item: ActivityItem) => void;
}): JSX.Element {
  const reduce = useReduce();
  const { state, dispatch } = useWallet();
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [stillDown, setStillDown] = useState(false);
  const [left, setLeft] = useState(request.expires);
  const [said, setSaid] = useState("");

  function finish(outcome: Outcome): void {
    if (outcome === "declined" && onDecline) {
      onDecline();
      return;
    }
    const item = logFor(request, outcome, new Date().toISOString(), SAMPLE_BLOCK);
    if (onLog) onLog(item);
    else dispatch({ type: "log", item });
    setPhase({ kind: "result", outcome });
    setSaid(sign.result[outcome].title);
    onDone?.(outcome);
  }

  // The stand-in check: a short pause, then the verdict, announced once.
  useEffect(() => {
    if (phase.kind !== "checking") return;
    const id = window.setTimeout(
      () => {
        setPhase({ kind: "review" });
        setSaid(common.verdicts[request.verdict].aria);
      },
      reduce ? 0 : 700,
    );
    return () => window.clearTimeout(id);
  }, [phase, reduce, request.verdict]);

  // Check again, for Can't reach Baret: the sample server stays down.
  useEffect(() => {
    if (phase.kind !== "retrying") return;
    const id = window.setTimeout(() => {
      setStillDown(true);
      setPhase({ kind: "review" });
      setSaid(sign.offline.stillDown);
    }, 900);
    return () => window.clearTimeout(id);
  }, [phase]);

  // The signing steps: the passkey when every signature asks for it, then signing and sending.
  // biome-ignore lint/correctness/useExhaustiveDependencies: finish reads the latest request.
  useEffect(() => {
    if (phase.kind !== "signing") return;
    const next =
      phase.step === "passkey"
        ? () => setPhase({ ...phase, step: "signing" })
        : phase.step === "signing"
          ? () => setPhase({ ...phase, step: "sending" })
          : () => finish(phase.outcome);
    const id = window.setTimeout(next, phase.step === "passkey" ? 900 : 600);
    return () => window.clearTimeout(id);
  }, [phase]);

  // The countdown runs while the request waits for an answer.
  const waiting = phase.kind === "review" || phase.kind === "override" || phase.kind === "checking";
  // biome-ignore lint/correctness/useExhaustiveDependencies: finish reads the latest request.
  useEffect(() => {
    if (!waiting) return;
    if (left <= 0) {
      finish("expired");
      return;
    }
    const id = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [waiting, left]);

  function startSigning(outcome: Outcome): void {
    setPhase({
      kind: "signing",
      step: state.settings.passkeyEverySignature ? "passkey" : "signing",
      outcome,
    });
  }

  const checking = phase.kind === "checking";
  const blocked = request.verdict === "blocked";
  const unreachable = request.verdict === "unreachable";
  const rows = ruleRows(request);

  if (phase.kind === "result") {
    return (
      <article
        aria-labelledby={titleId}
        className="border border-[color:var(--rule-strong)] bg-[color:var(--surface)]"
      >
        <h1 id={titleId} className="sr-only">
          {sign.header.title}
        </h1>
        <p role="status" className="sr-only">
          {said}
        </p>
        <Result outcome={phase.outcome} {...(onAgain ? { onAgain } : {})} />
      </article>
    );
  }

  return (
    <article
      aria-labelledby={titleId}
      className="border border-[color:var(--rule-strong)] bg-[color:var(--surface)]"
    >
      <p role="status" className="sr-only">
        {said}
      </p>
      <header className="grid gap-3 px-5 pt-6 pb-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={T.label}>{sign.header.title}</p>
          <Tag tone="network" size="sm">
            {common.networks.testnet.label}
          </Tag>
        </div>
        <h1
          id={titleId}
          className="font-display text-3xl font-extrabold uppercase leading-[1.02] text-[color:var(--fg)] [overflow-wrap:anywhere]"
        >
          <Parts parts={actionParts(request)} />
        </h1>
        {request.origin ? (
          <p className="text-sm text-[color:var(--fg)]">
            <span className="font-mono">
              {fill(sign.header.fromSite, { origin: request.origin })}
            </span>
            <span className="block text-[color:var(--fg-muted)]">{sign.header.originNote}</span>
          </p>
        ) : null}
      </header>

      {request.origin && request.claim ? (
        <Section title={fill(sign.claim.label, { origin: request.origin })}>
          <blockquote className="border-l-2 border-[color:var(--rule-strong)] pl-4 text-base text-[color:var(--fg)]">
            {request.claim}
          </blockquote>
          <p className={T.small}>
            <span className="font-medium text-[color:var(--fg)]">{sign.claim.tag}</span>{" "}
            {sign.claim.note}
          </p>
        </Section>
      ) : null}

      <div className="grid gap-3 border-t border-[color:var(--rule)] px-5 py-5 md:px-6">
        <Verdict request={request} checking={checking} />
        {!checking && !unreachable ? (
          <div className="grid gap-1 border-t border-[color:var(--rule)] pt-3 text-sm">
            <p>
              <span className="text-[color:var(--fg-muted)]">{sign.verdict.checkedBy.label}: </span>
              <span className="text-[color:var(--fg)]">{sign.verdict.checkedBy.value}</span>
            </p>
            <p className={T.small}>{sign.verdict.checkedBy.detail}</p>
            <ul className="grid gap-0.5">
              {Object.values(sign.verdict.checkedBy.sources).map((source) => (
                <li key={source} className={T.small}>
                  {source}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {!checking && unreachable ? (
        <Section title={sign.offline.title}>
          <p className={T.body}>{sign.offline.body}</p>
          <p className="text-sm text-[color:var(--fg)]">{sign.offline.reasons.server}</p>
          {stillDown ? (
            <p className="text-sm text-[color:var(--fg)]">{sign.offline.stillDown}</p>
          ) : null}
          <p className={T.small}>{sign.offline.note}</p>
        </Section>
      ) : null}

      {!checking ? (
        <>
          <Section title={sign.impact.label}>
            <p className="text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
              {impactText(request)}
            </p>
          </Section>

          <Section title={sign.changes.title}>
            {unreachable ? (
              <p className={T.body}>{sign.changes.unknown}</p>
            ) : (
              <div className="grid gap-2">
                {request.changes.length === 0 && request.approvals.length === 0 ? (
                  <p className={T.body}>{sign.changes.none}</p>
                ) : null}
                {request.changes.map((change) => (
                  <ChangeRow
                    key={`${change.direction}-${change.unit}`}
                    label={change.direction === "out" ? sign.changes.out : sign.changes.in}
                    value={change.value}
                    unit={change.unit}
                    direction={change.direction}
                  />
                ))}
                {request.approvals.map((approval) => (
                  <div key={`${approval.unit}-${approval.spender}`}>
                    <ChangeRow
                      label={sign.changes.allow}
                      value={
                        approval.unlimited || approval.amount === null
                          ? sign.changes.unlimited
                          : approval.amount
                      }
                      unit={approval.unit}
                    />
                    <p className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
                      {approval.spender}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <ChangeRow label={sign.changes.fee} value={amount(request.fee)} unit="MON" />
            <p className={T.small}>{sign.changes.disclaimer}</p>
          </Section>

          {!unreachable ? (
            <Section
              title={sign.findings.title}
              aside={
                request.findings.length > 0 ? (
                  <span className={`${T.label} ${T.num}`}>
                    {fill(sign.findings.count, { count: String(request.findings.length) })}
                  </span>
                ) : null
              }
            >
              <Findings items={request.findings} />
            </Section>
          ) : null}

          {!unreachable ? (
            <Section title={sign.rules.title}>
              {rows.length === 0 ? (
                <p className={T.body}>{sign.rules.none}</p>
              ) : (
                <ul className="grid gap-3">
                  {rows.map((row) => (
                    <li key={row.label} className="grid gap-1">
                      <p className="text-base font-medium text-[color:var(--fg)]">{row.label}</p>
                      {row.detail ? <p className={T.small}>{row.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
              {rows.length > 0 ? (
                <Link
                  to={routes.policies.path}
                  className="w-max text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4"
                >
                  {sign.rules.edit}
                </Link>
              ) : null}
            </Section>
          ) : null}

          {blocked ? (
            <Section title={sign.verdict.blocked.fix.title}>
              <p className="text-base text-[color:var(--fg)]">{fixFor(request)}</p>
            </Section>
          ) : null}

          <Section title={sign.raw.title}>
            <details className="group">
              <summary className="flex w-max cursor-pointer list-none items-center gap-2 text-sm font-medium text-[color:var(--fg)] [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="font-mono text-base text-[color:var(--fg-muted)] transition-transform duration-150 group-open:rotate-45"
                >
                  +
                </span>
                {sign.raw.hint}
              </summary>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid gap-1">
                  <dt className={T.label}>{sign.raw.decoded}</dt>
                  <dd className="font-mono text-[color:var(--fg)]">
                    {request.raw.decoded ?? sign.raw.notDecoded}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className={T.label}>{sign.raw.to}</dt>
                  <dd className="font-mono text-[color:var(--fg)] [overflow-wrap:anywhere]">
                    {request.raw.to}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className={T.label}>{sign.raw.value}</dt>
                  <dd className={`font-mono text-[color:var(--fg)] ${T.num}`}>
                    {request.raw.value}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className={T.label}>{sign.raw.calldata}</dt>
                  <dd className="grid gap-1">
                    <code className="block max-h-32 overflow-y-auto font-mono text-xs text-[color:var(--fg)] [overflow-wrap:anywhere]">
                      {request.raw.data}
                    </code>
                    <span className="-ml-2 flex">
                      <CopyButton
                        text={request.raw.data}
                        label={sign.raw.copy}
                        done={sign.raw.copied}
                      />
                    </span>
                  </dd>
                </div>
              </dl>
            </details>
          </Section>
        </>
      ) : null}

      <footer className="grid gap-4 border-t border-[color:var(--rule-strong)] px-5 py-5 md:px-6">
        {phase.kind === "signing" ? (
          <p className="font-display text-xl font-extrabold uppercase text-[color:var(--fg)]">
            {phase.step === "passkey"
              ? sign.status.passkey
              : phase.step === "signing"
                ? sign.status.signing
                : sign.status.sending}
          </p>
        ) : phase.kind === "override" ? (
          <div className="grid gap-4">
            <p className="font-display text-xl font-extrabold uppercase text-[color:var(--fg)]">
              {unreachable ? sign.override.unreachable.title : sign.override.blocked.title}
            </p>
            <p className={T.body}>
              {unreachable
                ? sign.override.unreachable.body
                : fill(sign.override.blocked.body, { rule: ruleRows(request)[0]?.label ?? "" })}
            </p>
            <HoldButton onHeld={() => startSigning("overridden")} />
            <p className={T.small}>{sign.override.logged}</p>
            <div className="flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPhase({ kind: "review" })}
              >
                {sign.override.back}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {blocked ? <p className={T.small}>{sign.verdict.blocked.noSign}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {request.verdict === "safe" || request.verdict === "caution" ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    disabled={checking}
                    onClick={() => finish("declined")}
                  >
                    {sign.verdict.safe.secondary}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={checking}
                    onClick={() => startSigning("sent")}
                  >
                    {sign.verdict.safe.primary}
                  </Button>
                </>
              ) : blocked ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    disabled={checking}
                    onClick={() => setPhase({ kind: "override" })}
                  >
                    {sign.verdict.blocked.secondary}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={checking}
                    onClick={() => finish("declined")}
                  >
                    {sign.verdict.blocked.primary}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    disabled={checking}
                    onClick={() => finish("declined")}
                  >
                    {sign.verdict.unreachable.secondary}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={checking || phase.kind === "retrying"}
                    onClick={() => {
                      setPhase({ kind: "retrying" });
                      setSaid(sign.offline.retrying);
                    }}
                  >
                    {phase.kind === "retrying"
                      ? sign.offline.retrying
                      : sign.verdict.unreachable.primary}
                  </Button>
                </>
              )}
            </div>
            {unreachable && phase.kind !== "retrying" && !checking ? (
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase({ kind: "override" })}
                >
                  {sign.verdict.unreachable.override}
                </Button>
              </div>
            ) : null}
          </>
        )}
        {waiting ? (
          <div className="grid gap-1">
            <p className={`font-mono text-sm text-[color:var(--fg)] ${T.num}`} aria-hidden="true">
              {fill(sign.countdown.label, { seconds: String(left) })}
            </p>
            <p className={T.small}>{sign.countdown.note}</p>
          </div>
        ) : null}
      </footer>
    </article>
  );
}
