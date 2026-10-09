import { common, walletFrame } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { Segment } from "@baret/web-ui/components/Segment";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, type ReactNode, useEffect, useId, useRef } from "react";
import { useLocation } from "react-router";
import { SampleNotice } from "../components/SampleNotice.js";
import { useSiteRequest } from "./siteRequest.js";

/**
 * The window a site opens for a request (/sign, /connect): no sidebar and no
 * nav, one narrow column, the mark and the network on top. Until the wallet
 * is wired, the sample notice and a picker of sample requests sit above the
 * request itself, so each verdict can be read in turn. A window that serves a
 * site (request/siteRequest.tsx) shows neither: it holds one real request.
 */

export interface SampleOption<V extends string> {
  readonly value: V;
  readonly label: string;
}

export function SamplePicker<V extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SampleOption<V>[];
  value: V;
  onChange: (value: V) => void;
}): JSX.Element {
  const name = useId();
  // The connect picker samples sites, not verdicts, so it gets its own note.
  const connect = useLocation().pathname.replace(/\/+$/, "").endsWith("/connect");
  return (
    <fieldset className="grid gap-3">
      <legend className={T.label}>{walletFrame.samples.legend}</legend>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        {options.map((option) => (
          <Segment
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            label={option.label}
            onSelect={(next) => {
              const picked = options.find((o) => o.value === next);
              if (picked) onChange(picked.value);
            }}
          />
        ))}
      </div>
      <p className={T.small}>
        {connect ? walletFrame.samples.noteConnect : walletFrame.samples.note}
      </p>
    </fieldset>
  );
}

/**
 * Live, in place of a request: no site opened this window ("none"), the
 * site's request has not come in ("waiting"), or the answer went back to the
 * site ("answered", with a way to close the window). Polite, so each change
 * is heard; the answered line takes focus, as the buttons it follows are gone.
 */
export function SiteStatus({
  status,
  origin = null,
}: {
  status: "none" | "waiting" | "answered";
  origin?: string | null;
}): JSX.Element {
  const { request } = walletFrame;
  const line = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (status === "answered") line.current?.focus();
  }, [status]);
  return (
    <div className="grid gap-4 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] px-5 py-6 md:px-6">
      <p
        ref={line}
        tabIndex={-1}
        aria-live="polite"
        className={`${T.body} text-[color:var(--fg)] outline-none [overflow-wrap:anywhere]`}
      >
        {status === "answered" ? fill(request.answered, { origin: origin ?? "" }) : request[status]}
      </p>
      {status === "answered" ? (
        <div className="flex">
          <Button type="button" variant="ghost" onClick={() => window.close()}>
            {request.close}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RequestFrame({
  picker,
  children,
}: {
  picker: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const { site } = useSiteRequest();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)]">
        <div className="mx-auto flex h-16 w-full max-w-[640px] items-center justify-between gap-4 px-4 md:px-6">
          <Brand />
          <Tag tone="network" size="sm">
            {common.networks.testnet.label}
          </Tag>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[640px] grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-6 pb-16 md:px-6 md:pt-8">
        {site ? null : <SampleNotice />}
        {site ? null : picker}
        {children}
      </main>
    </div>
  );
}
