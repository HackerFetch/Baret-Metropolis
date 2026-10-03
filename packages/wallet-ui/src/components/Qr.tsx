import type { JSX } from "react";
import { encode } from "../lib/qr.js";

/**
 * A QR code of `text`, drawn as one SVG path with the standard four-module
 * quiet zone. Always ink on a light plate, in both themes: scanners read dark
 * modules on light, and an inverted code fails on many of them. Decorative
 * for assistive tech: the text it encodes sits right beside it.
 */
export function Qr({ text, className }: { text: string; className?: string }): JSX.Element | null {
  const code = encode(text);
  if (!code) return null;
  const quiet = 4;
  const view = code.modules.length + quiet * 2;
  let d = "";
  code.modules.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    });
  });
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${view} ${view}`}
      shapeRendering="crispEdges"
      className={`block bg-[#f4f2ec]${className ? ` ${className}` : ""}`}
    >
      <path d={d} fill="#16171a" />
    </svg>
  );
}
