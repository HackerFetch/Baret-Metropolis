import { policies, policy } from "@baret/content";
import { Button } from "@baret/ui";
import { Block, Problem } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { when } from "@baret/wallet-ui/data/format";
import { changedFields, diffFields, fromTemplate } from "@baret/wallet-ui/data/rules";
import { useWallet } from "@baret/wallet-ui/data/store";
import type { GuardPolicy } from "@baret/wallet-ui/data/types";
import { fromJson, type Preview, preview, valueText } from "@baret/wallet-ui/rules/fields";
import { RuleEditor } from "@baret/wallet-ui/rules/RuleEditor";
import { TemplateCards } from "@baret/wallet-ui/rules/TemplateCards";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { useId, useRef, useState } from "react";
import type { PolicyTemplateName } from "../../../../packages/guard/src/policy-templates.js";
import { WALLET_ART } from "../assets.js";

/**
 * Your rules: where they stand (a template, or Custom with how many rules
 * changed), the three templates to start from, the 25 rules as a form or as
 * the exact JSON Baret evaluates, a preview of recent requests under the
 * draft, the history of changes, export and import, and how the rules work.
 * Nothing applies until Save, and Save is checked against the same schema
 * the server uses. No rule turns off fail-closed, and the page says so.
 */

type Tab = "form" | "json";

