import { walletX402 } from "@baret/content";
import { fill } from "@baret/web-ui/lib/util";
import { Pause, Play } from "lucide-react";
import type { JSX } from "react";
import { type PollStatus, useAge } from "./usePoll.js";

/**
 * The console's live line: a dot that breathes while reads succeed (still
 * under reduced motion), how long ago the last read landed, and Pause. The
 * dot goes grey when paused or when the last read failed: it never says
 * "Live" over data that is not.
 */
const copy = walletX402.live;

export function LiveBar({
  status,
  at,
  paused,
  onToggle,
}: {
  status: PollStatus;
  at: number | null;
  paused: boolean;
  onToggle: () => void;
}): JSX.Element {
  const age = useAge(at);
  const live = !paused && status === "ok";
  return (
    <div className="flex items-center gap-3 pb-2">
      <p className="flex items-center gap-2 text-sm" aria-live="off">
        <span aria-hidden="true" className="relative flex size-2.5">
          {live ? (
            <span className="absolute inset-0 rounded-full bg-[color:var(--safe)] opacity-60 motion-safe:animate-ping" />
          ) : null}
          <span
            className={`relative size-2.5 rounded-full ${live ? "bg-[color:var(--safe)]" : "bg-[color:var(--fg-faint)]"}`}
          />
        </span>
        <span className="font-medium text-[color:var(--fg)]">{paused ? copy.paused : copy.on}</span>
        {age !== null ? (
          <span className="tabular-nums text-[color:var(--fg-muted)]">
            {fill(copy.updated, { seconds: String(age) })}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={paused}
        className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {paused ? (
          <Play aria-hidden="true" className="size-4" />
        ) : (
          <Pause aria-hidden="true" className="size-4" />
        )}
        {paused ? copy.resume : copy.pause}
      </button>
    </div>
  );
}
