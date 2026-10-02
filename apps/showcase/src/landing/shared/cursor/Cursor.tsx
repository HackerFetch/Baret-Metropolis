import "./cursor.css";
import { m, useMotionValue, useSpring } from "motion/react";
import { type JSX, useEffect, useState } from "react";
import { useReduce } from "../useReduce.js";
import { classify, ringColor } from "./classify.js";
import { useFinePointer } from "./useFinePointer.js";

/**
 * Baret's eyelet cursor: a 6 px dot on the exact hotspot and a 32 px ring
 * (the eyelet of a tag) that follows on a critically over-damped spring, so
 * it trails softly and never overshoots.
 *
 * Only for a fine, hovering pointer with no reduced-motion preference and no
 * forced colours; touch, pen-without-hover, reduced motion and High Contrast keep the native cursor and render
 * nothing. Position lives in motion values (no React render per move); the
 * hover, press and visibility states are data attributes on <html>, styled in
 * cursor.css. The native cursor is hidden only while this is mounted, by the
 * `baret-cursor` class on <html>. Mounted by HomePage only.
 */

/** stiffness 520, mass 0.5: critical damping is about 32; 44 stays above it. */
const RING_SPRING = { stiffness: 520, damping: 44, mass: 0.5 } as const;

export function Cursor(): JSX.Element | null {
  const reduce = useReduce();
  const fine = useFinePointer();
  const forced = useForcedColors();
  const on = fine && !reduce && !forced;
  return on ? <Eyelet /> : null;
}

/** True in forced-colors (High Contrast) mode: the native cursor stays there. */
function useForcedColors(): boolean {
  const [forced, setForced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(forced-colors: active)");
    const sync = (): void => setForced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return forced;
}

function Eyelet(): JSX.Element {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, RING_SPRING);
  const ry = useSpring(y, RING_SPRING);

  useEffect(() => {
    const html = document.documentElement;
    const ds = html.dataset;
    html.classList.add("baret-cursor");
    let seen = false;

    // Mouse and pen both hover on a fine pointer, and the native pointer is
    // hidden for both, so both drive the eyelet. Touch hides it instead.
    const tracks = (e: PointerEvent): boolean =>
      e.pointerType === "mouse" || e.pointerType === "pen";

    const move = (e: PointerEvent): void => {
      if (!tracks(e)) {
        delete ds.cursorVisible;
        return;
      }
      x.set(e.clientX);
      y.set(e.clientY);
      if (!seen) {
        // First sighting: put the ring on the dot instead of flying in.
        seen = true;
        rx.jump(e.clientX);
        ry.jump(e.clientY);
      }
      ds.cursorVisible = "";
    };
    const over = (e: PointerEvent): void => {
      ds.cursorState = classify(e.target);
      const ring = ringColor(e.target);
      if (ring) html.style.setProperty("--bc-ring", ring);
      else html.style.removeProperty("--bc-ring");
    };
    const leave = (): void => {
      delete ds.cursorVisible;
      delete ds.cursorPress;
      seen = false;
    };
    const down = (e: PointerEvent): void => {
      if (tracks(e)) ds.cursorPress = "";
      else delete ds.cursorVisible;
    };
    const up = (): void => {
      delete ds.cursorPress;
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });

    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      html.classList.remove("baret-cursor");
      delete ds.cursorVisible;
      delete ds.cursorPress;
      delete ds.cursorState;
      html.style.removeProperty("--bc-ring");
    };
  }, [x, y, rx, ry]);

  return (
    <>
      <m.div aria-hidden="true" className="bc-layer bc-layer--ring" style={{ x: rx, y: ry }}>
        <div className="bc-ring" />
      </m.div>
      <m.div aria-hidden="true" className="bc-layer" style={{ x, y }}>
        <div className="bc-dot" />
        <div className="bc-caret" />
      </m.div>
    </>
  );
}