function download(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "baret-rules.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function Component() {
  const { state, dispatch } = useWallet();
  const tabName = useId();
  const jsonId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<GuardPolicy>(state.policy);
  const [template, setTemplate] = useState<PolicyTemplateName>(state.template);
  const [editor, setEditor] = useState(0);
  const [tab, setTab] = useState<Tab>("form");
  const [json, setJson] = useState(() => JSON.stringify(state.policy, null, 2));
  const [notice, setNotice] = useState<{
    kind: "saved" | "invalid" | "import";
    field?: string;
  } | null>(null);
  const [previewed, setPreviewed] = useState<Preview | null>(null);

  const unsaved = diffFields(state.policy, draft).length > 0 || template !== state.template;
  const changed = changedFields(draft, template);
  const templateName = policy.templates[template].name;

  /** Replace the whole draft (a template, a reset, JSON, an import): the form starts over from it. */
  function replace(next: GuardPolicy): void {
    setDraft(next);
    setJson(JSON.stringify(next, null, 2));
    setEditor((n) => n + 1);
    setPreviewed(null);
  }

  async function save(): Promise<void> {
    let next = draft;
    if (tab === "json") {
      const parsed = fromJson(json);
      if (!parsed) {
        setNotice({ kind: "invalid" });
        return;
      }
      next = parsed;
    }
    // The schema loads with the first save only, so zod stays out of the page's first chunk.
    const { guardPolicySchema } = await import("@baret/guard");
    const checked = guardPolicySchema.safeParse(next);
    if (!checked.success) {
      const field = String(checked.error.issues[0]?.path[0] ?? "");
      setNotice({ kind: "invalid", field });
      return;
    }
    dispatch({ type: "saveRules", policy: checked.data, template, at: new Date().toISOString() });
    replace(checked.data);
    setNotice({ kind: "saved" });
  }

  async function importFile(file: File): Promise<void> {
    const parsed = fromJson(await file.text());
    const { guardPolicySchema } = await import("@baret/guard");
    const checked = parsed ? guardPolicySchema.safeParse(parsed) : null;
    if (!checked?.success) {
      setNotice({ kind: "import" });
      return;
    }
    replace(checked.data);
    setNotice(null);
  }

  return (
    <Screen title={policies.title} body={policies.body} picture={WALLET_ART.policies}>
      <div className="grid gap-12">
        <Block title={policies.current.title}>
          <div className="grid gap-2">
            <p className="font-display text-3xl font-extrabold uppercase text-[color:var(--fg)]">
              {changed.length === 0 ? templateName : policies.current.custom.label}
            </p>
            <p className={T.body}>
              {changed.length === 0
                ? fill(policies.current.matches, { template: templateName })
                : fill(policies.current.custom.note, {
                    template: templateName,
                    count: String(changed.length),
                  })}
            </p>
            <p className={T.small}>{policy.intro.failClosed}</p>
          </div>
          <TemplateCards
            value={template}
            onPick={(name) => {
              setTemplate(name);
              replace(fromTemplate(name, draft.allowedAssets));
            }}
          />
          <p className={T.small}>{policy.templates.footnote}</p>
          {changed.length > 0 ? (
            <div className="flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => replace(fromTemplate(template, draft.allowedAssets))}
              >
                {fill(policies.actions.reset, { template: templateName })}
              </Button>
            </div>
          ) : null}
        </Block>

        <Block title={policies.actions.edit}>
          <fieldset>
            <legend className="sr-only">{policies.actions.edit}</legend>
            <div className="flex gap-0 border border-[color:var(--control-edge)] w-max">
              {(["form", "json"] as const).map((id) => (
                <label
                  key={id}
                  className="relative flex h-10 cursor-pointer items-center px-4 font-display text-sm font-extrabold uppercase tracking-[0.06em] text-[color:var(--fg-muted)] has-[:checked]:bg-[color:var(--fg)] has-[:checked]:text-[color:var(--ground)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-[color:var(--accent)]"
                >
                  <input
                    type="radio"
                    name={tabName}
                    value={id}
                    checked={tab === id}
                    onChange={() => {
                      if (id === "json") setJson(JSON.stringify(draft, null, 2));
                      else {
                        const parsed = fromJson(json);
                        if (parsed) replace(parsed);
                      }
                      setTab(id);
                    }}
                    className="sr-only"
                  />
                  {policy.editor.tabs[id]}
                </label>
              ))}
            </div>
          </fieldset>

          {tab === "form" ? (
            <RuleEditor
              key={editor}
              draft={draft}
              onChange={(next) => {
                setDraft(next);
                setPreviewed(null);
              }}
            />
          ) : (
            <div className="grid gap-2">
              <label htmlFor={jsonId} className={T.label}>
                {policy.editor.tabs.json}
              </label>
              <textarea
                id={jsonId}
                rows={18}
                spellCheck={false}
                value={json}
                onChange={(event) => setJson(event.target.value)}
                className="w-full resize-y border border-[color:var(--control-edge)] bg-[color:var(--ground)] p-4 font-mono text-sm text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)]"
              />
              <p className={T.small}>{policy.editor.jsonHint}</p>
            </div>
          )}

          <div className="grid gap-3 border-t border-[color:var(--rule-strong)] pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" size="lg" onClick={() => void save()}>
                {policy.editor.save}
              </Button>
              {unsaved ? (
                <p className="text-sm text-[color:var(--fg)]">{policy.editor.unsaved}</p>
              ) : null}
            </div>
            <p className={T.small}>{policy.intro.note}</p>
            <div role="status">
              {notice?.kind === "saved" ? (
                <p className="text-sm text-[color:var(--fg)]">{policy.editor.saved}</p>
              ) : null}
            </div>
            {notice?.kind === "invalid" ? (
              <Problem
                {...(notice.field && notice.field in policy.fields
                  ? { title: policy.fields[notice.field as keyof typeof policy.fields].label }
                  : {})}
                body={policy.editor.invalid}
              />
            ) : null}
          </div>
        </Block>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
          <Block title={policies.preview.title}>
            <p className={T.body}>
              {fill(policies.preview.body, {
                count: String(preview(state.activity, state.policy, draft).count),
              })}
            </p>
            <div className="flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewed(preview(state.activity, state.policy, draft))}
              >
                {policies.preview.run}
              </Button>
            </div>
            <div role="status" className="grid gap-1 text-sm text-[color:var(--fg)]">
              {previewed === null ? null : previewed.count === 0 ? (
                <p>{policies.preview.empty}</p>
              ) : previewed.stricter === 0 && previewed.looser === 0 ? (
                <p>{policies.preview.same}</p>
              ) : (
                <>
                  {previewed.stricter > 0 ? (
                    <p>{fill(policies.preview.stricter, { count: String(previewed.stricter) })}</p>
                  ) : null}
                  {previewed.looser > 0 ? (
                    <p>{fill(policies.preview.looser, { count: String(previewed.looser) })}</p>
                  ) : null}
                </>
              )}
            </div>
          </Block>

          <Block title={policies.history.title}>
            {state.ruleChanges.length === 0 ? (
              <p className={T.body}>{policies.history.empty}</p>
            ) : (
              <ul className="grid border-t border-[color:var(--rule)]">
                {state.ruleChanges.map((change) => (
                  <li
                    key={`${change.field}-${change.at}`}
                    className="grid gap-1 border-b border-[color:var(--rule)] py-3"
                  >
                    <p className="text-sm text-[color:var(--fg)]">
                      {fill(policies.history.row, {
                        rule: policy.fields[change.field].label,
                        previous: valueText(change.field, change.previous),
                        value: valueText(change.field, change.value),
                      })}
                    </p>
                    <time
                      dateTime={change.at}
                      className="font-mono text-xs text-[color:var(--fg-muted)]"
                    >
                      {when(change.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => download(JSON.stringify(state.policy, null, 2))}
              >
                {policies.actions.export}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                {policies.actions.import}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importFile(file);
                  event.target.value = "";
                }}
              />
            </div>
            {notice?.kind === "import" ? (
              <Problem title={policies.errors.import.title} body={policies.errors.import.body} />
            ) : null}
          </Block>
        </div>

        <Block title={policies.help.title}>
          <ul className="grid gap-6 md:grid-cols-2 md:gap-8">
            {policies.help.items.map((item) => (
              <li
                key={item.title}
                className="grid content-start gap-2 border-t-2 border-[color:var(--fg)] pt-4"
              >
                <p className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
                  {item.title}
                </p>
                <p className={T.body}>{item.body}</p>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </Screen>
  );
}
