import { novaswap } from "@baret/content";
import { Button } from "@baret/ui";
import { type JSX, useId } from "react";
import { T } from "../../shared/type.js";
import { format, parseAmount, quote, SAMPLE } from "./sample.js";

/**
 * The swap form, NovaSwap's focal point. One input (MON), the quote at the
 * fixed test rate, the route rows from the copy, and the main button. The
 * button hands the request to Baret's panel instead of a wallet.
 */

const { panel } = novaswap.site;

export function SwapCard({
  amount,
  onAmount,
  error,
  onReview,
}: {
  amount: string;
  onAmount: (value: string) => void;
  error: string | null;
  onReview: () => void;
}): JSX.Element {
  const inputId = useId();
  const errorId = useId();
  const mon = parseAmount(amount);
  const receive = mon === null ? "0.00" : format(quote(mon));
  const [pay, get, ...rest] = panel.rows;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onReview();
      }}
      className="grid gap-5 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-6 md:p-8"
    >
      <h2 className={`${T.h3} text-[color:var(--fg)]`}>{panel.title}</h2>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={inputId} className={T.label}>
            {pay?.label}
          </label>
          <span className={T.small}>
            {panel.balance} {format(SAMPLE.balance)} MON
          </span>
        </div>
        <div className="flex items-stretch border border-[color:var(--control-edge)] bg-[color:var(--ground)] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-solid focus-within:outline-[color:var(--focus)]">
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder={panel.input}
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            aria-invalid={error ? true : undefined}
            {...(error ? { "aria-describedby": errorId } : {})}
            className="w-0 min-w-0 flex-1 bg-transparent px-4 py-4 font-display text-3xl font-extrabold tabular-nums text-[color:var(--fg)] outline-none placeholder:text-base placeholder:font-sans placeholder:font-normal placeholder:text-[color:var(--fg-faint)]"
          />
          <button
            type="button"
            onClick={() => onAmount(String(SAMPLE.balance))}
            className="px-4 font-mono text-label uppercase text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
          >
            {panel.max}
          </button>
          <span className="flex items-center border-l border-[color:var(--rule)] px-4 font-display text-lg font-bold uppercase text-[color:var(--fg)]">
            {pay?.value}
          </span>
        </div>
        {error ? (
          <p id={errorId} className="text-sm font-medium text-[color:var(--blocked)]">
            {error}
          </p>
        ) : null}
      </div>

      <dl className="grid gap-0 border-t border-[color:var(--rule)]">
        <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--rule)] py-3">
          <dt className={T.small}>{get?.label}</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums text-[color:var(--fg)]">
            {receive} <span className="text-base font-bold">{get?.value}</span>
          </dd>
        </div>
        {rest.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b border-[color:var(--rule)] py-3"
          >
            <dt className={T.small}>{row.label}</dt>
            <dd className="text-sm text-[color:var(--fg)]">{row.value}</dd>
          </div>
        ))}
      </dl>

      <Button type="submit" variant="primary" size="lg" className="w-full">
        {panel.cta}
      </Button>
      <p className={T.small}>{panel.note}</p>
    </form>
  );
}
