/**
 * Step 1, welcome: what Baret does in three points, one button to start,
 * and a quieter way in for a reader who already has a recovery phrase.
 */

import { extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { LINK } from "../../parts/kit.js";
import { Mark, StepFrame } from "./Frame.js";

const { welcome } = extOnboarding;

export function Welcome({
  onStart,
  onRestore,
}: {
  onStart: () => void;
  onRestore: () => void;
}): JSX.Element {
  return (
    <StepFrame title={welcome.title} body={welcome.body} picture={SETUP_ART.welcome}>
      <ul className="grid gap-4 border-t border-[color:var(--rule)] pt-6 sm:grid-cols-3">
        {welcome.points.map((point) => (
          <li key={point} className="flex items-start gap-3 sm:grid sm:content-start">
            <Mark done />
            <span className="font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
              {point}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button type="button" variant="primary" size="lg" onClick={onStart}>
          {welcome.action.label}
        </Button>
        <button type="button" onClick={onRestore} className={`${LINK} min-h-11 text-left`}>
          {welcome.restore.label}
        </button>
      </div>
      <p className={T.small}>{welcome.footnote}</p>
    </StepFrame>
  );
}
