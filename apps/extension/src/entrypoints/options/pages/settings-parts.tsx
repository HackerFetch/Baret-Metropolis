import { common, extFrame, optionsSettings, policies } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { RuleSwitch } from "@baret/web-ui/components/RuleSwitch";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { ExternalLink } from "lucide-react";
import { type JSX, type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react";
import { Dialog, INPUT, Select } from "../parts/kit.js";

/**
 * The Settings page's pieces, in the wallet's settings grammar: a row (its
 * label, one plain line, its control; a switch takes the label's place), a
 * picker of minutes, a node or server of your own with its connection test,
 * and the two dialogs that ask for the passphrase. Sample rules stand in for
 * the keystore and the network: a passphrase of 12 characters or more opens,
 * an https:// address answers as Monad testnet after 700 ms, and nothing is
 * sent anywhere.
 */

const { security, network } = optionsSettings;

/** The sample keystore's rule, the one the locked screen states (extFrame.lockedHint). */
const MIN_PASSPHRASE = 12;

/** How long the sample node takes to answer the connection test. */
const ANSWER_MS = 700;

/** The twelve preview words, numbered by their place in the phrase. */
const WORDS = security.reveal.sample.map((word, index) => ({ word, n: index + 1 }));

const OUTSIDE =
  "inline-flex items-center gap-1.5 text-base font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 transition-colors hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

const EDGE = {
  safe: "border-[color:var(--safe)]",
  caution: "border-[color:var(--caution)]",
  blocked: "border-[color:var(--blocked)]",
  neutral: "border-[color:var(--rule-strong)]",
} as const;

/** One row: the label and its line take seven columns from 768 px, the control five. */
const ROW = "grid gap-3 py-4 md:grid-cols-12 md:items-start md:gap-6";

/** A line with an edge in the tone of what it says: an error, a warning, a result. */
export function Note({
  tone,
  id,
  children,
}: {
  tone: keyof typeof EDGE;
  id?: string | undefined;
  children: ReactNode;
}): JSX.Element {
  return (
    <p
      id={id}
      className={`border-l-4 pl-3 text-sm font-medium text-[color:var(--fg)] ${EDGE[tone]}`}
    >
      {children}
    </p>
  );
}

/** The hairline list a block's rows sit in. */
export function Rows({ children }: { children: ReactNode }): JSX.Element {
  return <ul className="grid border-t border-[color:var(--rule)]">{children}</ul>;
}

export function SettingRow({
  label,
  hint,
  control,
  href,
  toggle,
  group = false,
  children,
}: {
  label: string;
  hint?: string | undefined;
  control?: ReactNode;
  /** An outside page: the label itself is the link, and it opens in a new tab. */
  href?: string | undefined;
  /** A switch takes the label's place, so the label is not said twice. */
  toggle?: { on: boolean; onToggle: (on: boolean) => void } | undefined;
  /** The row's controls share one name, the label: two "Use my own" switches stay apart. */
  group?: boolean;
  /** Under the row, full width: what a switch reveals, a line of feedback. */
  children?: ReactNode;
}): JSX.Element {
  const labelId = useId();
  const cells = (
    <>
      <div className="grid min-w-0 gap-1 md:col-span-7">
        {toggle ? (
          <RuleSwitch
            label={label}
            stateWord={toggle.on ? policies.values.on : policies.values.off}
            on={toggle.on}
            onToggle={toggle.onToggle}
          />
        ) : (
          <p id={labelId} className="text-base font-medium text-[color:var(--fg)]">
            {href ? (
              <a href={href} target="_blank" rel="noreferrer" className={OUTSIDE}>
                {label}
                <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
              </a>
            ) : (
              label
            )}
          </p>
        )}
        {hint ? <p className={T.small}>{hint}</p> : null}
      </div>
      {control ? <div className="min-w-0 md:col-span-5 md:justify-self-end">{control}</div> : null}
      {children ? <div className="grid min-w-0 gap-3 md:col-span-12">{children}</div> : null}
    </>
  );
  return (
    <li className="border-b border-[color:var(--rule)]">
      {group ? (
        <fieldset aria-labelledby={labelId} className={`${ROW} min-w-0`}>
          {cells}
        </fieldset>
      ) : (
        <div className={ROW}>{cells}</div>
      )}
    </li>
  );
}

/**
 * A picker of minutes. The row already shows its label, so the picker's own
 * label is kept for screen readers only.
 */
export function MinutesSelect({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: number;
  choices: readonly number[];
  onChange: (minutes: number) => void;
}): JSX.Element {
  const { minutes, minutesOne } = optionsSettings;
  const options = choices.map((count) => ({
    value: String(count),
    label: counted(count, minutes, minutesOne),
  }));
  return (
    <Select
      label={label}
      value={String(value)}
      options={options}
      onChange={(picked) => onChange(Number(picked))}
      className="w-full md:w-48 [&>label]:sr-only"
    />
  );
}

type Answer = "idle" | "checking" | "sample" | "fail";

/** Whether the address is a well-formed https:// URL. Nothing is contacted. */
function answers(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && parsed.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * A node or a server of your own. "Use my own" reveals the address field,
 * the warning and the connection test. Until the settings seam carries these
 * addresses they live on this page only, so nothing claims "Saved". Nothing
 * is called either: an https:// address reads as not tested (never as
 * connected), and anything else as no answer.
 */
export function Endpoint({ label, hint }: { label: string; hint: string }): JSX.Element {
  const { custom } = network;
  const fieldId = useId();
  const [on, setOn] = useState(false);
  const [url, setUrl] = useState("");
  const [answer, setAnswer] = useState<Answer>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function forget(): void {
    window.clearTimeout(timer.current);
    setAnswer("idle");
  }

  function test(): void {
    window.clearTimeout(timer.current);
    setAnswer("checking");
    const ok = answers(url);
    timer.current = window.setTimeout(() => setAnswer(ok ? "sample" : "fail"), ANSWER_MS);
  }

  const result = {
    idle: "",
    checking: common.ui.checking,
    sample: custom.test.sample,
    fail: custom.test.fail,
  }[answer];
  const edge = { idle: "", checking: EDGE.neutral, sample: EDGE.neutral, fail: EDGE.blocked }[
    answer
  ];

  return (
    <SettingRow
      label={label}
      hint={hint}
      group
      control={
        <RuleSwitch
          label={custom.label}
          stateWord={on ? policies.values.on : policies.values.off}
          on={on}
          onToggle={(next) => {
            setOn(next);
            forget();
          }}
        />
      }
    >
      {on ? (
        <>
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={fieldId} className={T.label}>
              {fill(custom.field, { name: label })}
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id={fieldId}
                type="url"
                value={url}
                placeholder={custom.placeholder}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => {
                  setUrl(event.target.value);
                  forget();
                }}
                className={`${INPUT} grow basis-64 font-mono text-sm`}
              />
              <Button type="button" variant="ghost" disabled={answer === "checking"} onClick={test}>
                {custom.test.label}
              </Button>
            </div>
          </div>
          <Note tone="caution">{custom.warning}</Note>
          <p className={T.small}>{custom.pageOnly}</p>
          <p
            role="status"
            className={`min-h-5 text-sm font-medium text-[color:var(--fg)] ${edge ? `border-l-4 pl-3 ${edge}` : ""}`}
          >
            {result}
          </p>
        </>
      ) : null}
    </SettingRow>
  );
}

