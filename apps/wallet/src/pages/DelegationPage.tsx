import { common, delegation, policies, send, sign, walletFrame } from "@baret/content";
import { Button, Meter, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block, Empty, Problem, Rows } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { unreachable } from "@baret/wallet-ui/data/analyze";
import { amount, day, when } from "@baret/wallet-ui/data/format";
import { ADDRESS } from "@baret/wallet-ui/data/sample";
import {
  canDeposit,
  canWithdraw,
  free,
  ready,
  reserved,
  useWallet,
} from "@baret/wallet-ui/data/store";
import type { Merchant, SignRequest as Request, Vault } from "@baret/wallet-ui/data/types";
import { SignRequest } from "@baret/wallet-ui/sign/SignRequest";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { ImgWell } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { createContext, type JSX, use, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { WALLET_ART } from "../assets.js";
import {
  type MerchantForm,
  type MerchantIssue,
  merchantFrom,
  SAMPLE_AGENT_KEY,
  vaultAmount,
  withdrawable,
} from "../delegation/vault.js";
import { type LiveRequest, type LiveStep, type StepBuilder, useLive } from "../live/live.js";
import { sessionTime } from "../live/session.js";
import { signWithSettings } from "../live/signWithSettings.js";
import { routes } from "../routes.js";

/**
 * Agent delegation: a PaymentGuard vault and a key only the agent uses. In
 * the content's order: why not hand over your key, who can do what, the four
 * steps, the vault and its reserve, the merchants with their caps (and what
 * the vault refuses), the agent key and its handover, stopping the agent in
 * a section of its own, and the agent's payments. On the sample each change
 * alters the account at once. Live, each change is one or two transactions,
 * and each is put in front of the owner as a sign request Baret has checked
 * (`start`): nothing on this page signs by itself, and the figures are read
 * again from Monad afterwards.
 */

/** Live: starts a vault change as a run of sign requests. Null on the sample. */
const FlowContext = createContext<((steps: StepBuilder[]) => void) | null>(null);

/** Live: true while a change is open; every other vault trigger waits for it. */
const BusyContext = createContext(false);

/** A 0x address, as the contract takes it. */
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * A merchant as the reader knows it: the name given on this device, or the
 * shortened address when there is none (the contract stores no names).
 */
function merchantName(merchant: Pick<Merchant, "address" | "origin">): string {
  const name = merchant.origin.trim();
  return name && name.toLowerCase() !== merchant.address.toLowerCase()
    ? name
    : truncateAddress(merchant.address);
}

/** An agent payment's merchant, named the same way as the merchant list does. */
function payee(vault: Vault, merchant: string): string {
  const listed = vault.merchants.find((m) => m.address.toLowerCase() === merchant.toLowerCase());
  if (listed) return merchantName(listed);
  return ADDRESS_PATTERN.test(merchant) ? truncateAddress(merchant) : merchant;
}

/** Shown under triggers that wait while a change is open. */
function BusyNote(): JSX.Element | null {
  return use(BusyContext) ? <p className={T.small}>{delegation.flow.busy}</p> : null;
}

const {
  explainer,
  model,
  steps,
  vault: vaultWords,
  merchants,
  agentKey,
  revoke,
  activity,
} = delegation;
const ASSET = "USDC";

const INPUT =
  "w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 py-2.5 text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)]";

function Field({
  label,
  hint,
  value,
  onChange,
  mono = false,
  text = false,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  /** Plain words (a name), not an amount or an address. */
  text?: boolean;
  error?: string | null;
}): JSX.Element {
  const id = useId();
  const hintId = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[color:var(--fg)]">
        {label}
      </label>
      <input
        id={id}
        value={value}
        spellCheck={false}
        autoComplete="off"
        inputMode={mono || text ? "text" : "decimal"}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        {...(hint || error ? { "aria-describedby": hintId } : {})}
        className={`${INPUT} ${
          text ? "text-base" : mono ? "font-mono text-sm" : "font-mono text-base tabular-nums"
        }`}
      />
      {hint || error ? (
        <p
          id={hintId}
          className={error ? "text-sm font-medium text-[color:var(--blocked-ink)]" : T.small}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

function MerchantRow({ merchant }: { merchant: Merchant }): JSX.Element {
  const { dispatch } = useWallet();
  const live = useLive();
  const start = use(FlowContext);
  const busy = use(BusyContext);
  const cols = merchants.columns;
  return (
    <li className="grid gap-4 border-b border-[color:var(--rule)] py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <p className="font-display text-xl font-bold text-[color:var(--fg)] [overflow-wrap:anywhere]">
            {merchantName(merchant)}
          </p>
          <code className="font-mono text-sm text-[color:var(--fg-muted)]">
            {truncateAddress(merchant.address)}
          </code>
        </div>
        <Tag tone="neutral" size="sm">
          {merchants.status[merchant.status]}
        </Tag>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        {(
          [
            [cols.perPayment, `${amount(merchant.perPayment, 6)} ${ASSET}`],
            [
              cols.perHour,
              merchant.perHour ? `${amount(merchant.perHour, 6)} ${ASSET}` : policies.values.none,
            ],
            [cols.perDay, `${amount(merchant.perDay, 6)} ${ASSET}`],
            [cols.spent, `${amount(merchant.spent, 6)} ${ASSET}`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="grid gap-0.5">
            <dt className={T.label}>{label}</dt>
            <dd className={`text-base text-[color:var(--fg)] ${T.num}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {/* Spent against the daily cap; the figures above say the same in words. */}
      <Meter value={Number(merchant.spent) || 0} max={Number(merchant.perDay) || 0} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            live && start
              ? start(live.vault.pause(merchant.address, merchant.status !== "paused"))
              : dispatch({
                  type: "merchantStatus",
                  address: merchant.address,
                  status: merchant.status === "paused" ? "active" : "paused",
                })
          }
        >
          {merchant.status === "paused" ? merchants.actions.resume : merchants.actions.pause}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={busy}
          onClick={() =>
            live && start
              ? start(live.vault.remove(merchant.address))
              : dispatch({ type: "merchantStatus", address: merchant.address, status: "removed" })
          }
        >
          {merchants.actions.remove}
        </Button>
      </div>
      <BusyNote />
    </li>
  );
}

function AddMerchant({ onDone }: { onDone: () => void }): JSX.Element {
  const { dispatch } = useWallet();
  const live = useLive();
  const start = use(FlowContext);
  const busy = use(BusyContext);
  const [form, setForm] = useState<MerchantForm>({
    address: "",
    origin: "",
    perPayment: "",
    perHour: "",
    perDay: "",
  });
  const [issue, setIssue] = useState<MerchantIssue | null>(null);
  const [review, setReview] = useState<Merchant | null>(null);
  const words = merchants.form;
  const set = (key: keyof MerchantForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIssue(null);
  };
  const amountError = send.errors.amountZero.title;

  if (review) {
    const rows = merchants.mandate.rows;
    return (
      <div className="grid gap-5 border-2 border-[color:var(--fg)] p-5 md:p-6">
        <p className="font-display text-xl font-extrabold uppercase text-[color:var(--fg)]">
          {merchants.mandate.title}
        </p>
        <p className={`${T.body} [overflow-wrap:anywhere]`}>
          {fill(merchants.mandate.body, { merchant: merchantName(review) })}
        </p>
        <Rows
          rows={[
            {
              label: rows.merchant,
              value: (
                <code className="font-mono [overflow-wrap:anywhere]">
                  {truncateAddress(review.address)}
                </code>
              ),
            },
            { label: rows.perPayment, value: `${amount(review.perPayment, 6)} ${ASSET}` },
            {
              label: rows.perHour,
              value: review.perHour
                ? `${amount(review.perHour, 6)} ${ASSET}`
                : policies.values.none,
            },
            { label: rows.perDay, value: `${amount(review.perDay, 6)} ${ASSET}` },
            { label: rows.from, value: rows.fromValue },
            { label: rows.signer, value: rows.signerValue },
          ]}
        />
        <p className={`${T.small} [overflow-wrap:anywhere]`}>
          {fill(merchants.mandate.note, { merchant: merchantName(review) })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() => {
              if (live && start) start(live.vault.merchant(review));
              else dispatch({ type: "merchant", merchant: review });
              onDone();
            }}
          >
            {merchants.mandate.action.label}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setReview(null)}>
            {common.actions.back}
          </Button>
        </div>
        <BusyNote />
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const result = merchantFrom(form);
        if ("issue" in result) setIssue(result.issue);
        else setReview(result.merchant);
      }}
      className="grid gap-5 border border-[color:var(--rule-strong)] p-5 md:p-6"
    >
      <Field
        label={words.address.label}
        hint={words.address.hint}
        value={form.address}
        onChange={set("address")}
        mono
        error={issue === "address" ? send.errors.invalidAddress.title : null}
      />
      <Field
        label={words.origin.label}
        hint={words.origin.hint}
        value={form.origin}
        onChange={set("origin")}
        text
      />
      <div className="grid gap-5 md:grid-cols-3">
        <Field
          label={words.perPayment.label}
          hint={words.perPayment.hint}
          value={form.perPayment}
          onChange={set("perPayment")}
          error={issue === "perPayment" ? amountError : null}
        />
        <Field
          label={words.perHour.label}
          hint={words.perHour.hint}
          value={form.perHour}
          onChange={set("perHour")}
          error={issue === "perHour" ? amountError : null}
        />
        <Field
          label={words.perDay.label}
          hint={words.perDay.hint}
          value={form.perDay}
          onChange={set("perDay")}
          error={issue === "perDay" ? amountError : null}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="ghost">
          {merchants.add}
        </Button>
        <Button type="button" variant="soft" onClick={onDone}>
          {common.actions.cancel}
        </Button>
      </div>
    </form>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const amountId = useId();
  const amountErrorId = useId();
  const dialogTitle = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [money, setMoney] = useState("");
  const [moneyIssue, setMoneyIssue] = useState<
    "invalid" | "reserved" | "balance" | "vaultBalance" | null
  >(null);
  const [adding, setAdding] = useState(false);
  const [keyPhase, setKeyPhase] = useState<"idle" | "creating" | "registering">("idle");
  const [revealed, setRevealed] = useState(false);
  // A passkey prompt for the agent key that gave nothing, shown in the agent key block.
  const [keyProblem, setKeyProblem] = useState<"create" | "reveal" | null>(null);
  // An agent wallet made elsewhere (only its address comes here), and the one registered so.
  const [outside, setOutside] = useState("");
  const [outsideIssue, setOutsideIssue] = useState(false);
  const [external, setExternal] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const { vault } = state;
  const live = useLive();
  // Fail-closed: the figures show only when both the account and the vault were read.
  const vaultRead = ready(state, "balances") && ready(state, "vault");
  const listed = vault.merchants.filter((m) => m.status !== "removed");

  // Live: the vault change in progress, as the sign request of its current step.
  const [flow, setFlow] = useState<{
    readonly steps: readonly StepBuilder[];
    readonly index: number;
    readonly request: Request | null;
    readonly pending: boolean;
    /** Steps already in a block, this one included once `done`. */
    readonly sent: number;
    /** The current step is in a block and is not the last: it waits for Continue. */
    readonly done: boolean;
  } | null>(null);
  // A step that could not be built, kept so Try again builds the same one.
  const [failed, setFailed] = useState<{
    readonly steps: readonly StepBuilder[];
    readonly index: number;
    readonly sent: number;
  } | null>(null);
  // The owner stopped a change part way: what was sent stays, nothing else follows.
  const [stopped, setStopped] = useState(false);
  const [run, setRun] = useState(0);
  const current = useRef<LiveStep | null>(null);
  const signable = useRef<LiveRequest["signable"]>(null);
  /** Set when the current step's transaction is in a block. */
  const sent = useRef(false);
  const section = useRef<HTMLElement>(null);
  const sectionTitle = useId();
  /** The control that started the change; focus goes back to it at the end. */
  const trigger = useRef<HTMLElement | null>(null);
  const returnFocus = useRef(false);
  /** Runs once the first step is on screen (the deposit clears its amount then). */
  const shown = useRef<(() => void) | null>(null);
  /** Read out once the last step is in a block, never before. */
  const announce = useRef<string | null>(null);
  const open = flow !== null || failed !== null;
  // The agent key, shown once after its own passkey prompt; never kept anywhere.
  const [agentSecret, setAgentSecret] = useState<string | null>(null);

  /** Builds step `index`, shows it as Checking, then with Baret's answer. */
  async function load(steps: readonly StepBuilder[], index: number, done: number): Promise<void> {
    const build = steps[index];
    if (!live || !build) return;
    // Continue and Try again unmount the pressed button: the section, which
    // stays, takes focus first. (On the first step it is not mounted yet.)
    section.current?.focus({ preventScroll: true });
    signable.current = null;
    setFailed(null);
    setFlow({ steps, index, request: null, pending: true, sent: done, done: false });
    try {
      // Building a step reads Monad; the public RPC refuses bursts, so one
      // more try before the page says the vault cannot be reached.
      const step = await build().catch(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        return build();
      });
      current.current = step;
      setRun((n) => n + 1);
      setFlow({
        steps,
        index,
        request: unreachable(step.context),
        pending: true,
        sent: done,
        done: false,
      });
      shown.current?.();
      shown.current = null;
      const answer = await live.recheck(step.context, step.call);
      signable.current = answer.signable;
      setFlow({ steps, index, request: answer.request, pending: false, sent: done, done: false });
    } catch {
      // The step could not be built (Monad did not answer): nothing was signed.
      setFlow(null);
      setFailed({ steps, index, sent: done });
    }
  }

  function start(steps: StepBuilder[], onShown?: () => void): void {
    const active = document.activeElement;
    trigger.current = active instanceof HTMLElement ? active : null;
    shown.current = onShown ?? null;
    setStopped(false);
    void load(steps, 0, 0);
  }

  /** Ends the change; `done` of `total` steps were sent. */
  function close(done: number, total: number): void {
    setFlow(null);
    setFailed(null);
    setKeyPhase("idle");
    shown.current = null;
    announce.current = null;
    setStopped(done > 0 && done < total);
    returnFocus.current = true;
  }

  // A change that opens is brought into view and focused; one that ends gives
  // focus back to the control that started it.
  useEffect(() => {
    if (open) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      section.current?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
      section.current?.focus({ preventScroll: true });
      return;
    }
    if (!returnFocus.current) return;
    returnFocus.current = false;
    const back = trigger.current;
    trigger.current = null;
    if (back?.isConnected && !back.hasAttribute("disabled")) back.focus();
  }, [open]);

  // Creating the key: the passkey prompt, then the transaction that registers it.
  useEffect(() => {
    if (live || keyPhase === "idle") return;
    const id = window.setTimeout(() => {
      if (keyPhase === "creating") setKeyPhase("registering");
      else {
        dispatch({
          type: "createAgent",
          address: ADDRESS.agent,
          created: new Date().toISOString(),
        });
        setKeyPhase("idle");
      }
    }, 1100);
    return () => window.clearTimeout(id);
  }, [live, keyPhase, dispatch]);

  /** Live: the agent's key from its own passkey namespace, then the call that registers it. */
  function createAgent(): void {
    setKeyProblem(null);
    setKeyPhase("creating");
    if (!live) return;
    void live.vault.derive().then((key) => {
      if (!key) {
        setKeyPhase("idle");
        setKeyProblem("create");
        return;
      }
      setKeyPhase("registering");
      start(live.vault.agent(key.address));
    });
  }

  /** An agent wallet made elsewhere: only its address is registered, its key never comes here. */
  function authorise(): void {
    const address = outside.trim();
    if (!ADDRESS_PATTERN.test(address)) {
      setOutsideIssue(true);
      return;
    }
    setOutsideIssue(false);
    setExternal(address.toLowerCase());
    if (live) start(live.vault.agent(address), () => setOutside(""));
    else {
      dispatch({ type: "createAgent", address, created: new Date().toISOString() });
      setOutside("");
    }
  }

  /** Live: the key is derived again from the passkey each time it is shown. */
  function reveal(): void {
    setKeyProblem(null);
    if (!live) {
      setRevealed(true);
      return;
    }
    void live.vault.derive().then((key) => {
      if (!key) {
        setKeyProblem("reveal");
        return;
      }
      // Shown only when the passkey gives the key the vault has registered;
      // any other agent holds its own key, and there is none to show.
      if (key.address.toLowerCase() !== vault.agent?.address.toLowerCase()) {
        setExternal(vault.agent?.address.toLowerCase() ?? null);
        return;
      }
      setAgentSecret(key.privateKey);
      setRevealed(true);
    });
  }

  // Live: an open session signs without a prompt, and the request says until when.
  const sessionNote =
    live && state.sessionEndsAt && !state.settings.passkeyEverySignature
      ? fill(sign.session.note, { time: sessionTime(state.sessionEndsAt) })
      : null;

  function move(kind: "deposit" | "withdraw"): void {
    const value = vaultAmount(money);
    if (!value) {
      setMoneyIssue("invalid");
      return;
    }
    // Fail-closed: more than the vault holds, or an unread balance, withdraws nothing.
    if (kind === "withdraw" && !canWithdraw(state, value)) {
      setMoneyIssue("vaultBalance");
      return;
    }
    if (kind === "withdraw" && withdrawable(vault, money) !== "ok") {
      setMoneyIssue("reserved");
      return;
    }
    // Fail-closed: more than the account holds, or an unread balance, deposits nothing.
    if (kind === "deposit" && !canDeposit(state, value)) {
      setMoneyIssue("balance");
      return;
    }
    setMoneyIssue(null);
    // Live: the amount stays typed until the first step is on screen.
    if (live) {
      start(kind === "deposit" ? live.vault.deposit(value) : live.vault.withdraw(value), () =>
        setMoney(""),
      );
      return;
    }
    dispatch({ type: kind, amount: value });
    setMoney("");
  }

  return (
    <FlowContext value={live ? start : null}>
      <BusyContext value={open}>
        <Screen title={delegation.title} body={delegation.body} picture={WALLET_ART.vault}>
          <div className="grid gap-12">
            <p role="status" className="sr-only">
              {said}
            </p>

            {stopped ? <p className={`${T.body} max-w-[60ch]`}>{delegation.flow.stopped}</p> : null}
            {/* Live: the change in progress, one sign request per transaction. */}
            {live && open ? (
              <section
                ref={section}
                tabIndex={-1}
                aria-labelledby={sectionTitle}
                className="grid max-w-[640px] scroll-mt-24 gap-4 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)]"
              >
                <h2 id={sectionTitle} className="sr-only">
                  {delegation.flow.label}
                </h2>
                {flow && flow.steps.length > 1 ? (
                  <p className={T.label}>
                    {fill(delegation.flow.step, {
                      current: String(flow.index + 1),
                      total: String(flow.steps.length),
                    })}
                  </p>
                ) : null}
                <p role="status" className={flow && !flow.request ? T.body : "sr-only"}>
                  {flow && !flow.request ? delegation.flow.preparing : ""}
                </p>
                {failed ? (
                  <Problem
                    title={delegation.errors.vault.title}
                    body={delegation.errors.vault.body}
                    action={
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void load(failed.steps, failed.index, failed.sent)}
                        >
                          {delegation.errors.vault.action.label}
                        </Button>
                        {/* A step that keeps failing must not trap the page: stop ends the change. */}
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => close(failed.sent, failed.steps.length)}
                        >
                          {delegation.flow.stop}
                        </Button>
                      </div>
                    }
                  />
                ) : null}
                {flow?.request ? (
                  <SignRequest
                    key={run}
                    request={flow.request}
                    pending={flow.pending}
                    onCheckAgain={async () => {
                      const step = current.current;
                      if (!step) return null;
                      const answer = await live.recheck(step.context, step.call);
                      signable.current = answer.signable;
                      return answer.request;
                    }}
                    onSign={async (outcome, sending, progress) => {
                      const cleared = signable.current;
                      if (!cleared) throw new Error("nothing was cleared to sign");
                      const receipt = await signWithSettings(
                        live,
                        state.settings.passkeyEverySignature,
                        cleared,
                        outcome,
                        sending,
                        progress,
                      );
                      sent.current = true;
                      return receipt;
                    }}
                    explorer={(hash) => `${walletFrame.links.explorer}/tx/${hash}`}
                    // The wallet does not sign a block: the way past is the rule.
                    canOverride={false}
                    {...(sessionNote ? { sessionNote } : {})}
                    // KIMI words a checked answer only: its id is Baret's requestId.
                    // An unreachable one is passed too, so a Check again that
                    // succeeds is worded; SignRequest asks about the request it
                    // shows and never about an unreachable one.
                    {...(!flow.pending ? { explainId: flow.request.id } : {})}
                    passkey={state.settings.passkeyEverySignature}
                    onDecline={() => close(flow.sent, flow.steps.length)}
                    onAgain={() => close(flow.sent, flow.steps.length)}
                    onLog={(item) => {
                      dispatch({ type: "log", item });
                      // A step in a block waits on its result: the next one starts
                      // only when the owner continues, and the last one ends the change.
                      if (!sent.current) return;
                      sent.current = false;
                      const done = flow.sent + 1;
                      const last = flow.index + 1 >= flow.steps.length;
                      setFlow({ ...flow, sent: done, done: !last });
                      if (last && announce.current) {
                        setSaid(announce.current);
                        announce.current = null;
                      }
                    }}
                    editRules={(label, className) => (
                      <Link to={routes.policies.path} className={className}>
                        {label}
                      </Link>
                    )}
                  />
                ) : null}
                {flow?.done ? (
                  <div className="flex">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void load(flow.steps, flow.index + 1, flow.sent)}
                    >
                      {fill(delegation.flow.next, { next: String(flow.index + 2) })}
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            <Block title={explainer.title}>
              <p className={`${T.lead} max-w-[56ch]`}>{explainer.body}</p>
              <ul className="grid gap-6 border-t border-[color:var(--rule)] pt-5 sm:grid-cols-3 sm:gap-6">
                {explainer.points.map((point) => (
                  <li key={point.title} className="grid content-start gap-1">
                    <p className={`${T.h3} text-[color:var(--fg)]`}>{point.title}</p>
                    <p className={T.small}>{point.body}</p>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title={model.title}>
              <div className="grid gap-8 md:grid-cols-12 md:gap-8">
                <div className="grid content-start gap-4 md:col-span-7">
                  <dl className="grid border-t border-[color:var(--rule)]">
                    {model.rows.map((row) => (
                      <div
                        key={row.label}
                        className="grid gap-1 border-b border-[color:var(--rule)] py-3"
                      >
                        <dt className={T.label}>{row.label}</dt>
                        <dd className="text-base text-[color:var(--fg)]">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={T.body}>{model.subKey}</p>
                </div>
                <ImgWell
                  asset={WALLET_ART.subKey}
                  ratio="4/3"
                  dim
                  sizes="(min-width: 768px) 380px, 100vw"
                  className="border border-[color:var(--rule)] md:col-span-5"
                />
              </div>
            </Block>

            <Block title={steps.title}>
              <ol className="grid gap-6 md:grid-cols-4 md:gap-6">
                {steps.items.map((item, i) => (
                  <li
                    key={item.title}
                    className="grid content-start gap-2 border-t-2 border-[color:var(--fg)] pt-3"
                  >
                    <p className={T.label}>
                      <span className={T.num}>{i + 1}</span> {item.short}
                    </p>
                    <p className="font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
                      {item.title}
                    </p>
                    <p className={T.small}>{item.body}</p>
                  </li>
                ))}
              </ol>
            </Block>

            <Block title={vaultWords.title}>
              {/* Fail-closed: an unread vault shows no figures, not a stale or zero balance. */}
              {vaultRead ? null : (
                <Problem
                  title={delegation.errors.vault.title}
                  body={delegation.errors.vault.body}
                />
              )}
              {vaultRead && vault.balance === "0.00" ? (
                <Empty title={vaultWords.empty.title} body={vaultWords.empty.body} />
              ) : null}
              {vaultRead ? (
                <>
                  <dl className="grid gap-6 sm:grid-cols-3">
                    {(
                      [
                        [vaultWords.balance, vault.balance],
                        [vaultWords.reserved, reserved(vault)],
                        [vaultWords.free, free(vault)],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="grid gap-1 border-t border-[color:var(--rule)] pt-3"
                      >
                        <dt className={T.small}>{label}</dt>
                        <dd className="font-display text-4xl font-extrabold tabular-nums text-[color:var(--fg)]">
                          {amount(value, 6)} <span className="text-lg">{ASSET}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className={T.small}>
                    {fill(vaultWords.reservedNote, {
                      amount: amount(reserved(vault), 6),
                      asset: ASSET,
                    })}
                  </p>
                </>
              ) : null}
              <div className="grid max-w-[520px] gap-2">
                <label htmlFor={amountId} className="text-sm font-medium text-[color:var(--fg)]">
                  {vaultWords.amount.label}
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id={amountId}
                    inputMode="decimal"
                    autoComplete="off"
                    value={money}
                    onChange={(event) => {
                      setMoney(event.target.value);
                      setMoneyIssue(null);
                    }}
                    aria-invalid={moneyIssue ? true : undefined}
                    aria-describedby={moneyIssue ? amountErrorId : undefined}
                    className={`${INPUT} min-w-[10rem] flex-1 font-mono tabular-nums`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={open}
                    onClick={() => move("deposit")}
                  >
                    {vaultWords.deposit.label}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={open}
                    onClick={() => move("withdraw")}
                  >
                    {vaultWords.withdraw.label}
                  </Button>
                </div>
                <BusyNote />
                <div id={amountErrorId}>
                  {moneyIssue === "invalid" ? (
                    <p role="alert" className="text-sm font-medium text-[color:var(--blocked-ink)]">
                      {send.errors.amountZero.title}
                    </p>
                  ) : null}
                  {moneyIssue === "reserved" ? (
                    <Problem
                      title={delegation.errors.reserved.title}
                      body={fill(delegation.errors.reserved.body, {
                        amount: amount(reserved(vault), 6),
                        asset: ASSET,
                      })}
                    />
                  ) : null}
                  {moneyIssue === "balance" ? (
                    <Problem
                      title={delegation.errors.balance.title}
                      body={fill(delegation.errors.balance.body, { asset: ASSET })}
                    />
                  ) : null}
                  {moneyIssue === "vaultBalance" ? (
                    <Problem
                      title={delegation.errors.vaultBalance.title}
                      body={fill(delegation.errors.vaultBalance.body, { asset: ASSET })}
                    />
                  ) : null}
                </div>
              </div>
            </Block>

            <Block
              title={merchants.title}
              aside={
                adding ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={open}
                    onClick={() => setAdding(true)}
                  >
                    {merchants.add}
                  </Button>
                )
              }
            >
              {adding ? <AddMerchant onDone={() => setAdding(false)} /> : null}
              {listed.length === 0 ? (
                <Empty
                  title={merchants.empty.title}
                  body={merchants.empty.body}
                  {...(adding
                    ? {}
                    : {
                        action: (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={open}
                            onClick={() => setAdding(true)}
                          >
                            {merchants.empty.action.label}
                          </Button>
                        ),
                      })}
                />
              ) : (
                <ul className="grid border-t border-[color:var(--rule)]">
                  {listed.map((merchant) => (
                    <MerchantRow key={merchant.address} merchant={merchant} />
                  ))}
                </ul>
              )}
              <div className="grid gap-3 border-l-4 border-[color:var(--fg)] pl-4">
                <p className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
                  {merchants.refuses.title}
                </p>
                <ul className="grid gap-1.5">
                  {merchants.refuses.points.map((point) => (
                    <li key={point} className="text-base text-[color:var(--fg)]">
                      {point}
                    </li>
                  ))}
                </ul>
                <p className={T.small}>{merchants.refuses.note}</p>
              </div>
            </Block>

            <Block title={agentKey.title}>
              {vault.agent ? (
                <div className="grid gap-5">
                  <div className="grid gap-1">
                    <p className="font-display text-2xl font-extrabold uppercase text-[color:var(--fg)]">
                      {agentKey.active.title}
                    </p>
                    <p className={T.body}>
                      {fill(agentKey.active.body, {
                        date: day(vault.agent.created),
                        count: String(vault.agent.payments),
                      })}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className={T.label}>{agentKey.active.address}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
                        {vault.agent.address}
                      </code>
                    </div>
                  </div>
                  <div className="grid gap-3 border-t border-[color:var(--rule)] pt-5">
                    <p className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
                      {agentKey.handover.title}
                    </p>
                    {external === vault.agent.address.toLowerCase() ? (
                      <p className={`${T.body} max-w-[60ch]`}>{agentKey.handover.external}</p>
                    ) : (
                      <p className={`${T.body} max-w-[60ch]`}>{agentKey.handover.body}</p>
                    )}
                    {keyProblem === "reveal" ? (
                      <Problem
                        body={agentKey.errors.cancelled.body}
                        action={
                          <Button type="button" variant="ghost" onClick={reveal}>
                            {agentKey.errors.cancelled.action.label}
                          </Button>
                        }
                      />
                    ) : null}
                    {external === vault.agent.address.toLowerCase() ? null : revealed ? (
                      <div className="grid gap-2">
                        <code className="block border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-3 font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
                          {agentSecret ?? SAMPLE_AGENT_KEY}
                        </code>
                        <div className="-ml-2 flex">
                          <CopyButton
                            text={agentSecret ?? SAMPLE_AGENT_KEY}
                            label={agentKey.handover.copy}
                            done={agentKey.handover.copied}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex">
                        <Button type="button" variant="ghost" onClick={reveal}>
                          {agentKey.handover.reveal}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <Empty title={agentKey.none.title} body={agentKey.none.body} />
                  <p role="status" className="text-sm text-[color:var(--fg)]">
                    {keyPhase === "creating"
                      ? agentKey.creating
                      : keyPhase === "registering"
                        ? agentKey.registering
                        : ""}
                  </p>
                  {keyProblem === "create" ? (
                    <Problem
                      title={agentKey.errors.cancelled.title}
                      body={agentKey.errors.cancelled.body}
                      action={
                        <Button type="button" variant="ghost" disabled={open} onClick={createAgent}>
                          {agentKey.errors.cancelled.action.label}
                        </Button>
                      }
                    />
                  ) : null}
                  <div className="flex">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={keyPhase !== "idle" || open}
                      onClick={createAgent}
                    >
                      {agentKey.none.action.label}
                    </Button>
                  </div>
                  <p className={`${T.label} border-t border-[color:var(--rule)] pt-4`}>
                    {agentKey.none.or}
                  </p>
                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      authorise();
                    }}
                    className="grid max-w-[520px] gap-3"
                  >
                    <Field
                      label={agentKey.external.label}
                      hint={agentKey.external.hint}
                      value={outside}
                      onChange={(value) => {
                        setOutside(value);
                        setOutsideIssue(false);
                      }}
                      mono
                      error={outsideIssue ? send.errors.invalidAddress.title : null}
                    />
                    <div className="flex">
                      <Button type="submit" variant="ghost" disabled={keyPhase !== "idle" || open}>
                        {agentKey.external.action.label}
                      </Button>
                    </div>
                  </form>
                  <BusyNote />
                </div>
              )}
            </Block>

            <Block title={revoke.title}>
              <p className={`${T.body} max-w-[60ch]`}>{revoke.body}</p>
              <ul className="grid border-t border-[color:var(--rule)]">
                {revoke.options.map((option) => (
                  <li
                    key={option.label}
                    className="grid gap-1 border-b border-[color:var(--rule)] py-3"
                  >
                    <p className="text-base font-medium text-[color:var(--fg)]">{option.label}</p>
                    <p className={T.small}>{option.hint}</p>
                  </li>
                ))}
              </ul>
              {vault.agent ? (
                <div className="flex">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={open}
                    onClick={() => dialog.current?.showModal()}
                  >
                    {revoke.confirm.action}
                  </Button>
                </div>
              ) : said === revoke.done ? (
                <p className="text-base text-[color:var(--fg)]">{revoke.done}</p>
              ) : null}
            </Block>

            <Block title={activity.title}>
              <p className={T.small}>{activity.body}</p>
              {state.agentPayments.length === 0 ? (
                <Empty title={activity.empty.title} body={activity.empty.body} />
              ) : (
                <ul className="grid border-t border-[color:var(--rule)]">
                  {state.agentPayments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[color:var(--rule)] py-3"
                    >
                      <span className="text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                        {fill(activity.row, {
                          amount: amount(payment.amount, 6),
                          asset: ASSET,
                          merchant: payee(vault, payment.merchant),
                        })}
                      </span>
                      <time
                        dateTime={payment.at}
                        className="font-mono text-sm text-[color:var(--fg-muted)] tabular-nums"
                      >
                        {when(payment.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </div>

          <dialog
            ref={dialog}
            aria-labelledby={dialogTitle}
            className="m-auto w-[min(92vw,520px)] border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-0 text-[color:var(--fg)] backdrop:bg-black/55"
          >
            <div className="grid gap-5 p-6">
              <h2 id={dialogTitle} className={`${T.h3} text-[color:var(--fg)]`}>
                {revoke.confirm.title}
              </h2>
              <p className={T.body}>{revoke.confirm.body}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>
                  {revoke.confirm.cancel}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    // Closed first, so focus is back on the trigger the change returns to.
                    dialog.current?.close();
                    setAgentSecret(null);
                    setRevealed(false);
                    if (live) {
                      // Read out only once the revocation is in a block.
                      setSaid("");
                      start(live.vault.revokeAgent());
                      announce.current = revoke.done;
                    } else {
                      dispatch({ type: "revokeAgent", at: new Date().toISOString() });
                      setSaid(revoke.done);
                    }
                  }}
                >
                  {revoke.confirm.action}
                </Button>
              </div>
            </div>
          </dialog>
        </Screen>
      </BusyContext>
    </FlowContext>
  );
}
