/**
 * Step 6, the account check. The reader's press on the funds step starts
 * it: three lines appear one after the other, about 900 ms apart (stand-in
 * waits; nothing is read from Monad), each marked once it is finished.
 * Continue opens on the last one. A status line reads each line out as it
 * arrives.
 */

import { extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { type JSX, useEffect, useState } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { useGate } from "../../../../data/gate.js";
import { Mark, StepFrame } from "./Frame.js";
import { WAIT } from "./words.js";

const { smartWallet } = extOnboarding;

const LINES = [
  smartWallet.states.checking,
  smartWallet.states.resolving,
  smartWallet.states.done,
] as const;

const LAST = LINES.length - 1;

export function Account({ onNext }: { onNext: () => void }): JSX.Element {
  // The line in progress; the last one is finished as soon as it shows.
  const [at, setAt] = useState(0);
  const gate = useGate();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const done = at === LAST && !failed;

  // Live: the two lines are what they say. The balance is read from Monad,
  // then the open key signs a test message and the signature is checked
  // against the account. Nothing is sent. The sample walks the lines on a timer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt starts the check again
  useEffect(() => {
    if (gate) {
      let alive = true;
      setFailed(false);
      setAt(0);
      void gate
        .checkAccount((line) => {
          if (alive) setAt(line);
        })
        .then((ok) => {
          if (!alive) return;
          if (ok) setAt(LAST);
          else setFailed(true);
        });
      return () => {
        alive = false;
      };
    }
    const ids = LINES.slice(1).map((_, i) =>
      window.setTimeout(() => setAt(i + 1), WAIT.check * (i + 1)),
    );
    return () => {
      for (const id of ids) window.clearTimeout(id);
    };
  }, [gate, attempt]);

  return (
    <StepFrame title={smartWallet.title} body={smartWallet.body} picture={SETUP_ART.account}>
      <ol aria-busy={!done} className="grid border-t border-[color:var(--rule)]">
        {LINES.slice(0, failed ? at : at + 1).map((line, i) => (
          <li
            key={line}
            className="flex items-center gap-3 border-b border-[color:var(--rule)] py-3 text-base text-[color:var(--fg)]"
          >
            <Mark done={i < at || done} />
            {line}
          </li>
        ))}
      </ol>
      <p role="status" className="sr-only">
        {failed ? smartWallet.errors.failed.title : LINES[at]}
      </p>
      {failed ? (
        <div className="grid gap-2 border-l-4 border-[color:var(--blocked)] pl-3">
          <p className="text-base font-medium text-[color:var(--fg)]">
            {smartWallet.errors.failed.title}
          </p>
          <p className="text-sm text-[color:var(--fg-muted)]">{smartWallet.errors.failed.body}</p>
          <div className="flex">
            <Button type="button" variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
              {smartWallet.errors.failed.action.label}
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex">
        <Button type="button" variant="primary" size="lg" disabled={!done} onClick={onNext}>
          {smartWallet.action.label}
        </Button>
      </div>
    </StepFrame>
  );
}
