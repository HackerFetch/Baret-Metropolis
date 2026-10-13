import { common, type Partner, partners } from "@baret/content";
import { Mark } from "@baret/ui";
import type { JSX } from "react";
import { LogoTile } from "./LogoTile.js";

/**
 * The hero picture of /partners: every partner's mark in one even grid, with
 * Baret's own mark in the last cell. Each cell jumps to that partner's card
 * on this page (a same-page anchor, so it stays in the tab).
 */
export function LogoWall(): JSX.Element {
  const all: readonly Partner[] = partners.groups.flatMap(
    (group): readonly Partner[] => group.partners,
  );
  return (
    <nav
      aria-label={partners.labels.groupNav}
      className="border border-[color:var(--rule)] bg-[color:var(--rule)]"
    >
      <ul className="grid grid-cols-3 gap-px sm:grid-cols-4">
        {all.map((partner) => (
          <li key={partner.id} className="bg-[color:var(--surface)]">
            <a
              href={`#${partner.id}`}
              className="group/logo flex aspect-square flex-col items-center justify-center gap-2 p-3 transition-colors duration-150 hover:bg-[color:var(--ground)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
            >
              <span className="transition-transform duration-300 ease-out group-hover/logo:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/logo:translate-y-0">
                <LogoTile id={partner.id} name={partner.name} size="sm" />
              </span>
              <span className="text-center font-mono text-label uppercase text-[color:var(--fg-muted)] transition-colors duration-150 group-hover/logo:text-[color:var(--fg)]">
                {partner.name}
              </span>
            </a>
          </li>
        ))}
        <li className="flex aspect-square flex-col items-center justify-center gap-2 bg-[color:var(--fg)] p-3 text-[color:var(--ground)]">
          <Mark decorative size={40} slit="var(--fg)" />
          <span className="font-stencil text-lg uppercase tracking-[0.04em]">
            {common.brand.wordmark}
          </span>
        </li>
      </ul>
    </nav>
  );
}
