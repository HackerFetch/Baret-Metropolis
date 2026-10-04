import { extFrame, locked } from "@baret/content";
import { Button } from "@baret/ui";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { Img } from "@baret/web-ui/components/Img";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { useLatest } from "../../../lib/useLatest.js";
import { PopupProblem, TEXT_BUTTON } from "../frame/bits.js";
import { Confirm } from "../frame/Sheet.js";

/**
 * Locked: one field and nothing else. The line under the title says why the
 * wallet is locked right now, including a site that is waiting. The button
 * never says "unlock" (BRAND section 09). A wrong passphrase says to check
 * Caps Lock; five in a row pause the field for thirty seconds, and the pause
 * says why. Forgetting the passphrase is explained honestly: nobody can
 * recover it, and only the recovery phrase brings the wallet back.
 *
 * The sample wallet opens with any passphrase of twelve characters or more,
 * and the hint under the field says so.
 */

export type LockReason = keyof typeof locked.reason;

const PAUSE_AFTER = 5;
const PAUSE_SECONDS = 30;

export function Locked({
  reason,
  values,
  onOpen,
  onReset,
}: {
  reason: LockReason;
  /** {count} for idle, {origin} for a waiting site. */
  values: Readonly<Record<string, string>>;
  onOpen: () => void;
  onReset: () => void;
}): JSX.Element {
  const fieldId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [pause, setPause] = useState(0);
  const [working, setWorking] = useState(false);
  const [forgot, setForgot] = useState(false);

  // The pause after too many tries counts down a second at a time.
  useEffect(() => {
    if (pause <= 0) return;
    const id = window.setTimeout(() => setPause((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [pause]);

  // The stand-in for the keystore: a short wait, then the wallet.
  const open = useLatest(onOpen);
  useEffect(() => {
    if (!working) return;
    const id = window.setTimeout(() => open.current(), 600);
    return () => window.clearTimeout(id);
  }, [working, open]);

  function submit(): void {
    if (pause > 0 || working) return;
    if (value.length >= 12) {
      setWorking(true);
      return;
    }
    const tries = wrong + 1;
    setWrong(tries);
    if (tries % PAUSE_AFTER === 0) setPause(PAUSE_SECONDS);
    setValue("");
    input.current?.focus();
  }

  const paused = pause > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className="relative aspect-[5/2] overflow-hidden border-b border-[color:var(--rule)]"
          style={{ backgroundColor: POPUP_ART.locked.ground }}
        >
          <Img asset={POPUP_ART.locked} loading="priority" sizes="360px" position="50% 45%" />
        </div>
        <form
          className="@container grid gap-5 px-5 pt-5 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Brand />
          <div className="grid gap-2">
            <TextReveal
              as="h1"
              text={locked.title}
              immediate
              className={`${T.h1Page} text-balance text-[color:var(--fg)]`}
            />
            <p className={T.small}>{fill(locked.reason[reason], values)}</p>
          </div>
          <p className={T.body}>{locked.body}</p>

          <div className="grid gap-2">
            <label htmlFor={fieldId} className={T.label}>
              {locked.field.label}
            </label>
            <div className="flex border border-[color:var(--control-edge)] focus-within:border-[color:var(--fg)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-solid focus-within:outline-[color:var(--accent)]">
              <input
                ref={input}
                id={fieldId}
                type={shown ? "text" : "password"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={locked.field.placeholder}
                autoComplete="current-password"
                aria-describedby={hintId}
                aria-invalid={wrong > 0 && value === "" ? true : undefined}
                disabled={paused || working}
                // biome-ignore lint/a11y/noAutofocus: the field is the whole screen.
                autoFocus
                className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-muted)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShown((s) => !s)}
                aria-pressed={shown}
                className="px-3 font-mono text-xs uppercase tracking-[0.08em] text-[color:var(--fg)] hover:bg-[color:var(--ground-deep)] focus-visible:outline-none"
              >
                {shown ? locked.field.hide : locked.field.show}
              </button>
            </div>
            <p id={hintId} className="text-xs text-[color:var(--fg-muted)]">
              {extFrame.lockedHint}
            </p>
          </div>

          {paused ? (
            <PopupProblem
              title={locked.errors.throttled.title}
              body={fill(locked.errors.throttled.body, { seconds: String(pause) })}
            />
          ) : wrong > 0 && !working ? (
            <PopupProblem title={locked.errors.wrong.title} body={locked.errors.wrong.body} />
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={paused || working || value === ""}
          >
            {working ? locked.working : locked.action.label}
          </Button>
          <div className="flex justify-center">
            <button type="button" onClick={() => setForgot(true)} className={TEXT_BUTTON}>
              {locked.forgot.label}
            </button>
          </div>
        </form>
      </div>

      <Confirm
        open={forgot}
        title={locked.forgot.title}
        action={locked.forgot.reset.label}
        cancel={locked.forgot.cancel.label}
        onCancel={() => setForgot(false)}
        onConfirm={() => {
          setForgot(false);
          onReset();
        }}
      >
        <p className={T.small}>{locked.forgot.body}</p>
        <p className="text-sm text-[color:var(--fg)]">{locked.forgot.restore}</p>
        <p className={T.small}>{locked.forgot.noPhrase}</p>
        <p className="border-l-4 border-[color:var(--blocked)] pl-3 text-sm text-[color:var(--fg)]">
          {locked.forgot.resetNote}
        </p>
      </Confirm>
    </div>
  );
}
