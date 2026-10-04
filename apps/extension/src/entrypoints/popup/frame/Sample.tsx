import { common, extFrame } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { X } from "lucide-react";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import {
  CONNECTS,
  type ConnectSampleId,
  REQUESTS,
  type RequestSample,
} from "../../../data/sample.js";
import type { Scenario } from "../../../data/store.js";
import { PHASES, type Start, type StartPhase } from "../../../lib/start.js";

/**
 * The sample notice, at the top of every popup state: nothing here is
 * connected and nothing is sent. Its button opens the picker that stands in
 * for the background, which decides the popup's phase once it is wired.
 * The strip is 36 px tall and its button fills that height (the popup target).
 * PopupApp leaves it out on the request screens, which own the whole canvas.
 */

export function SampleStrip({ onOpen }: { onOpen: () => void }): JSX.Element {
  const { sample } = extFrame;
  return (
    <aside
      aria-label={sample.tag}
      className="flex h-9 shrink-0 items-center justify-between gap-2 bg-[color:var(--ground-deep)] pr-2 pl-3 shadow-[inset_0_-1px_0_var(--rule)]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Tag tone="neutral" size="sm">
          {sample.tag}
        </Tag>
        <span className="truncate text-xs text-[color:var(--fg-muted)]">{sample.short}</span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full shrink-0 items-center px-2 text-xs font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        {sample.open}
      </button>
    </aside>
  );
}

function Group<V extends string>({
  legend,
  options,
  value,
  onChange,
  columns = 2,
}: {
  legend: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  columns?: 1 | 2;
}): JSX.Element {
  const name = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className={T.label}>{legend}</legend>
      <div className={`mt-2 grid gap-1.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {options.map((option) => (
          <Segment
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            label={option.label}
            faceClassName="px-3"
            onSelect={(next) => {
              const picked = options.find((o) => o.value === next);
              if (picked) onChange(picked.value);
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

const PHASE_OPTIONS = PHASES.map((value) => ({ value, label: extFrame.samples.phases[value] }));
const REQUEST_OPTIONS = [...(Object.keys(REQUESTS) as RequestSample[]), "queue" as const].map(
  (value) => ({ value, label: extFrame.samples.requests[value] }),
);
const CONNECT_OPTIONS = (Object.keys(CONNECTS) as ConnectSampleId[]).map((value) => ({
  value,
  label: extFrame.samples.connects[value],
}));

export function SamplePanel({
  open,
  start,
  onApply,
  onClose,
}: {
  open: boolean;
  start: Start;
  onApply: (start: Start) => void;
  onClose: () => void;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState(start);
  const { samples } = extFrame;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft(start);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, start]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-0 mt-auto max-h-[92%] w-full max-w-full border-t border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-0 text-[color:var(--fg)] backdrop:bg-black/55"
    >
      <form
        method="dialog"
        className="grid gap-5 px-4 pt-4 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draft);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 id={titleId} className={`${T.h3} text-[color:var(--fg)]`}>
              {samples.title}
            </h2>
            <p className={T.small}>{samples.body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center text-[color:var(--fg)] hover:bg-[color:var(--ground-deep)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
            <span className="sr-only">{common.actions.close}</span>
          </button>
        </div>
        <Group<Scenario>
          legend={samples.account.legend}
          options={[
            { value: "full", label: samples.account.full },
            { value: "empty", label: samples.account.empty },
          ]}
          value={draft.scenario}
          onChange={(scenario) => setDraft({ ...draft, scenario })}
        />
        <Group<StartPhase>
          legend={samples.phases.legend}
          options={PHASE_OPTIONS}
          value={draft.phase}
          onChange={(phase) => setDraft({ ...draft, phase })}
        />
        {draft.phase === "signing" ? (
          <Group<RequestSample>
            legend={samples.requests.legend}
            options={REQUEST_OPTIONS}
            value={draft.request}
            onChange={(request) => setDraft({ ...draft, request })}
          />
        ) : null}
        {draft.phase === "connecting" ? (
          <Group<ConnectSampleId>
            legend={samples.connects.legend}
            options={CONNECT_OPTIONS}
            value={draft.connect}
            onChange={(connect) => setDraft({ ...draft, connect })}
            columns={1}
          />
        ) : null}
        <Button type="submit" variant="primary" block>
          {samples.apply}
        </Button>
      </form>
    </dialog>
  );
}
