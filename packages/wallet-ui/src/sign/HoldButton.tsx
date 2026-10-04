import { sign } from "@baret/content";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { type JSX, useEffect, useId, useRef, useState } from "react";

/**
 * The only way past Blocked or Can't reach Baret: press and hold for 1.5 s,
 * with the pointer or with Space or Enter. A bar fills while it is held
 * (under reduced motion it stays still and the label says "Keep holding").
 * Letting go early signs nothing and says so. A deliberate step by design: no
 * click, no double click, gets past a block.
 *
 * Fail-closed: anything that ends the hold counts as letting go. Focus leaving
 * the button, the hold key released anywhere, the window losing focus or the
 * tab going hidden all cancel it, so a lost keyup can never sign.
 */

const HOLD_MS = 1500;

export function HoldButton({ onHeld }: { onHeld: () => void }): JSX.Element {
  const reduce = useReduce();
  const hintId = useId();
  const [holding, setHolding] = useState(false);
  const [released, setReleased] = useState(false);
  const timer = useRef<number | null>(null);
  const done = useRef(false);
  /** The key that started a keyboard hold, so a keyup anywhere can end it. */
  const holdKey = useRef<string | null>(null);

  function start(key: string | null = null): void {
    if (timer.current !== null || done.current) return;
    holdKey.current = key;
    setReleased(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      holdKey.current = null;
      done.current = true;
      setHolding(false);
      onHeld();
    }, HOLD_MS);
  }

  function stop(): void {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
    holdKey.current = null;
    setHolding(false);
    setReleased(true);
  }

  // While holding, listen beyond the button: the key may be released
  // elsewhere, or the window may lose focus and never see the keyup.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stop only reads refs and setters
  useEffect(() => {
    if (!holding) return;
    const onKeyUp = (event: KeyboardEvent): void => {
      if (holdKey.current !== null && event.key === holdKey.current) stop();
    };
    const onHidden = (): void => {
      if (document.visibilityState === "hidden") stop();
    };
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [holding]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onPointerDown={() => start()}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onBlur={stop}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            start(event.key);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") stop();
        }}
        onContextMenu={(event) => event.preventDefault()}
        aria-describedby={hintId}
        className="relative h-12 w-full touch-none select-none overflow-hidden border-2 border-[color:var(--blocked)] font-display text-base font-extrabold uppercase tracking-[0.08em] text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {/* Transform only: a full-width bar scales from the left. In forced
            colours it becomes a solid Highlight strip along the bottom edge,
            so the label stays readable and the progress stays visible. */}
        <span
          aria-hidden="true"
          data-hold-bar=""
          className="absolute inset-0 origin-left bg-[color:var(--blocked)] opacity-25 forced-color-adjust-none forced-colors:top-auto forced-colors:h-1 forced-colors:bg-[Highlight] forced-colors:opacity-100"
          style={{
            transform: holding && !reduce ? "scaleX(1)" : "scaleX(0)",
            transition: holding && !reduce ? `transform ${HOLD_MS}ms linear` : "none",
          }}
        />
        <span className="relative">{holding ? sign.override.holding : sign.override.hold}</span>
      </button>
      <span id={hintId} className="sr-only">
        {sign.override.holdHint}
      </span>
      <p role="status" className="min-h-[1lh] text-sm text-[color:var(--fg-muted)]">
        {released ? sign.override.released : ""}
      </p>
    </div>
  );
}
