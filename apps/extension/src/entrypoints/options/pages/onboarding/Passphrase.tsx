/**
 * Step 2, the passphrase: two fields, a four-level strength meter under the
 * first, and a native disclosure that says why a sentence beats a PIN. The
 * checks run when the reader presses the action; each error sits under its
 * own field and is read with it. The passphrase is never kept: the sample
 * has no keystore to encrypt.
 */

import { extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { Plus } from "lucide-react";
import { type FormEvent, type JSX, useId, useRef, useState } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { StepFrame, TextField } from "./Frame.js";
import { LEVELS, type PassphraseErrors, passphraseErrors, strengthOf } from "./strength.js";

const { passphrase: words } = extOnboarding;

const NO_ERRORS: PassphraseErrors = { passphrase: null, confirm: null };

/** The meter's fill per level: one segment more each time, red to green. */
const TONE = {
  weak: "bg-[color:var(--blocked)]",
  fair: "bg-[color:var(--caution)]",
  good: "bg-[color:var(--safe)]",
  strong: "bg-[color:var(--safe)]",
} as const;

function Meter({ id, value }: { id: string; value: string }): JSX.Element {
  const level = strengthOf(value);
  const filled = LEVELS.indexOf(level) + 1;
  return (
    <div className="grid gap-1.5">
      <div aria-hidden="true" className="grid grid-cols-4 gap-1">
        {LEVELS.map((step, i) => (
          <span
            key={step}
            className={`h-1 ${value && i < filled ? TONE[level] : "bg-[color:var(--rule)]"}`}
          />
        ))}
      </div>
      <p id={id} className="flex flex-wrap gap-x-2 text-sm text-[color:var(--fg-muted)]">
        <span>{words.strengthLabel}</span>
        <span className="font-medium text-[color:var(--fg)]">
          {value ? words.strength[level] : null}
        </span>
      </p>
    </div>
  );
}

export function Passphrase({ onSet }: { onSet: () => void }): JSX.Element {
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<PassphraseErrors>(NO_ERRORS);
  const first = useRef<HTMLInputElement>(null);
  const second = useRef<HTMLInputElement>(null);
  const meterId = useId();

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = passphraseErrors(value, confirm);
    setErrors(found);
    if (found.passphrase) first.current?.focus();
    else if (found.confirm) second.current?.focus();
    else onSet();
  }

  return (
    <StepFrame title={words.title} body={words.body} picture={SETUP_ART.passphrase}>
      <form noValidate onSubmit={submit} className="grid max-w-[36rem] gap-6">
        <TextField
          label={words.fields.passphrase.label}
          hint={words.fields.passphrase.hint}
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(next) => {
            setValue(next);
            if (errors.passphrase) setErrors((e) => ({ ...e, passphrase: null }));
          }}
          inputRef={first}
          describedBy={meterId}
          error={errors.passphrase ? words.errors[errors.passphrase] : null}
        >
          <Meter id={meterId} value={value} />
        </TextField>
        <TextField
          label={words.fields.confirm.label}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(next) => {
            setConfirm(next);
            if (errors.confirm) setErrors((e) => ({ ...e, confirm: null }));
          }}
          inputRef={second}
          error={errors.confirm ? words.errors[errors.confirm] : null}
        />
        <details className="group border-y border-[color:var(--rule)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2 text-sm font-medium text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] [&::-webkit-details-marker]:hidden">
            {words.why.title}
            <Plus
              aria-hidden="true"
              strokeWidth={1.5}
              className="size-4 shrink-0 text-[color:var(--fg-muted)] transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none"
            />
          </summary>
          <p className={`${T.small} max-w-[52ch] pb-4`}>{words.why.body}</p>
        </details>
        <div className="flex">
          <Button type="submit" variant="primary" size="lg">
            {words.action.label}
          </Button>
        </div>
      </form>
    </StepFrame>
  );
}
