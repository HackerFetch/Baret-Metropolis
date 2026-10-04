import { policies, policy } from "@baret/content";
import { RuleSwitch } from "@baret/web-ui/components/RuleSwitch";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useId, useState } from "react";
import type { GuardPolicy, GuardPolicyField } from "../data/types.js";
import { groupsOf, inputText, kindOf, parseInput, valueText } from "./fields.js";

/**
 * The 25 rules, in the ten groups of content shared/policy, each with its
 * label and the plain line that says what happens when it fires. A switch
 * for each on/off rule, a field for each threshold (empty means no limit), a
 * radio group for the trust level, one entry per line for each list. Every
 * change goes into the draft; nothing applies until Save.
 */

const INPUT =
  "w-full border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 py-2.5 text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)]";

function ThresholdField({
  field,
  value,
  onChange,
}: {
  field: GuardPolicyField;
  value: GuardPolicy[GuardPolicyField];
  onChange: (value: GuardPolicy[GuardPolicyField]) => void;
}): JSX.Element {
  const id = useId();
  const hintId = useId();
  const words = policy.fields[field];
  const [text, setText] = useState(inputText(value));
  const unreadable = parseInput(field, text) === undefined;
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[color:var(--fg)]">
        {words.label}
      </label>
      <div className="flex max-w-[360px] items-stretch border border-[color:var(--control-edge)] bg-[color:var(--ground)] focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-solid focus-within:outline-[color:var(--focus)]">
        <input
          id={id}
          inputMode={kindOf(field) === "number" ? "numeric" : "decimal"}
          autoComplete="off"
          value={text}
          placeholder={valueText(field, null)}
          aria-invalid={unreadable ? true : undefined}
          aria-describedby={hintId}
          onChange={(event) => {
            setText(event.target.value);
            const next = parseInput(field, event.target.value);
            if (next !== undefined) onChange(next);
          }}
          className="w-0 min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-base text-[color:var(--fg)] tabular-nums outline-none placeholder:font-sans placeholder:text-[color:var(--fg-faint)]"
        />
        {"unit" in words && words.unit ? (
          <span className="flex items-center border-l border-[color:var(--rule)] px-3 text-sm text-[color:var(--fg-muted)]">
            {words.unit}
          </span>
        ) : null}
      </div>
      <p id={hintId} className={T.small}>
        {words.hint}
      </p>
    </div>
  );
}

function LevelField({
  value,
  onChange,
}: {
  value: GuardPolicy["minNansenTrustLevel"];
  onChange: (value: GuardPolicy["minNansenTrustLevel"]) => void;
}): JSX.Element {
  const name = useId();
  const words = policy.fields.minNansenTrustLevel;
  const options = words.options as Record<
    GuardPolicy["minNansenTrustLevel"],
    { label: string; hint: string }
  >;
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-[color:var(--fg)]">{words.label}</legend>
      <div className="mt-2 grid max-w-[520px] grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(options) as GuardPolicy["minNansenTrustLevel"][]).map((level) => (
          <Segment
            key={level}
            name={name}
            value={level}
            checked={value === level}
            label={options[level].label}
            onSelect={(next) => onChange(next as GuardPolicy["minNansenTrustLevel"])}
          />
        ))}
      </div>
      <p className={T.small}>{options[value].hint}</p>
      <p className={T.small}>{words.hint}</p>
    </fieldset>
  );
}

function ListField({
  field,
  value,
  onChange,
}: {
  field: GuardPolicyField;
  value: string[];
  onChange: (value: string[]) => void;
}): JSX.Element {
  const id = useId();
  const hintId = useId();
  const words = policy.fields[field];
  const [text, setText] = useState(inputText(value));
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-[color:var(--fg)]">
          {words.label}
        </label>
        <span className={T.small}>{valueText(field, value)}</span>
      </div>
      <textarea
        id={id}
        rows={3}
        value={text}
        spellCheck={false}
        aria-describedby={hintId}
        onChange={(event) => {
          setText(event.target.value);
          const next = parseInput(field, event.target.value);
          if (Array.isArray(next)) onChange(next);
        }}
        className={`${INPUT} max-w-[520px] resize-y font-mono text-sm`}
      />
      <p id={hintId} className={T.small}>
        {words.hint}
      </p>
    </div>
  );
}

export function RuleEditor({
  draft,
  onChange,
  only,
  query,
}: {
  draft: GuardPolicy;
  onChange: (next: GuardPolicy) => void;
  /** One group alone (the options page's category filter). */
  only?: keyof typeof policy.groups | null;
  /** Rules whose label or hint holds this text (the options page's search). */
  query?: string;
}): JSX.Element | null {
  const set = <F extends GuardPolicyField>(field: F, value: GuardPolicy[F]) =>
    onChange({ ...draft, [field]: value });
  const needle = (query ?? "").trim().toLowerCase();
  const shown = groupsOf()
    .filter(({ group }) => !only || group === only)
    .map(({ group, fields }) => ({
      group,
      fields: needle
        ? fields.filter((field) =>
            `${policy.fields[field].label} ${policy.fields[field].hint}`
              .toLowerCase()
              .includes(needle),
          )
        : fields,
    }))
    .filter(({ fields }) => fields.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="grid gap-10">
      {shown.map(({ group, fields }) => (
        <section
          key={group}
          aria-labelledby={`group-${group}`}
          className="grid gap-5 border-t border-[color:var(--rule)] pt-5 md:grid-cols-12 md:gap-8"
        >
          <div className="grid content-start gap-2 md:col-span-4">
            <h3 id={`group-${group}`} className={`${T.h3} text-[color:var(--fg)]`}>
              {policy.groups[group].title}
            </h3>
            <p className={T.small}>{policy.groups[group].body}</p>
          </div>
          <div className="grid content-start gap-6 md:col-span-8">
            {fields.map((field) => {
              const kind = kindOf(field);
              const value = draft[field];
              if (kind === "switch" && typeof value === "boolean") {
                return (
                  <div key={field} className="grid gap-1">
                    <RuleSwitch
                      label={policy.fields[field].label}
                      stateWord={value ? policies.values.on : policies.values.off}
                      on={value}
                      onToggle={(on) => set(field, on)}
                    />
                    <p className={T.small}>{policy.fields[field].hint}</p>
                  </div>
                );
              }
              if (kind === "level") {
                return (
                  <LevelField
                    key={field}
                    value={draft.minNansenTrustLevel}
                    onChange={(next) => set("minNansenTrustLevel", next)}
                  />
                );
              }
              if (kind === "list" && Array.isArray(value)) {
                return (
                  <ListField
                    key={field}
                    field={field}
                    value={value}
                    onChange={(next) => set(field, next)}
                  />
                );
              }
              return (
                <ThresholdField
                  key={field}
                  field={field}
                  value={value}
                  onChange={(next) => set(field, next)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
