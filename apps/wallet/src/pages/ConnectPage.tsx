import { common, connect } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Permissions, SiteBadge } from "@baret/wallet-ui/components/ConnectParts";
import { Parts } from "@baret/wallet-ui/components/Parts";
import { CONNECT_REQUESTS } from "@baret/wallet-ui/data/sample";
import { useWallet } from "@baret/wallet-ui/data/store";
import type { ConnectRequest } from "@baret/wallet-ui/data/types";
import { fillParts } from "@baret/wallet-ui/lib/parts";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useId, useState } from "react";
import { useLive } from "../live/live.js";
import { RequestFrame, SamplePicker, SiteStatus } from "../request/RequestFrame.js";
import { useSiteRequest } from "../request/siteRequest.js";

/**
 * /connect, the window a site opens to ask for the account's address: the
 * site, one sentence (connecting moves nothing), what the site can and cannot
 * do side by side, and the answer pinned at the foot. The site address is the one the browser reports. Two samples: a first
 * visit over a secure connection, and a site with no secure connection.
 *
 * Live, a site opened it (request/siteRequest.tsx): the same screen for the
 * site's origin, and Connect or Decline goes back to the site. Live with no
 * site, the window says how it is opened.
 */

const OPTIONS = [
  { value: "firstTime", label: connect.warnings.firstTime.title },
  { value: "insecure", label: connect.warnings.insecure.title },
] as const satisfies readonly { value: ConnectRequest["id"]; label: string }[];

type Result = "connected" | "connectedOnce" | "connectedSite" | "declined";

function Request({
  request,
  onAgain,
  onAnswer,
  site = false,
}: {
  request: ConnectRequest;
  /**
   * A site's own window: the site keeps the connection, and a fresh window
   * cannot know an earlier visit, so no "Don't ask again" and no "first
   * time" warning.
   */
  site?: boolean;
  /** The sample: back to the picker from the result. */
  onAgain?: () => void;
  /** Live: tells the site the answer; the window then says it went back. */
  onAnswer?: (connected: boolean) => void;
}): JSX.Element {
  const { state, dispatch } = useWallet();
  const titleId = useId();
  const [remember, setRemember] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const origin = request.origin.replace(/^https?:\/\//, "");

  function answer(next: Result): void {
    onAnswer?.(next === "connected");
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
      if (remember && !site) dispatch({ type: "connect", origin, item });
      else dispatch({ type: "log", item });
      setResult(site ? "connectedSite" : remember ? "connected" : "connectedOnce");
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
        {onAgain ? (
          <div className="flex">
            <Button type="button" variant="ghost" onClick={onAgain}>
              {common.actions.back}
            </Button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      aria-labelledby={titleId}
      className="border border-[color:var(--rule-strong)] bg-[color:var(--surface)]"
    >
      <header className="grid gap-4 px-5 pt-6 pb-5 md:px-6">
        <p className={T.label}>{connect.title}</p>
        <SiteBadge origin={request.origin} secure={request.secure} />
        <h1
          id={titleId}
          className="font-display text-2xl font-extrabold uppercase leading-[1.05] text-[color:var(--fg)] [overflow-wrap:anywhere] md:text-3xl"
        >
          <Parts parts={fillParts(connect.subtitle, { origin }, new Set(["origin"]))} />
        </h1>
        <p className="text-base text-[color:var(--fg)]">{connect.note}</p>
        <p className={T.small}>{connect.originNote}</p>
      </header>

      {!request.secure || !site ? (
        <div className="grid gap-3 px-5 pb-5 md:px-6">
          {!request.secure ? (
            <div
              role="note"
              className="grid gap-1 border-l-4 border-[color:var(--blocked)] bg-[color:var(--blocked-dim)] py-3 pr-3 pl-4"
            >
              <p className="text-sm font-semibold text-[color:var(--fg)]">
                {connect.warnings.insecure.title}
              </p>
              <p className={T.small}>{connect.warnings.insecure.body}</p>
            </div>
          ) : null}
          {site ? null : (
            <div className="grid gap-1 border-l-4 border-[color:var(--rule-strong)] bg-[color:var(--ground-deep)] py-3 pr-3 pl-4">
              <p className="text-sm font-semibold text-[color:var(--fg)]">
                {connect.warnings.firstTime.title}
              </p>
              <p className={T.small}>{connect.warnings.firstTime.body}</p>
            </div>
          )}
        </div>
      ) : null}

      <div className="border-t border-[color:var(--rule)] px-5 py-5 md:px-6">
        <Permissions can={connect.can} cannot={connect.cannot} />
      </div>

      <div className="grid gap-2 border-t border-[color:var(--rule)] px-5 py-4 md:px-6">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-[color:var(--fg)]">
          <span className="font-medium">{state.accountName}</span>
          <span className="font-mono text-[color:var(--fg-muted)]">
            {truncateAddress(state.address)}
          </span>
        </p>
        {site ? null : (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[color:var(--fg)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.currentTarget.checked)}
                className="size-5 shrink-0 accent-[color:var(--fg)]"
              />
              {connect.remember.label}
            </label>
            <p className={T.small}>{connect.remember.hint}</p>
          </>
        )}
      </div>

      {/* Pinned at the foot of the window, so the answer is always one press away. */}
      <footer className="sticky bottom-0 z-10 grid grid-cols-2 gap-3 border-t border-[color:var(--rule-strong)] bg-[color:var(--surface)] px-5 py-4 md:px-6">
        {/* With no secure connection, the safer answer carries the weight: Decline is primary. */}
        <Button
          type="button"
          variant={request.secure ? "ghost" : "primary"}
          size="lg"
          onClick={() => answer("declined")}
        >
          {connect.actions.reject}
        </Button>
        <Button
          type="button"
          variant={request.secure ? "primary" : "ghost"}
          size="lg"
          onClick={() => answer("connected")}
        >
          {connect.actions.approve}
        </Button>
      </footer>
    </article>
  );
}

/** A connection that is not secure, unless it stays on this device. */
function secureOf(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol === "https:") return true;
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

/** The site's request: its origin as the browser reports it, answered once. */
function SiteConnect(): JSX.Element {
  const { state } = useWallet();
  const site = useSiteRequest();
  const incoming = site.request?.type === "connect" ? site.request : null;
  const origin = site.origin;
  if (!incoming || !origin) return <SiteStatus status="waiting" />;
  const secure = secureOf(origin);
  return (
    <>
      <Request
        site
        request={{ id: secure ? "firstTime" : "insecure", origin, secure }}
        onAnswer={(connected) =>
          site.reply(
            connected && state.address
              ? { type: "connected", id: incoming.id, address: state.address as `0x${string}` }
              : {
                  type: "refused",
                  id: incoming.id,
                  reason: "declined",
                  address: null,
                  findings: [],
                },
          )
        }
      />
      {site.answered ? <SiteStatus status="answered" origin={origin} /> : null}
    </>
  );
}

/** The sample: two sites, one with no secure connection. */
function Sample(): JSX.Element {
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

export function Component() {
  const live = useLive();
  const { site } = useSiteRequest();
  if (!live) return <Sample />;
  return (
    <RequestFrame picker={null}>
      {site ? <SiteConnect /> : <SiteStatus status="none" />}
    </RequestFrame>
  );
}
