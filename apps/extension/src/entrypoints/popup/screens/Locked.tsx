import { extFrame } from "@baret/content/extension/frame.content";
import { locked } from "@baret/content/extension/popup/locked.content";
import { Button } from "@baret/ui";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { Img } from "@baret/web-ui/components/Img";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { PAUSE_MS, useExtension } from "../../../data/store.js";
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
 * The screen asks the store to open the wallet: the passphrase check, the
 * count of wrong tries and the pause live behind that seam, so leaving and
 * returning to this screen does not end a pause. The sample store keeps them
 * only while the popup is open; the keystore will keep them across reopens.
 * The pause is
 * announced once; its countdown is shown, not read, and its end is said once.
 */

export type LockReason = Exclude<keyof typeof locked.reason, "idleOne">;

/** Whole seconds until `until` (ms), counted down once a second while it lasts. */
function useSecondsLeft(until: number): number {
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    setClock(Date.now());
    if (until <= Date.now()) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setClock(at);
      if (at >= until) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [until]);
  return Math.max(0, Math.ceil((until - clock) / 1000));
}

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
  const { state, unlock } = useExtension();
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [working, setWorking] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [said, setSaid] = useState("");
  const open = useLatest(onOpen);

  const until = state.lock.pausedUntil ? Date.parse(state.lock.pausedUntil) : 0;
  const left = useSecondsLeft(until);
  const paused = left > 0;
  const pauseSeconds = Math.round(PAUSE_MS / 1000);

  // The end of a pause is said once, in the live region that is always there.
  const wasPaused = useRef(paused);
  useEffect(() => {
    if (wasPaused.current && !paused) setSaid(locked.errors.throttled.over);
    wasPaused.current = paused;
  }, [paused]);

  async function submit(): Promise<void> {
    if (paused || working || value === "") return;
    setWorking(true);
    setSaid("");
    const result = await unlock(value);
    if (result.ok) {
      open.current();
      return;
    }
    setWorking(false);
    setWrong(true);
    setValue("");
    input.current?.focus();
  }

  const reasonText =
    reason === "idle"
      ? counted(Number(values.count ?? 0), locked.reason.idle, locked.reason.idleOne, values)
      : fill(locked.reason[reason], values);
  const showError = paused || (wrong && !working);
  const locking = paused || working;

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
            void submit();
          }}
        >
          <Brand slit="var(--ground)" />
          <div className="grid gap-2">
            <TextReveal
              as="h1"
              text={locked.title}
              immediate
              className={`${T.h1Page} text-balance text-[color:var(--fg)]`}
            />
            <p className={T.small}>{reasonText}</p>
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
                aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
                aria-invalid={wrong && value === "" ? true : undefined}
                // Read-only, not disabled, so focus stays on the field during a pause.
                readOnly={locking}
                aria-disabled={locking ? true : undefined}
                // biome-ignore lint/a11y/noAutofocus: the field is the whole screen.
                autoFocus
                className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-muted)] aria-disabled:opacity-50"
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

          <div id={errorId}>
            {paused ? (
              <>
                <PopupProblem
                  title={locked.errors.throttled.title}
                  body={counted(
                    pauseSeconds,
                    locked.errors.throttled.body,
                    locked.errors.throttled.bodyOne,
                  )}
                />
                <p
                  aria-hidden="true"
                  className={`mt-2 pl-4 font-mono text-xs text-[color:var(--fg)] ${T.num}`}
                >
                  {counted(
                    left,
                    locked.errors.throttled.countdown,
                    locked.errors.throttled.countdownOne,
                  )}
                </p>
              </>
            ) : wrong && !working ? (
              <PopupProblem title={locked.errors.wrong.title} body={locked.errors.wrong.body} />
            ) : null}
          </div>
          <p aria-live="polite" className="sr-only">
            {said}
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={value === "" && !locking}
            aria-disabled={locking ? true : undefined}
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