/** A passphrase field: its label above, a hint and an error under it. */
function PassphraseField({
  ref,
  label,
  value,
  onChange,
  hint,
  error,
  autoComplete,
}: {
  ref?: Ref<HTMLInputElement> | undefined;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error: string | null;
  autoComplete: "current-password" | "new-password";
}): JSX.Element {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const described = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className={T.label}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={described === "" ? undefined : described}
        className={INPUT}
      />
      {hint ? (
        <p id={hintId} className={T.small}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <Note tone="blocked" id={errorId}>
          {error}
        </Note>
      ) : null}
    </div>
  );
}

/**
 * Change passphrase: the current one, then the new one twice. The sample
 * keystore takes any current passphrase of 12 characters or more. The first
 * field that is wrong takes the focus, with its error read out.
 */
export function ChangePassphrase({ onDone }: { onDone: () => void }): JSX.Element {
  const { passphrase } = security;
  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);

  const currentError = current.length < MIN_PASSPHRASE ? passphrase.wrong : null;
  const nextError = next.length < MIN_PASSPHRASE ? passphrase.tooShort : null;
  const againError = again === next ? null : passphrase.mismatch;

  function close(): void {
    setOpen(false);
    setCurrent("");
    setNext("");
    setAgain("");
    setTried(false);
  }

  function confirm(): void {
    setTried(true);
    const wrong = currentError ? currentRef : nextError ? nextRef : againError ? againRef : null;
    if (wrong) {
      wrong.current?.focus();
      return;
    }
    close();
    onDone();
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {passphrase.action}
      </Button>
      <Dialog
        open={open}
        title={passphrase.title}
        action={passphrase.action}
        onConfirm={confirm}
        onCancel={close}
      >
        <PassphraseField
          ref={currentRef}
          label={passphrase.current}
          value={current}
          onChange={setCurrent}
          hint={extFrame.lockedHint}
          error={tried ? currentError : null}
          autoComplete="current-password"
        />
        <PassphraseField
          ref={nextRef}
          label={passphrase.next}
          value={next}
          onChange={setNext}
          error={tried ? nextError : null}
          autoComplete="new-password"
        />
        <PassphraseField
          ref={againRef}
          label={passphrase.confirm}
          value={again}
          onChange={setAgain}
          error={tried ? againError : null}
          autoComplete="new-password"
        />
      </Dialog>
    </>
  );
}

