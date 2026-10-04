/**
 * The way in for a reader who already has a recovery phrase: twelve words in
 * one field, checked in the order the reader fixes them (how many words, then
 * each word against the list, then the checksum). A valid phrase goes on to
 * the passphrase; nothing is derived or stored here.
 */

import { common, extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type FormEvent, type JSX, useId, useRef, useState } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { ERROR, LABEL, StepFrame } from "./Frame.js";
import { checkPhrase, type PhraseCheck } from "./phrase.js";

const { restore } = extOnboarding;

function errorText(check: PhraseCheck): string | null {
  if (check.ok) return null;
  switch (check.error) {
    case "wordCount":
      return fill(restore.errors.wordCount, { count: String(check.count) });
    case "unknownWord":
      return fill(restore.errors.unknownWord, { position: String(check.position) });
    case "invalid":
      return restore.errors.invalid;
  }
}

export function Restore({
  onRestored,
  onBack,
}: {
  onRestored: () => void;
  onBack: () => void;
}): JSX.Element {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const hintId = useId();
  const warningId = useId();
  const errorId = useId();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setChecking(true);
    const check = await checkPhrase(text);
    setChecking(false);
    const problem = errorText(check);
    setError(problem);
    if (problem) field.current?.focus();
    else onRestored();
  }

  return (
    <StepFrame title={restore.title} body={restore.body} picture={SETUP_ART.backup}>
      <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-6">
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor={id} className={LABEL}>
            {restore.field.label}
          </label>
          <textarea
            id={id}
            ref={field}
            rows={4}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${hintId} ${warningId}${error ? ` ${errorId}` : ""}`}
            className="min-h-28 w-full min-w-0 resize-y border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 py-2.5 font-mono text-base leading-relaxed text-[color:var(--fg)] focus-visible:border-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
          />
          <p id={hintId} className={T.small}>
            {restore.field.hint}
          </p>
          {error ? (
            <p id={errorId} className={ERROR}>
              {error}
            </p>
          ) : null}
        </div>
        <p
          id={warningId}
          className="border-l-2 border-[color:var(--caution)] pl-4 text-sm font-medium leading-normal text-[color:var(--fg)]"
        >
          {restore.warning}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={checking}>
            {restore.action.label}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={onBack}>
            {common.actions.back}
          </Button>
        </div>
      </form>
    </StepFrame>
  );
}
