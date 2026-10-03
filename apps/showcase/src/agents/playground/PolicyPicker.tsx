import { agents } from "@baret/content";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId } from "react";
import { POLICY_NAMES, type PolicyName } from "./sample.js";

/**
 * The starting policy, as three radio cards: the template's name and what it
 * does. One native radio group (one tab stop, arrow keys). The picked card
 * fills with ink, like the landing's segments; orange stays the focus ring.
 * The same choice drives the quickstart's code and the playground's answers.
 */

const { policySelector } = agents;

// The face lets the pointer through to the radio, so hover and click land on it everywhere.
const FACE =
  "pointer-events-none flex h-full flex-col gap-2 border border-[color:var(--control-edge)] p-4 transition-colors duration-150 peer-hover:border-[color:var(--fg)] peer-checked:border-[color:var(--fg)] peer-checked:bg-[color:var(--fg)] peer-checked:text-[color:var(--ground)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-[color:var(--accent)] forced-colors:peer-checked:border-[color:Highlight]";

export function PolicyPicker({
  value,
  onChange,
}: {
  value: PolicyName;
  onChange: (next: PolicyName) => void;
}): JSX.Element {
  const name = useId();
  return (
    <fieldset>
      <legend className={`${T.h3} text-[color:var(--fg)]`}>{policySelector.title}</legend>
      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        {POLICY_NAMES.map((id) => {
          const option = policySelector.options[id];
          return (
            <label key={id} className="relative block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={id}
                checked={value === id}
                onChange={() => onChange(id)}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
              />
              <span className={FACE}>
                <span className="font-display text-lg font-extrabold uppercase tracking-[0.04em]">
                  {option.name}
                </span>
                <span className="text-sm leading-normal opacity-80">{option.body}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className={`${T.small} mt-3`}>{policySelector.note}</p>
    </fieldset>
  );
}
