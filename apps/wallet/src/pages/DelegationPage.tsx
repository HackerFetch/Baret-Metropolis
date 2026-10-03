import { common, delegation, policies, send } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block, Empty, Problem, Rows } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount, day, when } from "@baret/wallet-ui/data/format";
import { ADDRESS } from "@baret/wallet-ui/data/sample";
import { free, reserved, useWallet } from "@baret/wallet-ui/data/store";
import type { Merchant } from "@baret/wallet-ui/data/types";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { ImgWell } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { WALLET_ART } from "../assets.js";
import {
  type MerchantForm,
  type MerchantIssue,
  merchantFrom,
  SAMPLE_AGENT_KEY,
  vaultAmount,
  withdrawable,
} from "../delegation/vault.js";

/**
 * Agent delegation: a PaymentGuard vault and a key only the agent uses. In
 * the content's order: why not hand over your key, who can do what, the four
 * steps, the vault and its reserve, the merchants with their caps (and what
 * the vault refuses), the agent key and its handover, stopping the agent in
 * a section of its own, and the agent's payments. Each change here would be
 * a transaction signed with the passkey; in the sample it changes the
 * account at once.
 */

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
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
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
        inputMode={mono ? "text" : "decimal"}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        {...(hint || error ? { "aria-describedby": hintId } : {})}
        className={`${INPUT} ${mono ? "font-mono text-sm" : "font-mono text-base tabular-nums"}`}
      />
      {hint || error ? (
        <p
          id={hintId}
          className={error ? "text-sm font-medium text-[color:var(--blocked)]" : T.small}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

function MerchantRow({ merchant }: { merchant: Merchant }): JSX.Element {
  const { dispatch } = useWallet();
  const cols = merchants.columns;
  return (
    <li className="grid gap-4 border-b border-[color:var(--rule)] py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <p className="font-display text-xl font-bold text-[color:var(--fg)]">{merchant.origin}</p>
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            dispatch({
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
          size="sm"
          onClick={() =>
            dispatch({ type: "merchantStatus", address: merchant.address, status: "removed" })
          }
        >
          {merchants.actions.remove}
        </Button>
      </div>
    </li>
  );
}

function AddMerchant({ onDone }: { onDone: () => void }): JSX.Element {
  const { dispatch } = useWallet();
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
          {fill(merchants.mandate.body, { merchant: review.address })}
        </p>
        <Rows
          rows={[
            {
              label: rows.merchant,
              value: <code className="font-mono">{truncateAddress(review.address)}</code>,
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
          {fill(merchants.mandate.note, { merchant: truncateAddress(review.address) })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              dispatch({ type: "merchant", merchant: review });
              onDone();
            }}
          >
            {merchants.mandate.action.label}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setReview(null)}>
            {common.actions.back}
          </Button>
        </div>
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
  const dialogTitle = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [money, setMoney] = useState("");
  const [moneyIssue, setMoneyIssue] = useState<"invalid" | "reserved" | null>(null);
  const [adding, setAdding] = useState(false);
  const [keyPhase, setKeyPhase] = useState<"idle" | "creating" | "registering">("idle");
  const [revealed, setRevealed] = useState(false);
  const [said, setSaid] = useState("");
  const { vault } = state;
  const listed = vault.merchants.filter((m) => m.status !== "removed");

  // Creating the key: the passkey prompt, then the transaction that registers it.
  useEffect(() => {
    if (keyPhase === "idle") return;
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
  }, [keyPhase, dispatch]);

  function move(kind: "deposit" | "withdraw"): void {
    const value = vaultAmount(money);
    if (!value) {
      setMoneyIssue("invalid");
      return;
    }
    if (kind === "withdraw" && withdrawable(vault, money) !== "ok") {
      setMoneyIssue("reserved");
      return;
    }
    dispatch({ type: kind, amount: value });
    setMoney("");
    setMoneyIssue(null);
  }

  return (
    <Screen title={delegation.title} body={delegation.body} picture={WALLET_ART.vault}>
      <div className="grid gap-12">
        <p role="status" className="sr-only">
          {said}
        </p>

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
          {vault.balance === "0.00" ? (
            <Empty title={vaultWords.empty.title} body={vaultWords.empty.body} />
          ) : null}
          <dl className="grid gap-6 sm:grid-cols-3">
            {(
              [
                [vaultWords.balance, vault.balance],
                [vaultWords.reserved, reserved(vault)],
                [vaultWords.free, free(vault)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="grid gap-1 border-t border-[color:var(--rule)] pt-3">
                <dt className={T.small}>{label}</dt>
                <dd className="font-display text-4xl font-extrabold tabular-nums text-[color:var(--fg)]">
                  {amount(value, 6)} <span className="text-lg">{ASSET}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className={T.small}>
            {fill(vaultWords.reservedNote, { amount: amount(reserved(vault), 6), asset: ASSET })}
          </p>
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
                className={`${INPUT} min-w-[10rem] flex-1 font-mono tabular-nums`}
              />
              <Button type="button" variant="ghost" onClick={() => move("deposit")}>
                {vaultWords.deposit.label}
              </Button>
              <Button type="button" variant="ghost" onClick={() => move("withdraw")}>
                {vaultWords.withdraw.label}
              </Button>
            </div>
            {moneyIssue === "invalid" ? (
              <p className="text-sm font-medium text-[color:var(--blocked)]">
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
          </div>
        </Block>

        <Block
          title={merchants.title}
          aside={
            adding ? null : (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
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
                        size="sm"
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
                <p className={`${T.body} max-w-[60ch]`}>{agentKey.handover.body}</p>
                {revealed ? (
                  <div className="grid gap-2">
                    <code className="block border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-3 font-mono text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]">
                      {SAMPLE_AGENT_KEY}
                    </code>
                    <div className="-ml-2 flex">
                      <CopyButton
                        text={SAMPLE_AGENT_KEY}
                        label={agentKey.handover.copy}
                        done={agentKey.handover.copied}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevealed(true)}
                    >
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
              <div className="flex">
                <Button
                  type="button"
                  variant="primary"
                  disabled={keyPhase !== "idle"}
                  onClick={() => setKeyPhase("creating")}
                >
                  {agentKey.none.action.label}
                </Button>
              </div>
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
              <Button type="button" variant="danger" onClick={() => dialog.current?.showModal()}>
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
                  <span className="text-base text-[color:var(--fg)]">
                    {fill(activity.row, {
                      amount: amount(payment.amount, 6),
                      asset: ASSET,
                      merchant: payment.merchant,
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
                dispatch({ type: "revokeAgent", at: new Date().toISOString() });
                setRevealed(false);
                setSaid(revoke.done);
                dialog.current?.close();
              }}
            >
              {revoke.confirm.action}
            </Button>
          </div>
        </div>
      </dialog>
    </Screen>
  );
}
