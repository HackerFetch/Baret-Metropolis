/**
 * Step 4, the backup, the step people skip and regret: why the words are
 * the only way back, the twelve words hidden until the reader shows them,
 * three rules, a copy button with its clipboard warning, then a two-word
 * check. Continue opens only once both words match and records the backup;
 * skipping asks first, with every consequence stated, and leaves the
 * account marked as not backed up. The words are sample words that fail
 * the checksum, and say so beside them.
 */

import { common, extFrame, extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useEffect, useRef, useState } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { useGate } from "../../../../data/gate.js";
import { useExtension } from "../../../../data/store.js";
import { Dialog } from "../../parts/kit.js";
import { StepFrame } from "./Frame.js";
import { allMatch, Verify } from "./Verify.js";
import { SAMPLE_PHRASE } from "./words.js";

const { backup } = extOnboarding;

const GRID = "grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3";
const CELL = "flex min-w-0 items-center gap-2 border-b border-[color:var(--rule)] py-2";
const NUMBER = `w-5 shrink-0 text-right font-mono text-label text-[color:var(--fg-muted)] ${T.num}`;

export function Backup({ onNext }: { onNext: () => void }): JSX.Element {
  const { dispatch } = useExtension();
  const gate = useGate();
  // Live: the wallet's own words, read from the open keystore when the step
  // opens and held only while it is on screen. The sample shows sample words.
  const [phrase, setPhrase] = useState<readonly string[]>(gate ? [] : SAMPLE_PHRASE);
  useEffect(() => {
    if (!gate) return;
    let alive = true;
    void gate.phrase().then((words) => {
      if (alive && words) setPhrase(words);
    });
    return () => {
      alive = false;
    };
  }, [gate]);
  const [revealed, setRevealed] = useState(false);
  const [wrote, setWrote] = useState(false);
  const [answers, setAnswers] = useState<readonly string[]>(["", ""]);
  const [left, setLeft] = useState<readonly boolean[]>([false, false]);
  const [skipping, setSkipping] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const checked = wrote && phrase.length > 0 && allMatch(answers, phrase);

  // The reveal button goes away when pressed: the focus moves to the words.
  useEffect(() => {
    if (revealed) list.current?.focus();
  }, [revealed]);

  function finish(): void {
    dispatch({ type: "settings", patch: { backedUp: true } });
    onNext();
  }

  function skip(): void {
    dispatch({ type: "settings", patch: { backedUp: false } });
    setSkipping(false);
    onNext();
  }

  return (
    <StepFrame title={backup.title} body={backup.body} picture={SETUP_ART.backup}>
      <div className="grid max-w-[52ch] gap-1 border-l-2 border-[color:var(--accent)] pl-4">
        <p className="font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
          {backup.why.title}
        </p>
        <p className={T.small}>{backup.why.body}</p>
      </div>

      <div className="grid min-w-0 gap-4 border border-[color:var(--rule-strong)] p-4 sm:p-5">
        {revealed ? (
          <>
            <ol
              ref={list}
              tabIndex={-1}
              aria-label={extOnboarding.restore.field.label}
              className={`${GRID} focus:outline-none`}
            >
              {phrase.map((word, i) => (
                // A real phrase can hold the same word twice: the position is the key.
                // biome-ignore lint/suspicious/noArrayIndexKey: the list is fixed and ordered
                <li key={i} className={CELL}>
                  <span className={NUMBER}>{i + 1}</span>
                  <span className="min-w-0 truncate font-mono text-base text-[color:var(--fg)]">
                    {word}
                  </span>
                </li>
              ))}
            </ol>
            {gate ? null : (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Tag tone="neutral" size="sm">
                  {extFrame.sample.tag}
                </Tag>
                <span className={`${T.small} min-w-[20ch] flex-1`}>{extFrame.sampleWords}</span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color:var(--rule)] pt-3">
              <CopyButton
                text={phrase.join(" ")}
                label={backup.copy.label}
                done={common.actions.copied}
              />
              <p className={`${T.small} min-w-[20ch] flex-1`}>{backup.copy.warning}</p>
            </div>
          </>
        ) : (
          <>
            <ol aria-hidden="true" className={GRID}>
              {Array.from({ length: 12 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: twelve fixed placeholders
                <li key={i} className={CELL}>
                  <span className={NUMBER}>{i + 1}</span>
                  <span className="h-3 w-16 max-w-full bg-[color:var(--rule-strong)] blur-[3px]" />
                </li>
              ))}
            </ol>
            <p className={T.small}>{backup.reveal.hidden}</p>
            <div className="flex">
              <Button type="button" variant="ghost" onClick={() => setRevealed(true)}>
                {backup.reveal.label}
              </Button>
            </div>
          </>
        )}
      </div>

      <ul className="grid gap-3">
        {backup.rules.map((rule) => (
          <li key={rule} className="flex gap-3 text-sm leading-normal text-[color:var(--fg)]">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-[color:var(--accent)]" />
            {rule}
          </li>
        ))}
      </ul>

      {revealed ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-medium text-[color:var(--fg)]">
          <input
            type="checkbox"
            checked={wrote}
            onChange={(event) => setWrote(event.target.checked)}
            className="size-5 shrink-0 cursor-pointer accent-[color:var(--accent)]"
          />
          {backup.confirm.label}
        </label>
      ) : null}

      {revealed && wrote ? (
        <Verify
          answers={answers}
          left={left}
          onAnswer={(index, value) =>
            setAnswers((all) => all.map((answer, i) => (i === index ? value : answer)))
          }
          onLeave={(index) => setLeft((all) => all.map((was, i) => was || i === index))}
          phrase={phrase}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" size="lg" disabled={!checked} onClick={finish}>
          {backup.action.label}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => setSkipping(true)}>
          {backup.skip.label}
        </Button>
      </div>

      <Dialog
        open={skipping}
        title={backup.skip.title}
        action={backup.skip.confirm}
        cancel={backup.skip.cancel}
        onConfirm={skip}
        onCancel={() => setSkipping(false)}
      >
        <p className={T.body}>{backup.skip.body}</p>
      </Dialog>
    </StepFrame>
  );
}
