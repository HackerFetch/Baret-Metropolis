import { cn } from "../cn.js";

/**
 * A cap bar.
 *
 * The colour is the information, not decoration: it changes as the bar fills,
 * so a merchant near its ceiling reads at a glance without anyone doing
 * arithmetic. The thresholds are deliberately early, because the point is to
 * warn before the cap bites rather than after.
 *
 * The bar itself is hidden from assistive technology on purpose. It never
 * appears alone: every place it is used already renders the numbers as text,
 * and a `role="meter"` here would make a screen reader announce the same value
 * twice. `describedBy` links the bar to that text for anyone who wants the
 * association made explicit.
 */
export interface MeterProps {
  /** Amount used. */
  value: number;
  /** The ceiling. */
  max: number;
  /** The id of the element that states these numbers in words. */
  describedBy?: string;
  className?: string;
}

/** Where the bar changes colour. Amber well before the cap, red at it. */
const CAUTION_AT = 0.8;

export function Meter({ value, max, describedBy, className }: MeterProps) {
  const ratio = max <= 0 ? 0 : Math.min(value / max, 1);
  const colour =
    ratio >= 1 ? "var(--blocked)" : ratio >= CAUTION_AT ? "var(--caution)" : "var(--accent)";

  return (
    <div
      aria-hidden="true"
      data-slot="meter"
      {...(describedBy ? { "data-describes": describedBy } : {})}
      className={cn("h-2 w-full bg-[color:var(--rule)]", className)}
    >
      <div
        className="h-full transition-[width,background-color] duration-200"
        style={{ width: `${Math.round(ratio * 100)}%`, background: colour }}
      />
    </div>
  );
}
