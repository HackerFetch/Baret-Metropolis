import { orbityield } from "@baret/content";
import { orbityieldUnits } from "@baret/content/showcase/orbityield.content";
import { Button } from "@baret/ui";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { AttackSwitch } from "../kit/AttackSwitch.js";
import { format, parseAmount } from "../kit/amount.js";
import { AmountField } from "../kit/site/AmountField.js";
import { SAMPLE } from "./sample.js";

/**
 * The stake box, OrbitYield's focal point: how much MON, the oMON it
 * promises one to one, the rate and the unstaking terms, and the one button.
 * In the attack version the box says the same; only the pool the button
 * pays changes, which is the point. The switch at the bottom stays in step
 * with Baret's strip.
 */

const { panel, attack } = orbityield.site;

export function StakeCard({
  mode,
  onMode,
  amount,
  onAmount,
  error,
  onStake,
}: {
  mode: DemoMode;
  onMode: (mode: DemoMode) => void;
  amount: string;
  onAmount: (value: string) => void;
  error: string | null;
  /** False when the amount is refused, so the card can move focus to it. */
  onStake: () => boolean;
}): JSX.Element {
  const danger = mode === "danger";
  const value = parseAmount(amount);
  const [stake, receive, ...rest] = panel.rows;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // A refused amount moves focus to the input, which reads out its error.
        if (!onStake()) event.currentTarget.querySelector("input")?.focus();
      }}
      className="grid gap-5 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-6 md:p-8"
    >
      <h2 className={`${T.h3} text-[color:var(--fg)]`}>{panel.title}</h2>

      <AmountField
        label={stake?.label ?? panel.input}
        balance={`${panel.balance} ${format(SAMPLE.mon)} ${orbityieldUnits.stake}`}
        max={{ label: panel.max, onMax: () => onAmount(String(SAMPLE.mon)) }}
        unit={orbityieldUnits.stake}
        value={amount}
        onChange={onAmount}
        error={error}
      />

      <dl className="grid border-t border-[color:var(--rule)]">
        <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--rule)] py-3">
          <dt className={T.small}>{receive?.label}</dt>
          <dd className="text-right font-display text-2xl font-extrabold tabular-nums text-[color:var(--fg)]">
            {format(value ?? 0)} <span className="text-base font-bold">{receive?.value}</span>
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

      <AttackSwitch
        label={attack.switch.label}
        description={danger ? attack.switch.on : attack.switch.off}
        on={danger}
        onToggle={(on) => onMode(on ? "danger" : "safe")}
      />
    </form>
  );
}
