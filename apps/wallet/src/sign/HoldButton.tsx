import { sign } from "@baret/content";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { type JSX, useEffect, useRef, useState } from "react";

/**
 * The only way past Blocked or Can't reach Baret: press and hold for 1.5 s,
 * with the pointer or with Space or Enter. A bar fills while it is held
 * (under reduced motion it stays still and the label says "Keep holding").
 * Letting go early signs nothing and says so. A deliberate step by design: no
 * click, no double click, gets past a block.
 */

const HOLD_MS = 1500;

export function HoldButton({ onHeld }: { onHeld: () => void }): JSX.Element {
  const reduce = useReduce();
  const [holding, setHolding] = useState(false);
  const [released, setReleased] = useState(false);
  const timer = useRef<number | null>(null);
  const done = useRef(false);

  function start(): void {
    if (timer.current !== null || done.current) return;
    setReleased(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      done.current = true;
      setHolding(false);
      onHeld();
    }, HOLD_MS);
  }

  function stop(): void {
    if (timer.current === null) return;
    window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    setReleased(true);
  }

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
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            start();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") stop();
        }}
        onContextMenu={(event) => event.preventDefault()}
        className="relative h-12 w-full touch-none select-none overflow-hidden border-2 border-[color:var(--blocked)] font-display text-base font-extrabold uppercase tracking-[0.08em] text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-[color:var(--blocked)] opacity-25"
          style={{
            width: holding && !reduce ? "100%" : "0%",
            transition: holding && !reduce ? `width ${HOLD_MS}ms linear` : "none",
          }}
        />
        <span className="relative">{holding ? sign.override.holding : sign.override.hold}</span>
      </button>
      <p role="status" className="min-h-[1lh] text-sm text-[color:var(--fg-muted)]">
        {released ? sign.override.released : ""}
      </p>
    </div>
  );
}
