import { common, connect } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Parts } from "@baret/wallet-ui/components/Parts";
import { CONNECT_REQUESTS } from "@baret/wallet-ui/data/sample";
import { useWallet } from "@baret/wallet-ui/data/store";
import type { ConnectRequest } from "@baret/wallet-ui/data/types";
import { fillParts } from "@baret/wallet-ui/lib/parts";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { Check, X } from "lucide-react";
import { type JSX, useId, useState } from "react";
import { RequestFrame, SamplePicker } from "../request/RequestFrame.js";

/**
 * /connect, the window a site opens to ask for the account's address. It says
 * what the site will be able to do and, with the same weight, what it will
 * not. The site address is the one the browser reports. Two samples: a first
 * visit over a secure connection, and a site with no secure connection.
 */

const OPTIONS = [
  { value: "firstTime", label: connect.warnings.firstTime.title },
  { value: "insecure", label: connect.warnings.insecure.title },
] as const satisfies readonly { value: ConnectRequest["id"]; label: string }[];

type Result = "connected" | "connectedOnce" | "declined";

function Points({
  title,
  points,
  can,
}: {
  title: string;
  points: readonly string[];
  can: boolean;
}): JSX.Element {
  const id = useId();
  const Icon = can ? Check : X;
  return (
    <section aria-labelledby={id} className="grid content-start gap-3">
      <h2 id={id} className={T.label}>
        {title}
      </h2>
      <ul className="grid border-t border-[color:var(--rule)]">
        {points.map((point) => (
          <li
            key={point}
            className="flex gap-3 border-b border-[color:var(--rule)] py-3 text-base text-[color:var(--fg)]"
          >
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
            <span className={can ? "" : "line-through decoration-[color:var(--fg-muted)]"}>
              {point}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Request({
  request,
  onAgain,
}: {
  request: ConnectRequest;
  onAgain: () => void;
}): JSX.Element {
  const { state, dispatch } = useWallet();
  const titleId = useId();
  const [remember, setRemember] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const origin = request.origin.replace(/^https?:\/\//, "");

  function answer(next: Result): void {
    if (next === "connected") {
      const item = {
        id: `connect-${origin}-${Date.now()}`,
        kind: "connect" as const,
        at: new Date().toISOString(),
        values: { origin },
        verdict: null,
        findings: [],
        changes: [],
      };
      // Only "Don't ask again" keeps the site as a permission; otherwise it is logged and asks next time.
      if (remember) dispatch({ type: "connect", origin, item });
      else dispatch({ type: "log", item });
      setResult(remember ? "connected" : "connectedOnce");
      return;
    }
    setResult(next);
  }

  if (result) {
    return (
      <article
        aria-labelledby={titleId}
        className="grid gap-4 border border-[color:var(--rule-strong)] bg-[color:var(--surface)] px-5 py-8 md:px-6"
      >
        <h1
          id={titleId}
          className="font-display text-3xl font-extrabold uppercase text-[color:var(--fg)]"
        >
          {connect.title}
        </h1>
        <p role="status" className={T.body}>
          {fill(connect.result[result], { origin })}
        </p>
        <div className="flex">
          <Button type="button" variant="ghost" onClick={onAgain}>
            {common.actions.back}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article
      aria-labelledby={titleId}
      className="border border-[color:var(--rule-strong)] bg-[color:var(--surface)]"
    >
      <header className="grid gap-3 px-5 pt-6 pb-5 md:px-6">
        <p className={T.label}>{connect.title}</p>
        <h1
          id={titleId}
          className="font-display text-3xl font-extrabold uppercase leading-[1.02] text-[color:var(--fg)] [overflow-wrap:anywhere]"
        >
          <Parts parts={fillParts(connect.subtitle, { origin }, new Set(["origin"]))} />
        </h1>
        <p className="text-sm">
          <span className="font-mono text-[color:var(--fg)] [overflow-wrap:anywhere]">
            {request.origin}
          </span>
          <span className="block text-[color:var(--fg-muted)]">{connect.originNote}</span>
        </p>
      </header>

      <div className="grid gap-4 border-t border-[color:var(--rule)] px-5 py-5 md:px-6">
        {!request.secure ? (
          <div className="grid gap-1 border-l-4 border-[color:var(--fg)] pl-4">
            <p className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
              {connect.warnings.insecure.title}
            </p>
            <p className={T.body}>{connect.warnings.insecure.body}</p>
          </div>
        ) : null}
        <div className="grid gap-1 border-l-4 border-[color:var(--rule-strong)] pl-4">
          <p className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
            {connect.warnings.firstTime.title}
          </p>
          <p className={T.body}>{connect.warnings.firstTime.body}</p>
        </div>
        <p className="text-base text-[color:var(--fg)]">{connect.note}</p>
      </div>

      <div className="grid gap-8 border-t border-[color:var(--rule)] px-5 py-5 sm:grid-cols-2 sm:gap-6 md:px-6">
        <Points title={connect.can.title} points={connect.can.points} can />
        <Points title={connect.cannot.title} points={connect.cannot.points} can={false} />
      </div>

      <div className="grid gap-2 border-t border-[color:var(--rule)] px-5 py-5 md:px-6">
        <p className="text-sm text-[color:var(--fg)]">
          {state.accountName}{" "}
          <span className="font-mono text-[color:var(--fg-muted)]">
            {truncateAddress(state.address)}
          </span>
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-[color:var(--fg)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.currentTarget.checked)}
            className="size-5 accent-[color:var(--fg)]"
          />
          {connect.remember.label}
        </label>
        <p className={T.small}>{connect.remember.hint}</p>
      </div>

      <footer className="grid gap-3 border-t border-[color:var(--rule-strong)] px-5 py-5 sm:grid-cols-2 md:px-6">
        <Button type="button" variant="ghost" size="lg" onClick={() => answer("declined")}>
          {connect.actions.reject}
        </Button>
        <Button type="button" variant="primary" size="lg" onClick={() => answer("connected")}>
          {connect.actions.approve}
        </Button>
      </footer>
    </article>
  );
}

export function Component() {
  const [id, setId] = useState<ConnectRequest["id"]>("firstTime");
  const [run, setRun] = useState(0);
  const request = CONNECT_REQUESTS.find((r) => r.id === id) ?? CONNECT_REQUESTS[0];
  return (
    <RequestFrame picker={<SamplePicker options={OPTIONS} value={id} onChange={setId} />}>
      {request ? (
        <Request key={`${id}-${run}`} request={request} onAgain={() => setRun((n) => n + 1)} />
      ) : null}
    </RequestFrame>
  );
}
