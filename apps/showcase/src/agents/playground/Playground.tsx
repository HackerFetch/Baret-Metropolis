import { agents, common } from "@baret/content";
import { Button } from "@baret/ui";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useEffect, useId, useState } from "react";
import { useCheck } from "../../sites/kit/useCheck.js";
import { PolicyPicker } from "./PolicyPicker.js";
import { Result } from "./Result.js";
import { ACTIONS, type ActionId, type PolicyName, randomAddress } from "./sample.js";
import { isAddress, LIVE, parseTransaction, senderOf, sourceFor } from "./source.js";
import { outcomeOf } from "./terminal.js";

/**
 * Watch an agent ask first. Pick what the agent tries and a starting policy,
 * then check it: the terminal prints the exchange and the answer appears
 * with its findings. Both the six actions and a pasted transaction go to
 * Baret only with VITE_BARET_PLAYGROUND=live; without it the six answer from
 * prepared samples and say so under the button, a pasted transaction sends
 * nothing and the answer is the fail-closed one. The agent address only
 * shows for a pasted transaction, the one run that reads it. One status
 * region announces each verdict; nothing runs until the button is pressed.
 */

const ID = "playground";
const { playground } = agents;
const { picker, fields, errors } = playground;
const SOURCE = sourceFor(LIVE);
const STEPS = 2;

type Choice = ActionId | "custom";
/** A pasted run that cannot start, and the field it points at. */
type FieldError = { readonly field: "address" | "transaction"; readonly message: string };

const sentence = (error: { title: string; body: string }): string =>
  `${error.title}. ${error.body}`;

const INPUT =
  "min-h-11 w-full border border-[color:var(--control-edge)] bg-[color:var(--surface)] px-3 py-2.5 font-mono text-sm text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

export function Playground({
  policy,
  onPolicy,
}: {
  policy: PolicyName;
  onPolicy: (next: PolicyName) => void;
}): JSX.Element {
  const name = useId();
  const addressId = useId();
  const addressHintId = useId();
  const addressErrorId = useId();
  const txId = useId();
  const txHintId = useId();
  const txErrorId = useId();
  const [choice, setChoice] = useState<Choice>("pay");
  const [address, setAddress] = useState(() => randomAddress());
  const [text, setText] = useState("");
  const [error, setError] = useState<FieldError | null>(null);
  const [said, setSaid] = useState("");
  const [runs, setRuns] = useState(0);
  const check = useCheck(STEPS, SOURCE);
  const options = [...ACTIONS, "custom"] as const;
  const describe = choice === "custom" ? picker.custom.body : picker.items[choice].body;

  function fail(next: FieldError): void {
    setError(next);
    setSaid(next.message);
  }

  function run(): void {
    if (choice === "custom") {
      const transaction = parseTransaction(text);
      if (!transaction) {
        fail({ field: "transaction", message: sentence(errors.unreadable) });
        return;
      }
      const from = senderOf(transaction, address.trim());
      if (!isAddress(from)) {
        fail({ field: "address", message: sentence(errors.address) });
        return;
      }
      setError(null);
      check.start({ kind: "custom", transaction, from, policy });
    } else {
      setError(null);
      check.start({ kind: "action", action: choice, policy });
    }
    setRuns((n) => n + 1);
  }

  const state = check.state;
  const addressError = error?.field === "address" && choice === "custom" ? error.message : null;
  const txError = error?.field === "transaction" && choice === "custom" ? error.message : null;

  // Announce each answer once: the status region reads the verdict and its sentence.
  useEffect(() => {
    if (state.phase !== "done") return;
    const outcome = outcomeOf(state.result);
    setSaid(`${playground.result[outcome].label}. ${playground.result[outcome].body}`);
  }, [state]);

  return (
    <Section id={ID} ground="ground">
      <SectionHeader titleId={titleIdOf(ID)} title={playground.title} body={playground.body} />
      <Reveal className="mt-12">
        <PolicyPicker value={policy} onChange={onPolicy} />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setSaid("");
            run();
          }}
          className="grid content-start gap-6 lg:col-span-5"
        >
          <fieldset>
            <legend className={`${T.h3} text-[color:var(--fg)]`}>{picker.label}</legend>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {options.map((id) => (
                <Segment
                  key={id}
                  name={name}
                  value={id}
                  checked={choice === id}
                  label={id === "custom" ? picker.custom.label : picker.items[id].label}
                  onSelect={(value) => setChoice(value as Choice)}
                />
              ))}
            </div>
            <p className={`${T.small} mt-3 min-h-[2lh]`}>{describe}</p>
          </fieldset>

          {choice === "custom" ? (
            <div className="grid gap-2">
              <label htmlFor={addressId} className={T.label}>
                {fields.address.label}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={addressId}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (error?.field === "address") setError(null);
                  }}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={addressError ? true : undefined}
                  aria-describedby={
                    addressError ? `${addressHintId} ${addressErrorId}` : addressHintId
                  }
                  className={`${INPUT} min-w-[16rem] flex-1`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAddress(randomAddress());
                    if (error?.field === "address") setError(null);
                  }}
                >
                  {playground.randomAddress.label}
                </Button>
              </div>
              <p id={addressHintId} className={T.small}>
                {fields.address.hint}
              </p>
              {addressError ? (
                <p id={addressErrorId} className="text-sm font-medium text-[color:var(--blocked)]">
                  {addressError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-1">
            <p className={T.label}>{fields.network.label}</p>
            <p className="font-mono text-sm text-[color:var(--fg)]">
              {common.networks.testnet.label}
            </p>
            <p className={T.small}>{fields.network.hint}</p>
          </div>

          {choice === "custom" ? (
            <div className="grid gap-2">
              <label htmlFor={txId} className={T.label}>
                {fields.transaction.label}
              </label>
              <textarea
                id={txId}
                rows={4}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error?.field === "transaction") setError(null);
                }}
                spellCheck={false}
                placeholder={fields.transaction.placeholder}
                aria-invalid={txError ? true : undefined}
                aria-describedby={txError ? `${txHintId} ${txErrorId}` : txHintId}
                className={`${INPUT} resize-y`}
              />
              <p id={txHintId} className={T.small}>
                {fields.transaction.hint}
              </p>
              {txError ? (
                <p id={txErrorId} className="text-sm font-medium text-[color:var(--blocked)]">
                  {txError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3">
            <Button type="submit" variant="primary" size="lg" className="w-full md:w-auto">
              {playground.action.label}
            </Button>
            {/* What actually happens on this run, without VITE_BARET_PLAYGROUND=live:
                prepared answers for the six actions, and for a pasted
                transaction a plain "not sent". With the flag both go live,
                and the footer note below says so instead. */}
            {choice !== "custom" ? (
              LIVE ? null : (
                <p className={T.small}>{playground.sample}</p>
              )
            ) : LIVE ? null : (
              <p className={T.small}>{playground.notSent}</p>
            )}
          </div>
        </form>

        {/* From 1024 px the answer stays in view while the form scrolls past. */}
        <div className="lg:sticky lg:top-24 lg:col-span-7 lg:self-start">
          <Result state={state} policy={policy} runKey={runs} />
        </div>
      </div>

      <div className="mt-12 grid gap-2 border-t border-[color:var(--rule)] pt-6">
        <p className={T.small}>{playground.note}</p>
        {LIVE ? <p className={T.small}>{playground.liveNote}</p> : null}
        <p className={T.small}>{playground.footnote}</p>
      </div>
      <p role="status" className="sr-only">
        {said}
      </p>
    </Section>
  );
}
