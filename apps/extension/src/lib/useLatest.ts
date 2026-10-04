import { useLayoutEffect, useRef } from "react";

/**
 * The latest value of a callback, for a timer that must not restart when the
 * parent hands down a new function on every render.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
