import { docs } from "@baret/content";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";

/**
 * The idea of the page in two rows: the same request through a standard
 * wallet and through Baret. Each row is an ordered list of steps on one
 * hairline. The two steps only Baret adds are drawn filled in ink (not
 * orange: the hero's primary button is the viewport's one orange). In the
 * standard row a dashed gap stands where those steps would be, with the
 * divider line under it. On phones each row is a short vertical list;
 * nothing moves.
 */

const { timeline } = docs.hero;

/** Indexes of the steps only the Baret row has (they sit between asking and signing). */
const ADDED = new Set([1, 2]);

const CHIP =
  "inline-flex min-h-10 items-center border px-3 py-1 font-display text-sm font-bold uppercase tracking-[0.04em] md:text-base";

/** Stacked on phones (no joints), one line with joints from 768 px. */
const LIST = "flex flex-col items-start gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-0";

const JOINT = {
  plain: "w-5 border-[color:var(--rule-strong)] md:w-8",
  gap: "w-12 border-dashed border-[color:var(--fg-muted)] md:w-24",
} as const;

/** The rule between two steps; `gap` is where Baret's two steps would be. */
function Joint({ kind = "plain" }: { kind?: keyof typeof JOINT }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`mx-2 hidden h-0 shrink-0 border-t md:block ${JOINT[kind]}`}
    />
  );
}

export function Timeline(): JSX.Element {
  const { without } = timeline;
  const withBaret = timeline.with;
  return (
    <Reveal className="grid gap-6 border-t border-[color:var(--rule)] pt-6">
      <div className="grid gap-3 md:grid-cols-[11rem_1fr] md:items-start">
        <p className={`${T.label} md:pt-3`}>{without.label}</p>
        <div>
          <ol className={LIST}>
            {without.steps.map((step, i) => (
              <li key={step} className="flex items-center">
                {i > 0 ? <Joint kind={i === 1 ? "gap" : "plain"} /> : null}
                <span
                  className={`${CHIP} border-[color:var(--rule-strong)] text-[color:var(--fg-muted)]`}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <p className={`${T.small} mt-2`}>{timeline.divider}</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[11rem_1fr] md:items-start">
        <p className={`${T.label} md:pt-3`}>{withBaret.label}</p>
        <ol className={LIST}>
          {withBaret.steps.map((step, i) => (
            <li key={step} className="flex items-center">
              {i > 0 ? <Joint /> : null}
              <span
                className={`${CHIP} ${ADDED.has(i) ? "border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--ground)]" : "border-[color:var(--rule-strong)] text-[color:var(--fg)]"}`}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
