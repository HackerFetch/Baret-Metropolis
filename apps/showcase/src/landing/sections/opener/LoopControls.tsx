import { home } from "@baret/content";
import { Pause, Play } from "lucide-react";
import { m } from "motion/react";
import type { JSX } from "react";

/**
 * The opener's controls on one small graphite plate: one dot per line (the
 * active one fills over the step, so the reader sees the loop's pace) and a
 * pause button. Each dot is a 44 px target; the visible bar is thin.
 */

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

function Dot({
  n,
  active,
  running,
  duration,
  onPick,
}: {
  n: number;
  active: boolean;
  running: boolean;
  duration: number;
  onPick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={home.opener.step.replace("{n}", String(n))}
      aria-current={active ? "step" : undefined}
      onClick={onPick}
      className={`group/dot flex h-11 w-9 items-center justify-center ${FOCUS}`}
    >
      <span className="relative block h-[3px] w-full overflow-hidden bg-chalk/25">
        {active ? (
          <m.span
            key={running ? "run" : "hold"}
            className="absolute inset-0 origin-left bg-chalk"
            initial={{ scaleX: running ? 0 : 1 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: running ? duration / 1000 : 0, ease: "linear" }}
          />
        ) : (
          <span className="absolute inset-0 bg-chalk/0 transition-colors duration-150 group-hover/dot:bg-chalk/50" />
        )}
      </span>
    </button>
  );
}

export function LoopControls({
  index,
  count,
  playing,
  running,
  duration,
  onPick,
  onToggle,
}: {
  index: number;
  count: number;
  playing: boolean;
  running: boolean;
  duration: number;
  onPick: (i: number) => void;
  onToggle: () => void;
}): JSX.Element {
  const Icon = playing ? Pause : Play;
  return (
    <div className="flex items-center gap-1 bg-[rgb(18_18_18/0.72)] px-2">
      {Array.from({ length: count }, (_, i) => (
        <Dot
          // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positional.
          key={i}
          n={i + 1}
          active={i === index}
          running={running}
          duration={duration}
          onPick={() => onPick(i)}
        />
      ))}
      <button
        type="button"
        aria-label={playing ? home.opener.pause : home.opener.play}
        onClick={onToggle}
        className={`ml-1 flex size-11 items-center justify-center text-chalk/80 transition-colors duration-150 hover:text-chalk ${FOCUS}`}
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
