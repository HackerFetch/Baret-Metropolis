import { useMotionValueEvent, useScroll } from "motion/react";
import { type JSX, useEffect, useRef, useState } from "react";
import { IDS } from "../../shared/ids.js";
import { FRAME, HEADER_OFFSET } from "../../shared/layout.js";
import { useReduce } from "../../shared/useReduce.js";
import { FrameLayer, type FrameState } from "./opener/FrameLayer.js";
import { FRAMES } from "./opener/frames.js";
import { LinePlate } from "./opener/LinePlate.js";
import { OPENER_LABEL, SkipLink, StaticNotes } from "./opener/StaticNotes.js";

/**
 * The opener: a pinned graphite stage that tells the product in three lines
 * (problem, act, result), one per scroll step of about 22svh. Frames and lines swap on the
 * step and tween on time; nothing is scrubbed and scroll is never taken over.
 * Under reduced motion it is one finished screen (StaticNotes).
 */

const LAST = FRAMES.length - 1;

interface Step {
  readonly index: number;
  readonly prev: number;
}

function stateOf(i: number, step: Step): FrameState {
  if (i === step.index) return "active";
  if (i === step.prev) return "prev";
  return "idle";
}

function OpenerStage(): JSX.Element {
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });
  const [step, setStep] = useState<Step>({ index: 0, prev: 0 });
  // Pictures mount one step ahead of the reader and never unmount. Frame 1
  // waits for the window load event (which waits for the LCP, frame 0) and
  // then for idle time, so the LCP never shares bandwidth at first paint.
  const [reach, setReach] = useState(0);

  const sync = (v: number): void => {
    const next = Math.min(LAST, Math.max(0, Math.floor(v * FRAMES.length)));
    setStep((s) => (s.index === next ? s : { index: next, prev: s.index }));
    setReach((r) => Math.max(r, next + 1));
  };

  useMotionValueEvent(p, "change", sync);

  // A reload mid-page lands on the right step without waiting for a scroll.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only; `p` is stable.
  useEffect(() => {
    sync(p.get());
  }, []);

  useEffect(() => {
    const hasIdle = typeof window.requestIdleCallback === "function";
    let idle = 0;
    const ahead = (): void => {
      const run = (): void => setReach((r) => Math.max(r, 1));
      idle = hasIdle
        ? window.requestIdleCallback(run, { timeout: 1500 })
        : window.setTimeout(run, 200);
    };
    if (document.readyState === "complete") ahead();
    else window.addEventListener("load", ahead, { once: true });
    return () => {
      window.removeEventListener("load", ahead);
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return (
    <section
      id={IDS.opener}
      aria-label={OPENER_LABEL}
      data-band="dark"
      className="relative bg-graphite"
    >
      {/* One stage (HEADER_OFFSET: viewport less the 56px header) plus three 22svh steps. */}
      <div ref={track} className="relative h-[calc(100svh-56px+66svh)]">
        <div className={`sticky ${HEADER_OFFSET} overflow-hidden`}>
          <div aria-hidden="true">
            {FRAMES.map((f, i) => (
              <FrameLayer
                key={f.asset.src}
                frame={f}
                state={stateOf(i, step)}
                mounted={i <= reach}
              />
            ))}
          </div>
          <div className={`${FRAME} absolute inset-x-0 top-4 z-10 flex justify-end md:top-6`}>
            <SkipLink />
          </div>
          <div className={`${FRAME} absolute inset-x-0 bottom-4 z-10 md:bottom-8 lg:bottom-12`}>
            <LinePlate index={step.index} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function OpenerSection(): JSX.Element {
  const reduce = useReduce();
  return reduce ? <StaticNotes /> : <OpenerStage />;
}
