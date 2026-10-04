import { common, optionsPolicies, policy } from "@baret/content";
import { Button, Tag } from "@baret/ui";
import { Block, Problem } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { changedFields, diffFields, fromTemplate } from "@baret/wallet-ui/data/rules";
import { type Preview, preview, valueText } from "@baret/wallet-ui/rules/fields";
import { RuleEditor } from "@baret/wallet-ui/rules/RuleEditor";
import { TemplateCards } from "@baret/wallet-ui/rules/TemplateCards";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { Link, useBlocker } from "react-router";
import { OPTIONS_ART } from "../../../assets.js";
import { checkJson, direction, type JsonIssue } from "../../../data/rules.js";
import { type TemplateName, useExtension } from "../../../data/store.js";
import type { GuardPolicy, GuardPolicyField } from "../../../data/types.js";
import { useLatest } from "../../../lib/useLatest.js";
import { Dialog, INPUT, LINK, Search, Select } from "../parts/kit.js";

/**
 * Rules: the 25 rules Baret checks every sign request against. Start from a
 * set (switching shows every change before anything is saved), then edit the
 * rules by group or by search, or the exact JSON Baret evaluates. Changes
 * shows each difference as stricter or looser with its own undo; the preview
 * runs the draft over recent requests. Saving is explicit, checked against
 * the server's own schema (loaded with the first save), and leaving with
 * unsaved changes asks first. Export and import keep a set as a file.
 */

const P = optionsPolicies;
type View = "form" | "json" | "diff";
type Group = keyof typeof policy.groups;

function download(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "baret-rules.json";
  link.click();
  URL.revokeObjectURL(url);
}

function issueText(issue: JsonIssue): string {
  const { errors, expected } = P.json;
  if (issue.kind === "syntax") return fill(errors.syntax, { line: String(issue.line) });
  if (issue.kind === "unknownKey") return fill(errors.unknownKey, { key: issue.key });
  if (issue.kind === "missingKey") return fill(errors.missingKey, { key: issue.key });
  return fill(errors.invalidValue, { key: issue.key, expected: expected[issue.expected] });
}

