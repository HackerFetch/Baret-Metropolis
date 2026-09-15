import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../cn.js";

/**
 * The button.
 *
 * Written rather than generated. shadcn's button carries six variants, eight
 * sizes, a translate on press and rounded corners, and almost none of it
 * survives contact with this brand: our buttons are square with one chamfered
 * corner, set in Big Shoulders, uppercase and tracked. There was more to delete
 * than to keep.
 *
 * Four variants, and the ratio rule decides when to use which. A screen gets
 * one primary. If it has two, one of them is wrong.
 */

const VARIANT = {
  /** The one action the screen exists for. */
  primary:
    "bg-[color:var(--accent)] text-[color:var(--on-accent)] hover:bg-[color:var(--accent-deep)]",
  /** Everything else. A rule, not a fill. */
  ghost:
    "border border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--ground-deep)]",
  /** Quieter than ghost, for a third action in a row. */
  soft: "bg-[color:var(--ground-deep)] text-[color:var(--fg)] hover:bg-[color:var(--rule)]",
  /**
   * Revoke, reset, sign anyway. Red is reserved for an action that cannot be
   * undone, so that red always means the same thing.
   */
  danger:
    "border border-[color:var(--blocked)] text-[color:var(--blocked)] hover:bg-[color:var(--blocked)] hover:text-[color:var(--surface)]",
} as const;

const SIZE = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-12 px-6 text-lg",
  /* Square, for a button that is only an icon: close, copy, dismiss. The
     label still has to exist for a screen reader, as an aria-label. */
  icon: "size-11",
  "icon-sm": "size-9",
} as const;

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  /** Render as the child element, for a link that looks like a button. */
  asChild?: boolean;
  /** Fills the row. Used in the popup, where a row is 328px wide. */
  block?: boolean;
}

export function Button({
  variant = "ghost",
  size = "md",
  asChild = false,
  block = false,
  className,
  type,
  ...rest
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";

  return (
    <Component
      // A button inside a form defaults to submit, which has surprised people
      // on every project that did not set this.
      type={asChild ? undefined : (type ?? "button")}
      data-slot="button"
      className={cn(
        "chamfer-sm inline-flex shrink-0 items-center justify-center gap-2 font-display font-extrabold uppercase tracking-[0.08em] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--accent)]",
        "disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    />
  );
}
