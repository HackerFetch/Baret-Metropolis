import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reads `url` now and every `every` ms while the tab is visible and the
 * reader has not paused it. `parse` turns the answer into data, or null when
 * the answer is not what the screen expects. The last good data stays, with
 * the time it was read, so a failed read never blanks the screen nor passes
 * old figures off as new: the status says the read failed and when the data
 * is from. A 404 reads as "missing", which is not an error (no vault yet).
 */

export type PollStatus = "idle" | "loading" | "ok" | "missing" | "error";

export interface Poll<T> {
  readonly status: PollStatus;
  readonly data: T | null;
  /** Epoch ms of the last good read. */
  readonly at: number | null;
  readonly retry: () => void;
}

export function usePoll<T>(
  url: string | null,
  parse: (body: unknown) => T | null,
  { every = 5000, paused = false }: { every?: number; paused?: boolean } = {},
): Poll<T> {
  const [status, setStatus] = useState<PollStatus>(url ? "loading" : "idle");
  const [data, setData] = useState<T | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const [tick, setTick] = useState(0);

  // A new URL starts over: another vault's figures must not show under this one.
  useEffect(() => {
    setData(null);
    setAt(null);
    setStatus(url ? "loading" : "idle");
  }, [url]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick forces a read now.
  useEffect(() => {
    if (!url || paused) return;
    let alive = true;
    let timer: number | undefined;
    const controller = new AbortController();

    const read = async (): Promise<void> => {
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(read, every);
        return;
      }
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!alive) return;
        if (res.status === 404) {
          setStatus("missing");
        } else {
          const parsed = res.ok ? parseRef.current(await res.json()) : null;
          if (!alive) return;
          if (parsed === null) setStatus("error");
          else {
            setData(parsed);
            setAt(Date.now());
            setStatus("ok");
          }
        }
      } catch {
        if (alive && !controller.signal.aborted) setStatus("error");
      }
      if (alive) timer = window.setTimeout(read, every);
    };
    void read();
    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [url, paused, every, tick]);

  const retry = useCallback(() => setTick((n) => n + 1), []);
  return { status, data, at, retry };
}

/** Seconds since `at`, counted every second while mounted; null with no read yet. */
export function useAge(at: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return at === null ? null : Math.max(0, Math.round((now - at) / 1000));
}
