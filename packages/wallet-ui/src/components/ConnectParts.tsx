import { connect } from "@baret/content";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId } from "react";

/** Small line icons, drawn here: this package carries no icon library. */
function Glyph({ d, className }: { d: string; className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

const CHECK = "M20 6 9 17l-5-5";
const CROSS = "M18 6 6 18M6 6l12 12";
const LOCK = "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4";
const OPEN = "M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2";

/**
 * The pieces of a connection request, shared by the web wallet's /connect
 * window and the extension popup: the site as a badge (its first letter in a
 * tile, the address as the browser reports it, and whether the connection is
 * secure), and what the site can and cannot do, side by side with the same
 * weight. No strikethrough: the X and the heading say "cannot".
 */

/** The letter in the site's tile: the first letter of its host, without www. */
export function siteLetter(origin: string): string {
  const host = origin.replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "");
  const first = host.match(/[a-z0-9]/i)?.[0];
  return (first ?? "?").toUpperCase();
}

/** The site: tile, host and the secure line. `origin` is the full origin with its scheme. */
export function SiteBadge({
  origin,
  secure,
  size = "md",
}: {
  origin: string;
  secure: boolean;
  /** "sm" in the 360 px popup. */
  size?: "sm" | "md";
}): JSX.Element {
  const host = origin.replace(/^https?:\/\//, "");
  const tile = size === "sm" ? "size-10 text-lg" : "size-12 text-xl";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center border border-[color:var(--rule-strong)] bg-[color:var(--ground-deep)] font-display font-extrabold text-[color:var(--fg)] ${tile}`}
      >
        {siteLetter(origin)}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="font-mono text-sm font-medium text-[color:var(--fg)] [overflow-wrap:anywhere]">
          {host}
        </span>
        <span
          className={`flex items-center gap-1.5 text-xs ${secure ? "text-[color:var(--fg-muted)]" : "font-medium text-[color:var(--blocked-ink)]"}`}
        >
          <Glyph d={secure ? LOCK : OPEN} className="size-3.5 shrink-0" />
          {secure ? connect.secure : connect.insecureShort}
        </span>
      </span>
    </div>
  );
}

function List({
  title,
  points,
  can,
  dense,
}: {
  title: string;
  points: readonly string[];
  can: boolean;
  dense: boolean;
}): JSX.Element {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid content-start gap-2">
      <h2 id={id} className={T.label}>
        {title}
      </h2>
      <ul className="grid gap-2">
        {points.map((point) => (
          <li
            key={point}
            className={`flex gap-2.5 text-[color:var(--fg)] ${dense ? "text-sm" : "text-[0.9375rem] leading-snug"}`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${can ? "bg-[color:var(--safe-dim)] text-[color:var(--safe-ink)]" : "bg-[color:var(--ground-deep)] text-[color:var(--fg-muted)]"}`}
            >
              <Glyph d={can ? CHECK : CROSS} className="size-3.5" />
            </span>
            <span className="min-w-0">{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Can and cannot, two columns from 400 px up (one under the other below it,
 * and always in the 360 px popup, `dense`).
 */
export function Permissions({
  can,
  cannot,
  dense = false,
}: {
  can: { readonly title: string; readonly points: readonly string[] };
  cannot: { readonly title: string; readonly points: readonly string[] };
  dense?: boolean;
}): JSX.Element {
  return (
    <div className={dense ? "grid gap-5" : "grid gap-5 min-[400px]:grid-cols-2 min-[400px]:gap-6"}>
      <List title={can.title} points={can.points} can dense={dense} />
      <List title={cannot.title} points={cannot.points} can={false} dense={dense} />
    </div>
  );
}
