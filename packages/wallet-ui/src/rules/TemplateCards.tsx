import { policies, policy } from "@baret/content";
import { type JSX, useId } from "react";
import type { PolicyTemplateName } from "../../../guard/src/policy-templates.js";
import { TEMPLATE_NAMES } from "../data/rules.js";

/**
 * The three starting templates as radio cards: the name, what it is for and
 * its highlights, all from content shared/policy. One native radio group, so
 * one tab stop and the arrow keys; the picked card fills with ink. Used by
 * the rules page and by setup.
 */
export function TemplateCards({
  value,
  onPick,
}: {
  value: PolicyTemplateName;
  onPick: (name: PolicyTemplateName) => void;
}): JSX.Element {
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{policies.actions.useTemplate}</legend>
      <div className="grid gap-2 md:grid-cols-3">
        {TEMPLATE_NAMES.map((id) => {
          const template = policy.templates[id];
          return (
            <label key={id} className="relative block cursor-pointer">
              <input
                type="radio"
                name={name}
                value={id}
                checked={value === id}
                onChange={() => onPick(id)}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
              />
              <span className="pointer-events-none flex h-full flex-col gap-3 border border-[color:var(--control-edge)] p-5 transition-colors duration-150 peer-hover:border-[color:var(--fg)] peer-checked:border-[color:var(--fg)] peer-checked:bg-[color:var(--fg)] peer-checked:text-[color:var(--ground)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-[color:var(--accent)]">
                <span className="font-display text-xl font-extrabold uppercase tracking-[0.04em]">
                  {template.name}
                </span>
                <span className="text-sm leading-normal opacity-85">{template.body}</span>
                <ul className="grid gap-1.5 border-t border-current/20 pt-3">
                  {template.highlights.map((line) => (
                    <li key={line} className="text-sm leading-snug opacity-85">
                      {line}
                    </li>
                  ))}
                </ul>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
