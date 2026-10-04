/**
 * Step 3, your key. The reader's press on the passphrase step starts it: a
 * bar fills for about two and a half seconds while the key is "created" (a
 * stand-in wait; the key is the sample account's), then the new address
 * shows, whole, with a copy button. Under reduced motion the bar stays still
 * and the working words carry the wait alone.
 */

import { extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { useReduce } from "@baret/web-ui/lib/useReduce";
import { motion } from "motion/react";
import { type JSX, useEffect, useState } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { AddressLine, StepFrame } from "./Frame.js";
import { WAIT } from "./words.js";

const { keys } = extOnboarding;

export function Key({ onNext }: { onNext: () => void }): JSX.Element {
  const [ready, setReady] = useState(false);
  const reduce = useReduce();

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), WAIT.key);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) {
    return (
      <StepFrame key="working" title={keys.title} body={keys.body} picture={SETUP_ART.key}>
        <div className="grid max-w-[36rem] gap-3">
          {reduce ? null : (
            <div aria-hidden="true" className="h-1 overflow-hidden bg-[color:var(--rule)]">
              <motion.div
                className="h-full origin-left bg-[color:var(--accent)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: WAIT.key / 1000, ease: "linear" }}
              />
            </div>
          )}
          <p role="status" className="font-mono text-label uppercase text-[color:var(--fg)]">
            {keys.working}
          </p>
        </div>
      </StepFrame>
    );
  }

  return (
    <StepFrame key="done" title={keys.done.title} body={keys.done.body} picture={SETUP_ART.key}>
      <div className="grid gap-1 border-y border-[color:var(--rule)] py-3">
        <p className="text-sm text-[color:var(--fg-muted)]">{keys.done.addressLabel}</p>
        <AddressLine />
        <p className={T.small}>{keys.done.addressHint}</p>
      </div>
      <div className="flex">
        <Button type="button" variant="primary" size="lg" onClick={onNext}>
          {keys.action.label}
        </Button>
      </div>
    </StepFrame>
  );
}
