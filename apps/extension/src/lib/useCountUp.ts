import { useReduce } from "@baret/web-ui/lib/useReduce";
import { useEffect, useState } from "react";

/**
 * A balance that counts up from zero once, on the first paint
 * (docs/WALLET.md 2.1: "Count-up animation on first load, none afterwards").
 * 600 ms on the BRAND ease-out, with the same decimals as the value. Under
 * reduced motion, and on every later change, the value shows at once.
 */
export function useCountUp(value: string, duration = 600): string {
  const reduce = useReduce();
  const [shown, setShown] = useState(reduce ? value : zero(value));
  const [done, setDone] = useState(reduce);

  useEffect(() => {
    if (done) {
      setShown(value);
      return;
    }
    const target = Number.parseFloat(value);
    const decimals = (value.split(".")[1] ?? "").length;
    if (!Number.isFinite(target) || target === 0) {
      setShown(value);
      setDone(true);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (time: number) => {
      const t = Math.min((time - start) / duration, 1);
      // easeOutCubic, close to the BRAND curve and with no overshoot.
      const eased = 1 - (1 - t) ** 3;
      setShown((target * eased).toFixed(decimals));
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        setShown(value);
        setDone(true);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, done]);

  return shown;
}

function zero(value: string): string {
  const decimals = (value.split(".")[1] ?? "").length;
  return (0).toFixed(decimals);
}
