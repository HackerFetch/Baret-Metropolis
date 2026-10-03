import type { JSX } from "react";
import type { Part } from "../lib/parts.js";

/** A split sentence: kept values in the mono face and their own case. */
export function Parts({ parts }: { parts: readonly Part[] }): JSX.Element {
  return (
    <>
      {parts.map((part, i) =>
        part.keep ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts never reorder.
          <span key={i} className="font-mono text-[0.78em] font-medium normal-case tracking-normal">
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
