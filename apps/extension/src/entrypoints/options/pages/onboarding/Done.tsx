/**
 * Step 8, done: the five checks Baret now runs before anything is signed,
 * three things to try next (the first one opens the showcase in a new tab),
 * and one button into the overview.
 */

import { extFrame, extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { Link } from "react-router";
import { SETUP_ART } from "../../../../assets.js";
import { Mark, OutLink, StepFrame } from "./Frame.js";

const { done } = extOnboarding;

export function Done(): JSX.Element {
  return (
    <StepFrame title={done.title} body={done.body} picture={SETUP_ART.done}>
      <ul className="grid border-t border-[color:var(--rule)]">
        {done.checks.map((check) => (
          <li
            key={check}
            className="flex items-start gap-3 border-b border-[color:var(--rule)] py-3 text-base leading-normal text-[color:var(--fg)]"
          >
            <Mark done />
            <span className="min-w-0 pt-0.5">{check}</span>
          </li>
        ))}
      </ul>
      <ul className="grid">
        {done.suggestions.map((suggestion) => (
          <li
            key={suggestion.title}
            className="grid gap-2 border-b border-[color:var(--rule)] py-4 last:border-b-0"
          >
            <p className="font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
              {suggestion.title}
            </p>
            <p className={T.small}>{suggestion.body}</p>
            {"action" in suggestion ? (
              <div className="flex">
                <OutLink href={extFrame.links.showcase} label={suggestion.action.label} size="sm" />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex">
        <Button asChild variant="primary" size="lg">
          <Link to={done.action.href}>{done.action.label}</Link>
        </Button>
      </div>
    </StepFrame>
  );
}
