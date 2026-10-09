import { useCallback, useEffect, useRef, useState } from "react";
import type { Live } from "./live.js";

/** How often the balances are read again while a screen waits for a transfer. */
const EVERY_MS = 3000;
/** How long one watch lasts before the screen offers to check again. */
const FOR_MS = 90_000;

/**
 * Live only: reads the balances again while a screen waits for MON to arrive
 * (Home's setup panel and no-funds banner, Receive). Every 3 s for 90 s, then
 * it stops and `polling` turns false, so the screen can offer "Check again"
 * (`restart`). Returning to the tab (focus, or the page turning visible) also
 * reads once: that is the way back from the faucet. On the sample (`live`
 * null) nothing runs and `polling` stays false.
 */
export function useWatch(live: Live | null, on: boolean): { polling: boolean; restart(): void } {
  const [round, setRound] = useState(0);
  // Started from the inputs, so a screen does not flash "Check again" on mount.
  const [polling, setPolling] = useState(() => live !== null && on);
  // The latest refresh, so the listeners below don't restart on every render.
  const refresh = useRef(live?.refresh);
  refresh.current = live?.refresh;
  const isLive = live !== null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new round restarts the window.
  useEffect(() => {
    if (!isLive || !on) {
      setPolling(false);
      return;
    }
    setPolling(true);
    const started = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - started >= FOR_MS) {
        window.clearInterval(id);
        setPolling(false);
      } else void refresh.current?.();
    }, EVERY_MS);
    return () => window.clearInterval(id);
  }, [isLive, on, round]);

  useEffect(() => {
    if (!isLive) return;
    const again = (): void => {
      if (document.visibilityState === "visible") void refresh.current?.();
    };
    window.addEventListener("focus", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      window.removeEventListener("focus", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, [isLive]);

  const restart = useCallback(() => {
    void refresh.current?.();
    setRound((n) => n + 1);
  }, []);

  return { polling, restart };
}