function ViewSwitch({
  view,
  onChange,
  changes,
}: {
  view: View;
  onChange: (view: View) => void;
  changes: number;
}): JSX.Element {
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{P.title}</legend>
      <div className="flex w-max max-w-full flex-wrap border border-[color:var(--control-edge)]">
        {(["form", "json", "diff"] as const).map((id) => (
          <label
            key={id}
            className="relative flex h-11 cursor-pointer items-center gap-2 px-4 font-display text-sm font-extrabold uppercase tracking-[0.06em] text-[color:var(--fg-muted)] has-[:checked]:bg-[color:var(--fg)] has-[:checked]:text-[color:var(--ground)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-[color:var(--accent)]"
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={view === id}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            {P.views[id]}
            {id === "diff" && changes > 0 ? (
              <span className={`font-mono text-xs ${T.num}`}>{changes}</span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Component() {
  const { state, dispatch } = useExtension();
  const jsonId = useId();
  const jsonErrorId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<GuardPolicy>(state.policy);
  const [template, setTemplate] = useState<TemplateName>(state.template);
  const [view, setView] = useState<View>("form");
  const [json, setJson] = useState(() => JSON.stringify(state.policy, null, 2));
  const [issue, setIssue] = useState<JsonIssue | null>(null);
  const [category, setCategory] = useState<"all" | Group>("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(0);
  const [switching, setSwitching] = useState<TemplateName | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewed, setPreviewed] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<"saved" | "saveError" | "importError" | null>(null);

  const changes = diffFields(state.policy, draft);
  const unsaved = changes.length > 0 || template !== state.template;
  const differs = changedFields(draft, template).length;
  const templateName = policy.templates[template].name;
  const blocker = useBlocker(unsaved);
  const requests = state.activity.filter(
    (item) => item.verdict !== null && item.verdict !== "unreachable",
  );

  /** Replace the whole draft (a template, an undo, JSON, an import): the form starts over from it. */
  function replace(next: GuardPolicy): void {
    setDraft(next);
    setJson(JSON.stringify(next, null, 2));
    setEditor((n) => n + 1);
    setIssue(null);
    setPreviewed(null);
  }

  function changeView(next: View): void {
    if (view === "json" && next !== "json") {
      const checked = checkJson(json);
      if (!checked.ok) {
        setIssue(checked.issue);
        return;
      }
      replace(checked.policy);
    }
    if (next === "json") setJson(JSON.stringify(draft, null, 2));
    setView(next);
  }

  async function save(): Promise<void> {
    // The server's own schema loads with the first save, so zod stays out of the first chunk.
    const { guardPolicySchema } = await import("@baret/guard");
    const checked = guardPolicySchema.safeParse(draft);
    if (!checked.success) {
      setNotice("saveError");
      return;
    }
    dispatch({ type: "saveRules", policy: checked.data, template, at: new Date().toISOString() });
    replace(checked.data);
    setNotice("saved");
    setView("form");
  }

  async function importFile(file: File): Promise<void> {
    const checked = checkJson(await file.text());
    if (!checked.ok) {
      setNotice("importError");
      return;
    }
    replace(checked.policy);
    setNotice(null);
    setView("diff");
  }

  // The preview: the draft over recent requests, after a short wait.
  const runPreview = useLatest(() => setPreviewed(preview(requests, state.policy, draft)));
  useEffect(() => {
    if (!previewing) return;
    const id = window.setTimeout(() => {
      runPreview.current();
      setPreviewing(false);
    }, 700);
    return () => window.clearTimeout(id);
  }, [previewing, runPreview]);

  const groupOptions = [
    { value: "all" as const, label: P.categories.all },
    ...(Object.keys(policy.groups) as Group[]).map((group) => ({
      value: group,
      label: policy.groups[group].title,
    })),
  ];

  return (
    <Screen title={P.title} body={P.lead} picture={OPTIONS_ART.rules}>
      <div className="grid gap-12">
        <Block title={P.templates.title}>
          <p className={`${T.body} max-w-[64ch]`}>{P.templates.body}</p>
          <div className="grid gap-1">
            <p className="font-display text-3xl font-extrabold uppercase leading-none text-[color:var(--fg)]">
              {differs === 0
                ? fill(P.templates.current, { template: templateName })
                : policy.templates.custom.name}
            </p>
            {differs > 0 ? (
              <p className={T.small}>
                {fill(P.templates.differs, { count: String(differs), template: templateName })}
              </p>
            ) : null}
            <p className={T.small}>{policy.intro.failClosed}</p>
          </div>
          <TemplateCards
            value={template}
            onPick={(name) => (name === template ? undefined : setSwitching(name))}
          />
        </Block>

        <Block title={P.views.form}>
          <ViewSwitch view={view} onChange={changeView} changes={changes.length} />

          {view === "form" ? (
            <div className="grid gap-8">
              <div className="grid gap-4 md:grid-cols-12 md:items-end">
                <Select
                  className="md:col-span-4"
                  label={P.views.form}
                  value={category}
                  options={groupOptions}
                  onChange={setCategory}
                />
                <div className="md:col-span-8">
                  <Search
                    label={P.search.placeholder}
                    placeholder={P.search.placeholder}
                    value={query}
                    onChange={setQuery}
                  />
                </div>
              </div>
              <RuleEditor
                key={editor}
                draft={draft}
                only={category === "all" ? null : category}
                query={query}
                onChange={(next) => {
                  setDraft(next);
                  setPreviewed(null);
                  setNotice(null);
                }}
              />
              {query.trim() &&
              !Object.keys(policy.fields).some((field) =>
                `${policy.fields[field as GuardPolicyField].label} ${policy.fields[field as GuardPolicyField].hint}`
                  .toLowerCase()
                  .includes(query.trim().toLowerCase()),
              ) ? (
                <p className={T.body}>{P.search.empty}</p>
              ) : null}
            </div>
          ) : null}

          {view === "json" ? (
            <div className="grid gap-3">
              <p className={`${T.small} max-w-[72ch]`}>{P.json.hint}</p>
              <label htmlFor={jsonId} className="sr-only">
                {P.views.json}
              </label>
              <textarea
                id={jsonId}
                rows={20}
                spellCheck={false}
                value={json}
                aria-invalid={issue ? true : undefined}
                aria-describedby={issue ? jsonErrorId : undefined}
                onChange={(event) => {
                  setJson(event.target.value);
                  setIssue(null);
                }}
                className={`${INPUT} h-auto resize-y p-4 font-mono text-sm leading-relaxed`}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const checked = checkJson(json);
                    if (checked.ok) replace(checked.policy);
                    else setIssue(checked.issue);
                  }}
                >
                  {P.json.format}
                </Button>
                <CopyButton text={json} label={P.json.copy} done={common.actions.copied} />
              </div>
              {issue ? (
                <div id={jsonErrorId}>
                  <Problem body={issueText(issue)} />
                </div>
              ) : null}
            </div>
          ) : null}

          {view === "diff" ? (
            <div className="grid gap-4">
              <p className="font-display text-2xl font-extrabold uppercase text-[color:var(--fg)]">
                {P.diff.title}
              </p>
              <p className="text-base text-[color:var(--fg)]">
                {changes.length === 0
                  ? P.diff.none
                  : changes.length === 1
                    ? P.diff.summaryOne
                    : fill(P.diff.summary, { count: String(changes.length) })}
              </p>
              {changes.length > 0 ? (
                <ul className="grid border-t border-[color:var(--rule)]">
                  {changes.map((field) => {
                    const way = direction(field, state.policy[field], draft[field]);
                    return (
                      <li
                        key={field}
                        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[color:var(--rule)] py-3.5"
                      >
                        <span className="min-w-0 flex-1 text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                          {fill(P.diff.row, {
                            rule: policy.fields[field].label,
                            before: valueText(field, state.policy[field]),
                            after: valueText(field, draft[field]),
                          })}
                        </span>
                        <span className="flex items-center gap-3">
                          {way ? (
                            <Tag tone={way === "stricter" ? "safe" : "caution"} size="sm">
                              {P.diff[way]}
                            </Tag>
                          ) : null}
                          <Button
                            type="button"
                            variant="soft"
                            size="sm"
                            onClick={() => replace({ ...draft, [field]: state.policy[field] })}
                          >
                            {P.diff.revert}
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}

          {unsaved || notice !== null || view === "diff" ? (
            <div className="sticky bottom-0 z-10 -mx-1 grid gap-3 border-t border-[color:var(--rule-strong)] bg-[color:var(--ground)] px-1 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {view === "diff" ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={!unsaved}
                    onClick={() => void save()}
                  >
                    {changes.length === 1
                      ? P.save.confirmOne
                      : fill(P.save.confirm, { count: String(changes.length) })}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={!unsaved}
                    onClick={() => changeView("diff")}
                  >
                    {P.save.review}
                  </Button>
                )}
                {unsaved ? (
                  <>
                    <p className={`text-sm text-[color:var(--fg)] ${T.num}`}>
                      {fill(P.save.unsaved, { count: String(Math.max(changes.length, 1)) })}
                    </p>
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setTemplate(state.template);
                        replace(state.policy);
                      }}
                    >
                      {P.save.discard}
                    </Button>
                  </>
                ) : null}
              </div>
              <p role="status" className="text-sm text-[color:var(--fg)]">
                {notice === "saved" ? P.save.saved : ""}
              </p>
              {notice === "saveError" ? (
                <Problem title={P.errors.save.title} body={P.errors.save.body} />
              ) : null}
            </div>
          ) : null}
        </Block>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
          <Block title={P.preview.title}>
            <p className={T.body}>{fill(P.preview.body, { count: String(requests.length) })}</p>
            {requests.length === 0 ? (
              <p className={T.small}>{P.preview.empty}</p>
            ) : (
              <div className="flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={previewing}
                  onClick={() => setPreviewing(true)}
                >
                  {previewing
                    ? fill(P.preview.working, { count: String(requests.length) })
                    : P.preview.action.label}
                </Button>
              </div>
            )}
            <div role="status" className="grid gap-1 text-base text-[color:var(--fg)]">
              {previewed === null ? null : previewed.stricter === 0 && previewed.looser === 0 ? (
                <p>{fill(P.preview.result.same, { count: String(previewed.count) })}</p>
              ) : (
                <>
                  {previewed.stricter > 0 ? (
                    <p>{fill(P.preview.result.stricter, { count: String(previewed.stricter) })}</p>
                  ) : null}
                  {previewed.looser > 0 ? (
                    <p>{fill(P.preview.result.looser, { count: String(previewed.looser) })}</p>
                  ) : null}
                </>
              )}
            </div>
          </Block>

          <Block title={P.transfer.export.label}>
            <ul className="grid border-t border-[color:var(--rule)]">
              <li className="grid gap-2 border-b border-[color:var(--rule)] py-4">
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => download(JSON.stringify(state.policy, null, 2))}
                  >
                    {P.transfer.export.label}
                  </Button>
                </div>
                <p className={T.small}>{P.transfer.export.hint}</p>
              </li>
              <li className="grid gap-2 border-b border-[color:var(--rule)] py-4">
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    {P.transfer.import.label}
                  </Button>
                </div>
                <p className={T.small}>{P.transfer.import.hint}</p>
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
              </li>
            </ul>
            {notice === "importError" ? (
              <Problem title={P.errors.import.title} body={P.errors.import.body} />
            ) : null}
            <p className={T.small}>
              {P.payments.body}{" "}
              <Link to={P.payments.action.href} className={LINK}>
                {P.payments.action.label}
              </Link>
            </p>
          </Block>
        </div>
      </div>

      <Dialog
        open={switching !== null}
        title={fill(P.templates.switch.title, {
          template: switching ? policy.templates[switching].name : "",
        })}
        action={P.templates.switch.action}
        cancel={P.templates.switch.cancel}
        onCancel={() => setSwitching(null)}
        onConfirm={() => {
          if (!switching) return;
          setTemplate(switching);
          replace(fromTemplate(switching, draft.allowedAssets));
          setSwitching(null);
          setView("diff");
        }}
      >
        <p className="text-base text-[color:var(--fg)]">
          {fill(P.templates.switch.body, {
            template: switching ? policy.templates[switching].name : "",
          })}
        </p>
      </Dialog>

      <Dialog
        open={blocker.state === "blocked"}
        title={P.save.leave.title}
        action={P.save.leave.action}
        cancel={P.save.leave.cancel}
        danger
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        <p className="text-base text-[color:var(--fg)]">
          {fill(P.save.leave.body, { count: String(Math.max(changes.length, 1)) })}
        </p>
      </Dialog>
    </Screen>
  );
}
