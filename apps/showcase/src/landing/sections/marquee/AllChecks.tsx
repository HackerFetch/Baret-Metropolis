import { FRAME } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import { ChevronDown } from "lucide-react";
import type { JSX } from "react";

/**
 * "See all 17 checks": a native, closed <details> under the moving rows.
 * Moving text cannot be read on purpose, so this is the one place a sighted
 * reader sees the whole list, as plain static text. It is also the list
 * screen readers use (the rows are aria-hidden), and find-in-page opens it.
 *
 * The height ease lives in packages/ui tokens.css (`details::details-content`,
 * Chromium only; other browsers open instantly, and reduced motion is
 * instant everywhere). The chevron turns 180 deg when open. No bullets, no
 * boxes; the summary is a quiet mono line in --fg-muted.
 */
export function AllChecks({
  summary,
  listLabel,
  items,
}: {
  summary: string;
  listLabel: string;
  items: readonly string[];
}): JSX.Element {
  return (
    <div className={`${FRAME} mt-8`}>
      <details className="group/checks">
        <summary
          className={`${T.small} inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-mono transition-colors duration-150 hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] [&::-webkit-details-marker]:hidden`}
        >
          {summary}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-150 ease-out group-open/checks:rotate-180 motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </summary>
        {/* WebKit/VoiceOver drops list semantics from a list-style:none list,
            so the role is restated on purpose; it is not redundant there. */}
        <ul
          // biome-ignore lint/a11y/noRedundantRoles: WebKit drops list semantics under list-none
          role="list"
          aria-label={listLabel}
          className={`${T.small} mt-4 grid list-none grid-cols-2 gap-x-6 gap-y-2 p-0 lg:grid-cols-3`}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
