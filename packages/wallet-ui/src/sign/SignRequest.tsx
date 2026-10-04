import { common, sign } from "@baret/content";
import { Button, ChangeRow, VerdictTag } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { counted, cx, fill } from "@baret/web-ui/lib/util";
import { type JSX, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Findings } from "../components/Findings.js";
import { Parts } from "../components/Parts.js";
import { amount } from "../data/format.js";
import type { ActivityItem, SignRequest as Request } from "../data/types.js";
import { HoldButton } from "./HoldButton.js";
import {
  actionParts,
  blockedSummary,
  fixFor,
  impactText,
  logFor,
  type Outcome,
  overrideBody,
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
 * The seam a live surface drives, every prop optional so the samples keep
 * working as they are:
 * - `pending`: true while Baret's answer is on its way. The screen shows
 *   Checking with every decision button disabled; when it turns false the
 *   verdict in `request` is shown and announced. Left out, a short timer
 *   stands in for the check.
 * - `onCheckAgain()`: Check again, under Can't reach Baret. It resolves with
 *   the new request (data/analyze.ts `fromAnalyze`), which replaces the shown
 *   one. Null, an unreachable request or a rejection keep the screen on
 *   Can't reach Baret (fail-closed). Left out, the sample server stays down.
 * - `onSign(outcome, sending)`: signs and sends once the reader decides
 *   (after the passkey, when asked for). It calls `sending()` when the signed
 *   transaction leaves, and resolves with its hash and block, which the
 *   result and the log show. A rejection before `sending()` goes back to the
 *   decision; one after it keeps the screen on Sending, so nothing is signed
 *   twice. Left out, timers stand in and the sample block is shown. Nothing
 *   is sent.
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
  | { readonly kind: "result"; readonly outcome: Outcome; readonly block: string };

/** What a live signature returns: the transaction and the block that took it. */
export interface SignReceipt {
  readonly hash: string;
  readonly block: string;
}

/** The sample confirmation, as a block number. */
const SAMPLE_BLOCK = "48212045";

/** The compact decision row: two columns, except Blocked, whose override sits under Decline. */
function compactGrid(verdict: Request["verdict"]): string {
  return verdict === "blocked" ? "grid gap-2" : "grid grid-cols-2 gap-2";
}

/**
 * Compact only: whatever takes focus in the scroller stops above the pinned
 * footer, whose height the component writes into --sign-foot.
 */
const CLEAR_FOOT =
  "[&>:not(footer)_:is(a,button,summary,h2,p)]:scroll-mb-[calc(var(--sign-foot,0px)+0.75rem)]";

/** A heading that takes focus by script only, never by Tab. */
const FOCUS_TARGET = "outline-none";

/** The rules link's look, handed to whichever surface draws the link. */
const RULES_LINK =
  "inline-flex min-h-11 w-max items-center text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

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

/** The verdict's title and one-line summary, for whichever verdict came back. */
function verdictWords(request: Request): { title: string; summary: string } {
  const { verdict } = sign;
  return request.verdict === "safe"
    ? { title: verdict.safe.title, summary: verdict.safe.summary }
    : request.verdict === "caution"
      ? { title: verdict.caution.title, summary: verdict.caution.summary }
      : request.verdict === "blocked"
        ? { title: verdict.blocked.title, summary: blockedSummary(request) }
        : { title: verdict.unreachable.title, summary: verdict.unreachable.summary };
}

/**
 * Compact only: the verdict in one line under the heading, so Baret's answer
 * is read before the site's claim and above the pinned footer.
 */
function VerdictLine({ request, checking }: { request: Request; checking: boolean }): JSX.Element {
  if (checking) {
    // Two lines held, the height most verdicts take, so the answer arriving
    // does not push the rest of the request down (layout shift).
    return <p className={`${T.small} min-h-10`}>{sign.verdict.checking.title}</p>;
  }
  return (
    <div className="flex items-start gap-2">
      <VerdictTag kind={request.verdict} label={common.verdicts[request.verdict].label} />
      <p className="text-sm text-[color:var(--fg)]">{verdictWords(request).summary}</p>
    </div>
  );
}

function Verdict({
  request,
  checking,
  short = false,
}: {
  request: Request;
  checking: boolean;
  /** The tag and summary already sit under the heading: the title only. */
  short?: boolean;
}): JSX.Element {
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
  const words = verdictWords(request);
  return (
    <div className="grid gap-3">
      {short ? null : (
        <div className="flex">
          <VerdictTag kind={request.verdict} label={common.verdicts[request.verdict].label} />
        </div>
      )}
      <p className="font-display text-2xl font-extrabold uppercase leading-tight text-[color:var(--fg)]">
        {words.title}
      </p>
      {short ? null : <p className={T.body}>{words.summary}</p>}
    </div>
  );
}

function stepWords(step: "passkey" | "signing" | "sending"): string {
  return step === "passkey"
    ? sign.status.passkey
    : step === "signing"
      ? sign.status.signing
      : sign.status.sending;
}

function Result({
  outcome,
  block,
  onAgain,
  againLabel,
}: {
  outcome: Outcome;
  block: string;
  onAgain?: () => void;
  againLabel: string;
}): JSX.Element {
  const words = sign.result[outcome];
  const title = useRef<HTMLParagraphElement>(null);
  // The pressed button is gone: focus moves to the outcome.
  useEffect(() => {
    title.current?.focus();
  }, []);
  return (
    <div className="grid gap-4 px-5 py-8 md:px-6">
      <p
        ref={title}
        tabIndex={-1}
        className={`font-display text-3xl font-extrabold uppercase text-[color:var(--fg)] ${FOCUS_TARGET}`}
      >
        {words.title}
      </p>
      <p className={T.body}>{fill(words.body, { block })}</p>
      {onAgain ? (
        <div className="flex pt-2">
          <Button type="button" variant="ghost" onClick={onAgain}>
            {againLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SignRequest({
  request: given,
  pending,
  onCheckAgain,
  onSign,
  onLog,
  onDone,
  onAgain,
  againLabel,
  onDecline,
  passkey = false,
  editRules,
  notice,
  verdictArt,
  footnote,
  framed = true,
  compact = false,
  network = "testnet",
}: {
  request: Request;
  /** True while Baret's answer is on its way; left out, a sample timer stands in. */
  pending?: boolean;
  /** Check again under Can't reach Baret: the new request, or null while still down. */
  onCheckAgain?: () => Promise<Request | null>;
  /** Signs and sends; calls `sending` when the transaction leaves. */
  onSign?: (outcome: "sent" | "overridden", sending: () => void) => Promise<SignReceipt>;
  /** Writes the outcome to the account's log (Send also moves the balances). */
  onLog: (item: ActivityItem) => void;
  /** Called once with the outcome, after it is logged. */
  onDone?: (outcome: Outcome) => void;
  /** Shown on the result: back to the form or the sample picker. */
  onAgain?: () => void;
  /** The result's button; "Back" unless the surface has a better word (the next request). */
  againLabel?: string;
  /** Decline without a result: the account's own transfer goes back to its form. */
  onDecline?: () => void;
  /** The wallet asks for the passkey before every signature when its setting says so. */
  passkey?: boolean;
  /**
   * The way to the rules, under the rules that fired. The wallet links its
   * own page; the extension opens its options page. Left out, no link.
   */
  editRules?: (label: string, className: string) => ReactNode;
  /** Under the header: what the surface adds, such as a first request from a site. */
  notice?: ReactNode;
  /** Beside the verdict once the check is in: the extension's tag for that verdict. */
  verdictArt?: ReactNode;
  /** The last line of the footer, such as the extension's window note. */
  footnote?: ReactNode;
  /** False inside a window that is already the frame (the extension popup). */
  framed?: boolean;
  /** The 360 px popup: the decision pinned at the foot, smaller buttons. */
  compact?: boolean;
  /** The network the request is on, named in the header. */
  network?: "testnet" | "mainnet";
}): JSX.Element {
  const reduce = useReduce();
  const titleId = useId();
  // A fresh answer from Check again replaces the request the surface passed,
  // until the surface passes a new one.
  const [fresh, setFresh] = useState<{ request: Request; over: Request } | null>(null);
  const request = fresh && fresh.over === given ? fresh.request : given;
  // Live answers land after a wait: drop them once the screen is gone.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [stillDown, setStillDown] = useState(false);
  const [left, setLeft] = useState(request.expires);
  const [said, setSaid] = useState("");
  const article = useRef<HTMLElement>(null);
  const foot = useRef<HTMLElement>(null);
  const overrideTitle = useRef<HTMLParagraphElement>(null);
  const overrideTrigger = useRef<HTMLButtonElement>(null);
  const signingStatus = useRef<HTMLParagraphElement>(null);
  // Where focus goes once the override opens or closes; null leaves it alone.
  const [focusTo, setFocusTo] = useState<"override" | "trigger" | null>(null);

  function openOverride(): void {
    setPhase({ kind: "override" });
    setFocusTo("override");
  }

  function closeOverride(): void {
    setPhase({ kind: "review" });
    setFocusTo("trigger");
  }

  // The pressed control is replaced: focus follows to its replacement.
  useEffect(() => {
    if (focusTo === null) return;
    (focusTo === "override" ? overrideTitle : overrideTrigger).current?.focus();
    setFocusTo(null);
  }, [focusTo]);

  // Compact: the pinned footer's height, so focused controls stop above it.
  useEffect(() => {
    const node = foot.current;
    const host = article.current;
    if (!compact || !node || !host || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      host.style.setProperty("--sign-foot", `${node.offsetHeight}px`);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact]);

  function finish(outcome: Outcome, receipt?: SignReceipt): void {
    if (outcome === "declined" && onDecline) {
      onDecline();
      return;
    }
    const block = receipt?.block ?? SAMPLE_BLOCK;
    const item = logFor(request, outcome, new Date().toISOString(), block);
    onLog(receipt ? { ...item, hash: receipt.hash } : item);
    // The result focuses its own title, so the status region stays quiet.
    setPhase({ kind: "result", outcome, block });
    onDone?.(outcome);
  }

  // The check: the surface's answer when it says so, else a short stand-in
  // pause. Then the verdict, announced once.
  useEffect(() => {
    if (phase.kind !== "checking" || pending === true) return;
    const reveal = () => {
      // A live answer may expire sooner than the request: the shorter wins.
      if (pending === false) setLeft((value) => Math.min(value, request.expires));
      setPhase({ kind: "review" });
      setSaid(common.verdicts[request.verdict].aria);
    };
    if (pending === false) {
      reveal();
      return;
    }
    const id = window.setTimeout(reveal, reduce ? 0 : 700);
    return () => window.clearTimeout(id);
  }, [phase, pending, reduce, request.verdict, request.expires]);

  function stayDown(): void {
    setStillDown(true);
    setPhase({ kind: "review" });
    setSaid(sign.offline.stillDown);
  }

  // Check again, for Can't reach Baret: the surface's new answer, or the
  // sample server that stays down. Anything but an answer stays down.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per retry.
  useEffect(() => {
    if (phase.kind !== "retrying") return;
    if (onCheckAgain) {
      onCheckAgain().then(
        (next) => {
          if (!alive.current) return;
          if (!next || next.verdict === "unreachable") {
            stayDown();
            return;
          }
          setFresh({ request: next, over: given });
          setLeft(next.expires);
          setStillDown(false);
          setPhase({ kind: "review" });
          setSaid(common.verdicts[next.verdict].aria);
        },
        () => {
          if (alive.current) stayDown();
        },
      );
      return;
    }
    const id = window.setTimeout(stayDown, 900);
    return () => window.clearTimeout(id);
  }, [phase]);

  // The signing steps: the passkey when every signature asks for it, then signing and sending.
  // biome-ignore lint/correctness/useExhaustiveDependencies: finish reads the latest request.
  useEffect(() => {
    if (phase.kind !== "signing") return;
    if (onSign && phase.step !== "passkey") {
      // Live: the surface signs and sends; `sending` moves the status on.
      if (phase.step !== "signing") return;
      const outcome = phase.outcome;
      if (outcome !== "sent" && outcome !== "overridden") return;
      let gone = false;
      onSign(outcome, () => {
        gone = true;
        if (alive.current) setPhase({ kind: "signing", step: "sending", outcome });
      }).then(
        (receipt) => {
          if (alive.current) finish(outcome, receipt);
        },
        () => {
          if (!alive.current) return;
          // Once it has left, a failure does not mean nothing was sent: the
          // screen stays on Sending, so it can never be signed twice.
          if (gone) {
            setPhase({ kind: "signing", step: "sending", outcome });
            setSaid(sign.status.unknown);
            return;
          }
          // A failed signature goes back to the decision, and says so.
          setPhase({ kind: "review" });
          setSaid(sign.status.failed);
        },
      );
      return;
    }
    const next =
      phase.step === "passkey"
        ? () => setPhase({ ...phase, step: "signing" })
        : phase.step === "signing"
          ? () => setPhase({ ...phase, step: "sending" })
          : () => finish(phase.outcome);
    const id = window.setTimeout(next, phase.step === "passkey" ? 900 : 600);
    return () => window.clearTimeout(id);
  }, [phase]);

  // The pressed control is gone while it signs: focus moves to the status,
  // and each step is spoken.
  const signing = phase.kind === "signing";
  const step = phase.kind === "signing" ? phase.step : null;
  useEffect(() => {
    if (signing) signingStatus.current?.focus();
  }, [signing]);
  useEffect(() => {
    if (step) setSaid(stepWords(step));
  }, [step]);

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
      step: passkey ? "passkey" : "signing",
      outcome,
    });
  }

  const frame = framed ? "border border-[color:var(--rule-strong)] bg-[color:var(--surface)]" : "";
  // Compact (the popup): the decision stays pinned at the foot of the window,
  // two buttons side by side; Blocked keeps Decline wide and the override small.
  const decisionSize = compact ? "md" : "lg";
  const decisionGrid = compact ? compactGrid(request.verdict) : "grid gap-3 sm:grid-cols-2";
  const checking = phase.kind === "checking";
  const blocked = request.verdict === "blocked";
  const unreachable = request.verdict === "unreachable";
  const rows = ruleRows(request);

  const overridePanel = (
    <div className="grid gap-4">
      <p
        ref={overrideTitle}
        tabIndex={-1}
        className={`font-display text-xl font-extrabold uppercase text-[color:var(--fg)] ${FOCUS_TARGET}`}
      >
        {unreachable ? sign.override.unreachable.title : sign.override.blocked.title}
      </p>
      <p className={T.body}>
        {unreachable ? sign.override.unreachable.body : overrideBody(request)}
      </p>
      {compact ? null : <HoldButton onHeld={() => startSigning("overridden")} />}
      <p className={T.small}>{sign.override.logged}</p>
      <div className="flex">
        <Button type="button" variant="ghost" size="sm" onClick={closeOverride}>
          {sign.override.back}
        </Button>
      </div>
    </div>
  );

  const noSignId = useId();
  const declineBlocked = (
    <Button
      type="button"
      variant="primary"
      size={decisionSize}
      disabled={checking}
      onClick={() => finish("declined")}
      {...(compact ? { "aria-describedby": noSignId } : {})}
    >
      {sign.verdict.blocked.primary}
    </Button>
  );
  const overrideBlocked = (
    <Button
      ref={overrideTrigger}
      type="button"
      variant="ghost"
      size={compact ? "sm" : decisionSize}
      disabled={checking}
      onClick={openOverride}
      {...(compact ? { className: "justify-self-start" } : {})}
    >
      {sign.verdict.blocked.secondary}
    </Button>
  );

  const countdown = counted(left, sign.countdown.label, sign.countdown.labelOne, {
    seconds: String(left),
  });

  // One status region for the whole life of the request, so each change is spoken.
  return (
    <article ref={article} aria-labelledby={titleId} className={cx(frame, compact && CLEAR_FOOT)}>
      <p role="status" className="sr-only">
        {said}
      </p>
      {phase.kind === "result" ? (
        <>
          <h1 id={titleId} className="sr-only">
            {sign.header.title}
          </h1>
          <Result
            outcome={phase.outcome}
            block={phase.block}
            againLabel={againLabel ?? common.actions.back}
            {...(onAgain ? { onAgain } : {})}
          />
        </>
      ) : (
        <>
          <header className="grid gap-3 px-5 pt-6 pb-5 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={T.label}>{sign.header.title}</p>
              <Tag tone="network" size="sm">
                {common.networks[network].label}
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
            {compact ? <VerdictLine request={request} checking={checking} /> : null}
          </header>

          {compact && phase.kind === "override" ? (
            <div className="border-t border-[color:var(--rule-strong)] px-5 py-5">
              {overridePanel}
            </div>
          ) : null}

          {notice ? (
            <div className="border-t border-[color:var(--rule)] px-5 py-5 md:px-6">{notice}</div>
          ) : null}

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
            {verdictArt && !checking ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <Verdict request={request} checking={checking} short={compact} />
                {verdictArt}
              </div>
            ) : (
              <Verdict request={request} checking={checking} short={compact} />
            )}
            {!checking && !unreachable ? (
              <div className="grid gap-1 border-t border-[color:var(--rule)] pt-3 text-sm">
                <p>
                  <span className="text-[color:var(--fg-muted)]">
                    {sign.verdict.checkedBy.label}:{" "}
                  </span>
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
                          <p className="text-base font-medium text-[color:var(--fg)]">
                            {row.label}
                          </p>
                          {row.detail ? <p className={T.small}>{row.detail}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {rows.length > 0 && editRules ? editRules(sign.rules.edit, RULES_LINK) : null}
                </Section>
              ) : null}

              {blocked ? (
                <Section title={sign.verdict.blocked.fix.title}>
                  <p className="text-base text-[color:var(--fg)]">{fixFor(request)}</p>
                </Section>
              ) : null}

              <Section title={sign.raw.title}>
                <details className="group">
                  <summary className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-2 text-sm font-medium text-[color:var(--fg)] [&::-webkit-details-marker]:hidden">
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

          <footer
            ref={foot}
            className={
              compact
                ? "sticky bottom-0 z-10 grid gap-2.5 border-t border-[color:var(--rule-strong)] bg-[color:var(--ground)] px-5 pt-3 pb-3"
                : "grid gap-4 border-t border-[color:var(--rule-strong)] px-5 py-5 md:px-6"
            }
          >
            {phase.kind === "signing" ? (
              <p
                ref={signingStatus}
                tabIndex={-1}
                className={`font-display text-xl font-extrabold uppercase text-[color:var(--fg)] ${FOCUS_TARGET}`}
              >
                {stepWords(phase.step)}
              </p>
            ) : phase.kind === "override" ? (
              // Compact: the explanation scrolls with the request; only the hold stays pinned.
              compact ? (
                <HoldButton onHeld={() => startSigning("overridden")} />
              ) : (
                overridePanel
              )
            ) : (
              <>
                {blocked ? (
                  <p id={noSignId} className={compact ? "sr-only" : T.small}>
                    {sign.verdict.blocked.noSign}
                  </p>
                ) : null}
                <div className={decisionGrid}>
                  {request.verdict === "safe" || request.verdict === "caution" ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size={decisionSize}
                        disabled={checking}
                        onClick={() => finish("declined")}
                      >
                        {sign.verdict.safe.secondary}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size={decisionSize}
                        disabled={checking}
                        onClick={() => startSigning("sent")}
                      >
                        {sign.verdict.safe.primary}
                      </Button>
                    </>
                  ) : blocked ? (
                    compact ? (
                      // Compact: Decline first, in the tab order as on screen.
                      <>
                        {declineBlocked}
                        {overrideBlocked}
                      </>
                    ) : (
                      <>
                        {overrideBlocked}
                        {declineBlocked}
                      </>
                    )
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size={decisionSize}
                        disabled={checking}
                        onClick={() => finish("declined")}
                      >
                        {sign.verdict.unreachable.secondary}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size={decisionSize}
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
                      ref={overrideTrigger}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={openOverride}
                    >
                      {sign.verdict.unreachable.override}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
            {compact ? (
              // Compact: the countdown and the surface's note share one line.
              waiting || footnote ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {waiting ? (
                    <>
                      <p
                        className={`font-mono text-xs text-[color:var(--fg)] ${T.num}`}
                        aria-hidden="true"
                      >
                        {countdown}
                      </p>
                      <p className="sr-only">{sign.countdown.note}</p>
                    </>
                  ) : null}
                  {footnote}
                </div>
              ) : null
            ) : (
              <>
                {waiting ? (
                  <div className="grid gap-1">
                    <p
                      className={`font-mono text-sm text-[color:var(--fg)] ${T.num}`}
                      aria-hidden="true"
                    >
                      {countdown}
                    </p>
                    <p className={T.small}>{sign.countdown.note}</p>
                  </div>
                ) : null}
                {footnote}
              </>
            )}
          </footer>
        </>
      )}
    </article>
  );
}
