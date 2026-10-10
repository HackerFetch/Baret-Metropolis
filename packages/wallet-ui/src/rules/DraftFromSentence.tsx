import { policies, policy } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId, useRef, useState } from "react";
import type { GuardPolicy, GuardPolicyField } from "../data/types.js";
import { kindOf, valueText } from "./fields.js";

/**
 * Rules from a sentence: KIMI reads what the person wrote and suggests
 * changes to the rules (POST /v1/policy/draft). The server checks every
 * change against the policy schema and marks the ones that loosen a rule.
 *
 * Nothing is saved here. Ticked changes go into the page's draft, and the
 * page's own diff, preview and Save gate apply after that. A change that
 * loosens a rule starts unticked (D-028: a model never decides; the person
 * does). A failure never removes the form: the input and the sentence
 * stay, and one line in the status region says what to do. A 422 (the
 * model's answer did not fit the rules) asks for other words; anything else
 * (no key, no answer, a limit, a timeout, no network, a bad body) says to
 * try again in a minute. Submitting again is the retry.
 */

/** Both apps reach the server at /api: the Vite proxy in dev, a Vercel rewrite in production. */
export const POLICY_DRAFT_URL = "/api/v1/policy/draft";

/** The server gives the model its own timeout; past this the ask counts as failed. */
const TIMEOUT_MS = 35_000;

type Value = GuardPolicy[GuardPolicyField];

export interface DraftChange {
  field: GuardPolicyField;
  from: Value;
  to: Value;
  why: string;
  loosens: boolean;
}

