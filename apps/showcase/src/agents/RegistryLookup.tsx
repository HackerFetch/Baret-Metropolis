import { agents } from "@baret/content";
import { Button } from "@baret/ui";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type FormEvent, type JSX, useEffect, useId, useRef, useState } from "react";
import { type Lookup, lookupAddress } from "./registry.js";

/**
 * A lookup of Baret's reputation registry: what the Chainlink CRE workflow
 * wrote from ScamSniffer's blacklist into the ReputationRegistry on Monad,
 * read through the Envio indexer (registry.ts). One status line says what
 * came back. Fail-closed: an unanswered lookup says so and never reads as a
 * clean address; a clean address is "not on the registry", never safe.
 *
 * It continues the live agent's plain band, divided by a rule, so the
 * grounds keep alternating down the page.
 */

const ID = "registry";
const { registry } = agents;

type State = { readonly status: "idle" } | { readonly status: "loading" } | Lookup;

const INPUT =
  "min-h-11 w-full border border-[color:var(--control-edge)] bg-[color:var(--surface)] px-3 py-2.5 font-mono text-sm text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

const LINK =
  "underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]";

function reasonOf(code: string): string {
  const known = (registry.reasons as Readonly<Record<string, string>>)[code];
  return known ?? fill(registry.otherReason, { code });
}

/** The one line the status announces. */
export function lineOf(state: State): string {
  switch (state.status) {
    case "idle":
      return "";
    case "loading":
      return registry.loading;
    case "listed":
      return fill(registry.listed, {
        reason: reasonOf(state.reasonCode),
        level: String(state.severity),
        severity: registry.severities[state.severity as 1 | 2 | 3 | 4],
      });
    case "clear":
      return registry.clear;
    case "unavailable":
      return registry.unavailable;
    case "invalid":
      return registry.invalid;
  }
}

export function RegistryLookup(): JSX.Element {
  const [address, setAddress] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const current = useRef<AbortController | null>(null);
  const inputId = useId();
  const hintId = useId();

  useEffect(() => () => current.current?.abort(), []);

  function run(text: string): void {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState({ status: "loading" });
    void lookupAddress(text, { signal: controller.signal }).then((read) => {
      if (!controller.signal.aborted) setState(read);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    run(address);
  }

  const tone =
    state.status === "listed" || state.status === "invalid"
      ? "text-[color:var(--blocked-ink)]"
      : "text-[color:var(--fg)]";

  return (
    <Section id={ID} ground="ground" pad={false} className="pb-12 md:pb-16 lg:pb-24">
      <div className="border-t border-[color:var(--rule)] pt-12 md:pt-16">
        <SectionHeader titleId={titleIdOf(ID)} title={registry.title} body={registry.body} />
        <Reveal className="mt-8">
          <form onSubmit={onSubmit} noValidate className="grid gap-2">
            <label htmlFor={inputId} className={T.label}>
              {registry.label}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id={inputId}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-describedby={hintId}
                aria-invalid={state.status === "invalid" ? true : undefined}
                className={`${INPUT} min-w-[16rem] flex-1`}
              />
              <Button type="submit" variant="primary" disabled={state.status === "loading"}>
                {registry.lookUp}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAddress(registry.sample);
                  run(registry.sample);
                }}
              >
                {registry.tryListed}
              </Button>
            </div>
            <p id={hintId} className={T.small}>
              {registry.hint}
            </p>
          </form>
          <div
            aria-busy={state.status === "loading"}
            className="mt-4 min-h-[2lh] border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-5"
          >
            <p role="status" data-lookup={state.status} className={`${T.body} ${tone}`}>
              {lineOf(state)}
            </p>
            {state.status === "listed" ? (
              <a
                href={`${registry.explorer}/tx/${state.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 inline-block text-sm ${LINK}`}
              >
                {registry.view}
              </a>
            ) : null}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