/**
 * Show recovery phrase: the passphrase and "Nobody can see my screen" first,
 * then the twelve words, numbered. The preview has no phrase, so it shows
 * twelve words that read as a sentence and says they are samples. Closing
 * the dialog hides them again.
 */
export function RevealPhrase({
  label,
  onWritten,
}: {
  label: string;
  onWritten: () => void;
}): JSX.Element {
  const { reveal } = security;
  const field = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [alone, setAlone] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [shown, setShown] = useState(false);

  function close(): void {
    setOpen(false);
    setValue("");
    setAlone(false);
    setWrong(false);
    setShown(false);
  }

  function confirm(): void {
    if (shown) {
      close();
      onWritten();
      return;
    }
    if (value.length < MIN_PASSPHRASE) {
      setWrong(true);
      field.current?.focus();
      return;
    }
    setValue("");
    setShown(true);
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        title={reveal.title}
        action={shown ? reveal.written : reveal.action}
        cancel={shown ? common.actions.close : common.actions.cancel}
        disabled={!shown && !alone}
        onConfirm={confirm}
        onCancel={close}
      >
        {shown ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Tag tone="neutral" size="sm">
                {extFrame.sample.tag}
              </Tag>
              <p className={`${T.small} min-w-[20ch] flex-1`}>{extFrame.sampleWords}</p>
            </div>
            <ol className="grid grid-cols-2 gap-x-6 border-t border-[color:var(--rule)] sm:grid-cols-3">
              {WORDS.map(({ word, n }) => (
                <li
                  key={n}
                  className="flex items-baseline gap-3 border-b border-[color:var(--rule)] py-2"
                >
                  <span className={`${T.label} ${T.num} w-5 shrink-0 text-right`}>{n}</span>
                  <span className="min-w-0 font-mono text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                    {word}
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p className={T.body}>{reveal.body}</p>
            <PassphraseField
              ref={field}
              label={reveal.passphrase}
              value={value}
              onChange={(next) => {
                setValue(next);
                setWrong(false);
              }}
              hint={extFrame.lockedHint}
              error={wrong ? reveal.wrong : null}
              autoComplete="current-password"
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-[color:var(--fg)]">
              <input
                type="checkbox"
                checked={alone}
                onChange={(event) => setAlone(event.currentTarget.checked)}
                className="size-5 shrink-0 accent-[color:var(--fg)]"
              />
              {reveal.confirm}
            </label>
          </>
        )}
      </Dialog>
    </>
  );
}

/** Saves a JSON file built on this device. Nothing leaves it. */
export function download(name: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