export interface DraftAnswer {
  changes: DraftChange[];
  /** Unknown fields and bad values, in the server's words. */
  refused: { field: string; reason: string }[];
  note: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isField = (v: unknown): v is GuardPolicyField =>
  typeof v === "string" && Object.hasOwn(policy.fields, v);

/** A value of the right kind for its field; anything else is refused on this side too. */
function fits(field: GuardPolicyField, v: unknown): v is Value {
  switch (kindOf(field)) {
    case "switch":
      return typeof v === "boolean";
    case "number":
      return v === null || (typeof v === "number" && Number.isFinite(v));
    case "amount":
      return v === null || typeof v === "string";
    case "level":
      return typeof v === "string";
    case "list":
      return Array.isArray(v) && v.every((item) => typeof item === "string");
  }
}

/**
 * The /v1/policy/draft answer, or null when it is not one. A change the
 * wallet can't read moves to refused instead of being guessed at.
 */
export function parseDraftAnswer(body: unknown): DraftAnswer | null {
  if (!isObject(body) || !Array.isArray(body.changes)) return null;
  const changes: DraftChange[] = [];
  const refused: DraftAnswer["refused"] = [];
  for (const raw of body.changes) {
    if (!isObject(raw)) return null;
    const { field, from, to, why, loosens } = raw;
    if (!isField(field) || !fits(field, to) || !fits(field, from)) {
      refused.push({
        field: String(field),
        reason: isField(field) ? policies.draft.badValue : policies.draft.unknownRule,
      });
      continue;
    }
    changes.push({
      field,
      from,
      to,
      why: typeof why === "string" ? why : "",
      // Fail-closed: a change the server did not mark as tightening counts as loosening.
      loosens: loosens !== false,
    });
  }
  if (Array.isArray(body.refused)) {
    for (const raw of body.refused) {
      if (!isObject(raw)) continue;
      refused.push({
        field: String(raw.field ?? ""),
        reason: typeof raw.reason === "string" ? raw.reason : policies.draft.unknownRule,
      });
    }
  }
  // One change per field (the last one wins) and each refusal once, so every row has its own key.
  const byField = new Map(changes.map((change) => [change.field, change]));
  const seen = new Set<string>();
  return {
    changes: [...byField.values()],
    refused: refused.filter((item) => {
      const key = `${item.field}:${item.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    note: typeof body.note === "string" ? body.note : "",
  };
}

/**
 * What one ask gave back. A failure keeps the HTTP status (0 for a network
 * error, an abort or the timeout) and the body's `error` code when it parses.
 */
export type DraftResult =
  | { ok: true; answer: DraftAnswer }
  | { ok: false; status: number; code: string | null };

/** The body's `error` code, or null when the body is not JSON or has none. */
async function errorCode(res: Response): Promise<string | null> {
  try {
    const body: unknown = await res.json();
    return isObject(body) && typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

/** Asks the server once and never throws. */
export async function fetchDraft(
  sentence: string,
  current: GuardPolicy,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<DraftResult> {
  let res: Response;
  try {
    res = await fetchImpl(POLICY_DRAFT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sentence, current }),
      signal: signal ?? null,
    });
  } catch {
    return { ok: false, status: 0, code: null };
  }
  if (!res.ok) return { ok: false, status: res.status, code: await errorCode(res) };
  let answer: DraftAnswer | null = null;
  try {
    answer = parseDraftAnswer(await res.json());
  } catch {
    // A body that is not JSON, or a read cut off by the timeout, reads as a bad body.
  }
  return answer ? { ok: true, answer } : { ok: false, status: res.status, code: null };
}

/** A 422 means the model's answer did not fit the rules; everything else is "try later". */
const reasonOf = (result: { status: number; code: string | null }): "invalid" | "other" =>
  result.status === 422 || result.code === "policy_draft_invalid" ? "invalid" : "other";

/** The draft with only the ticked changes laid over it. */
export function applyTicked(
  draft: GuardPolicy,
  changes: readonly DraftChange[],
  ticked: ReadonlySet<number>,
): GuardPolicy {
  const next: Record<string, unknown> = { ...draft };
  changes.forEach((change, index) => {
    if (ticked.has(index)) next[change.field] = change.to;
  });
  return next as GuardPolicy;
}

/** Tightening changes start ticked; loosening ones wait for the person. */
const defaults = (changes: readonly DraftChange[]) =>
  new Set(changes.flatMap((change, index) => (change.loosens ? [] : [index])));

/** A refused field by its label; one Baret does not have reads as the server named it. */
const label = (field: string) =>
  isField(field) ? policy.fields[field].label : field || policies.draft.unknownRule;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; answer: DraftAnswer; ticked: Set<number> }
  | { status: "applied" }
  | { status: "failed"; reason: "invalid" | "other" };

export function DraftFromSentence({
  draft,
  onApply,
  fetchImpl,
}: {
  /** The page's current draft: sent as `current`, and what ticked changes are laid over. */
  draft: GuardPolicy;
  onApply: (next: GuardPolicy) => void;
  /** Tests pass a stub; the page leaves it out. */
  fetchImpl?: typeof fetch;
}): JSX.Element {
  const inputId = useId();
  const [sentence, setSentence] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  async function ask(): Promise<void> {
    const text = sentence.trim();
    if (text.length === 0 || state.status === "loading") return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
    setState({ status: "loading" });
    const result = await fetchDraft(text.slice(0, 400), draft, abort.signal, fetchImpl);
    clearTimeout(timer);
    if (controller.current !== abort) return;
    setState(
      result.ok
        ? { status: "ready", answer: result.answer, ticked: defaults(result.answer.changes) }
        : { status: "failed", reason: reasonOf(result) },
    );
  }

  function toggle(index: number): void {
    if (state.status !== "ready") return;
    const ticked = new Set(state.ticked);
    if (ticked.has(index)) ticked.delete(index);
    else ticked.add(index);
    setState({ ...state, ticked });
  }

  return (
    <div className="grid gap-4 border-t border-[color:var(--rule-strong)] pt-5">
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label htmlFor={inputId} className={T.label}>
          {policies.draft.label}
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id={inputId}
            type="text"
            maxLength={400}
            value={sentence}
            placeholder={policies.draft.placeholder}
            onChange={(event) => setSentence(event.target.value)}
            className="h-11 min-w-0 flex-1 basis-64 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 text-sm text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)]"
          />
          <Button
            type="submit"
            variant="ghost"
            disabled={sentence.trim().length === 0 || state.status === "loading"}
          >
            {policies.draft.submit}
          </Button>
        </div>
        <p className={T.small}>{policies.draft.byline}</p>
      </form>

      <div role="status" className="text-sm text-[color:var(--fg)]">
        {state.status === "loading" ? <p>{policies.draft.running}</p> : null}
        {state.status === "applied" ? <p>{policies.draft.applied}</p> : null}
        {state.status === "failed" ? <p>{policies.draft.failed[state.reason]}</p> : null}
      </div>

      {state.status === "ready" ? (
        <div className="grid gap-4">
          {state.answer.note ? <p className={T.body}>{state.answer.note}</p> : null}
          {state.answer.changes.length === 0 ? (
            <p className={T.body}>{policies.draft.none}</p>
          ) : (
            <fieldset className="grid gap-2">
              <legend className={T.label}>{policies.draft.changesTitle}</legend>
              <ul className="grid border-t border-[color:var(--rule)]">
                {state.answer.changes.map((change, index) => (
                  <li key={change.field} className="border-b border-[color:var(--rule)] py-3">
                    <label className="flex cursor-pointer gap-3">
                      <input
                        type="checkbox"
                        checked={state.ticked.has(index)}
                        onChange={() => toggle(index)}
                        className="mt-1 size-4 shrink-0 accent-[color:var(--fg)]"
                      />
                      <span className="grid gap-1">
                        <span className="font-display text-base font-bold uppercase text-[color:var(--fg)]">
                          {policy.fields[change.field].label}
                        </span>
                        <span className="text-sm text-[color:var(--fg)]">
                          {fill(policies.draft.change, {
                            from: valueText(change.field, change.from),
                            to: valueText(change.field, change.to),
                          })}
                        </span>
                        {change.why ? <span className={T.small}>{change.why}</span> : null}
                        {change.loosens ? (
                          <span className="text-sm font-bold text-[color:var(--fg)]">
                            {policies.draft.loosens}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex">
                <Button
                  type="button"
                  variant="primary"
                  disabled={state.ticked.size === 0}
                  onClick={() => {
                    onApply(applyTicked(draft, state.answer.changes, state.ticked));
                    setState({ status: "applied" });
                  }}
                >
                  {policies.draft.apply}
                </Button>
              </div>
            </fieldset>
          )}
          {state.answer.refused.length > 0 ? (
            <div className="grid gap-1">
              <p className={T.label}>{policies.draft.refusedTitle}</p>
              <ul className="grid gap-1">
                {state.answer.refused.map((item) => (
                  <li key={`${item.field}:${item.reason}`} className={T.small}>
                    {label(item.field)}: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
