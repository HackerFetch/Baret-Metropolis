/**
 * The backup's one check: two words typed back from the reader's paper,
 * compared without regard to case or stray spaces. A wrong word shows its
 * error once the reader leaves the field, and goes away as soon as it
 * matches; when both match, a status line says so.
 */

import { extOnboarding } from "@baret/content";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import type { JSX } from "react";
import { TextField } from "./Frame.js";
import { SAMPLE_PHRASE, VERIFY_POSITIONS } from "./words.js";

const { verify } = extOnboarding.backup;

/** True when the typed word is the phrase's word at that position (counted from 1). */
export function isWordAt(position: number, typed: string): boolean {
  const word = SAMPLE_PHRASE[position - 1];
  return word !== undefined && typed.trim().toLowerCase() === word;
}

export function allMatch(answers: readonly string[]): boolean {
  return VERIFY_POSITIONS.every((position, i) => isWordAt(position, answers[i] ?? ""));
}

export function Verify({
  answers,
  left,
  onAnswer,
  onLeave,
}: {
  answers: readonly string[];
  /** Which fields the reader has left at least once. */
  left: readonly boolean[];
  onAnswer: (index: number, value: string) => void;
  onLeave: (index: number) => void;
}): JSX.Element {
  return (
    <fieldset className="grid min-w-0 gap-4 border-t border-[color:var(--rule)] pt-6">
      <legend className="float-left mb-1 w-full font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
        {verify.title}
      </legend>
      <p className={`${T.small} clear-left max-w-[52ch]`}>{verify.body}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {VERIFY_POSITIONS.map((position, i) => {
          const typed = answers[i] ?? "";
          const wrong = (left[i] ?? false) && typed.trim() !== "" && !isWordAt(position, typed);
          return (
            <TextField
              key={position}
              label={fill(verify.prompt, { position: String(position) })}
              autoComplete="off"
              mono
              value={typed}
              onChange={(value) => onAnswer(i, value)}
              onBlur={() => onLeave(i)}
              error={wrong ? fill(verify.error, { position: String(position) }) : null}
            />
          );
        })}
      </div>
      <p role="status" className="text-sm font-medium text-[color:var(--safe-ink)]">
        {allMatch(answers) ? verify.success : ""}
      </p>
    </fieldset>
  );
}
