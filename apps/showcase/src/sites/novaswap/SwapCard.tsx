import { novaswap } from "@baret/content";
import { Button } from "@baret/ui";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId, useRef } from "react";
import { AttackSwitch } from "../kit/AttackSwitch.js";
import { balanceOf, format, parseAmount, quote, quoteBack } from "./sample.js";

/**
 * The swap form, NovaSwap's focal point. One input, the quote at the fixed
 * test rate, the route rows from the copy, and the main button, which hands
 * the request to Baret's panel instead of a wallet.
 *
 * Honest, the card buys dUSDC with MON. In the attack it sells dUSDC and its
 * button asks to "enable trading", the unlimited allowance. The switch at
 * the bottom flips between the two and stays in step with Baret's strip.
 */

const { panel, attack } = novaswap.site;

export function SwapCard({
  mode,
  onMode,
  amount,
  onAmount,
  error,
  onReview,
  live = false,
}: {
  mode: DemoMode;
  onMode: (mode: DemoMode) => void;
  amount: string;
  onAmount: (value: string) => void;
  error: string | null;
  /** False when the amount is refused, so the card can move focus to it. */
  onReview: () => boolean;
  /** Live mode: no wallet to read yet, so no balance and no Max. */
  live?: boolean;
}): JSX.Element {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const danger = mode === "danger";
  const card = danger ? attack : panel;
  const value = parseAmount(amount);
  const receive = value === null ? "0.00" : format(danger ? quoteBack(value) : quote(value));
  const balance = balanceOf(mode);
  const [pay, get, ...rest] = card.rows;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // A refused amount moves focus to the input, which reads out its error.
        if (!onReview()) inputRef.current?.focus();
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
            {live ? novaswap.live.balance : `${panel.balance} ${format(balance)} ${pay?.value}`}
          </span>
        </div>
        <div className="flex items-stretch border border-[color:var(--control-edge)] bg-[color:var(--ground)] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-solid focus-within:outline-[color:var(--focus)]">
          <input
            ref={inputRef}
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            placeholder={card.input}
            value={amount}
            onChange={(event) => onAmount(event.target.value)}
            aria-invalid={error ? true : undefined}
            {...(error ? { "aria-describedby": errorId } : {})}
            className="w-0 min-w-0 flex-1 bg-transparent px-4 py-4 font-display text-3xl font-extrabold tabular-nums text-[color:var(--fg)] outline-none placeholder:text-base placeholder:font-sans placeholder:font-normal placeholder:text-[color:var(--fg-muted)]"
          />
          {live ? null : (
            <button
              type="button"
              onClick={() => onAmount(String(balance))}
              className="px-4 font-mono text-label uppercase text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
            >
              {panel.max}
            </button>
          )}
          {/* Token symbols keep their own case: dUSDC is not DUSDC. */}
          <span className="flex items-center border-l border-[color:var(--rule)] px-4 font-display text-lg font-bold text-[color:var(--fg)]">
            {pay?.value}
          </span>
        </div>
        {/* Always mounted, so the error is announced when it appears. */}
        <p
          id={errorId}
          aria-live="polite"
          className="text-sm font-medium text-[color:var(--blocked)] empty:hidden"
        >
          {error}
        </p>
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
        {card.cta}
      </Button>
      <p className={T.small}>{card.note}</p>

      <AttackSwitch
        label={attack.switch.label}
        description={danger ? attack.switch.on : attack.switch.off}
        on={danger}
        onToggle={(on) => onMode(on ? "danger" : "safe")}
      />
    </form>
  );
}
