import { common, optionsAllowances, sites } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag, type TagTone } from "@baret/ui/primitives/Tag";
import { Block, type Row, Rows } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount, day } from "@baret/wallet-ui/data/format";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { Check, X } from "lucide-react";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { OPTIONS_ART } from "../../../assets.js";
import { useExtension } from "../../../data/store.js";
import type { Permission, Site, SiteStatus } from "../../../data/types.js";
import { permissionLine, timeOf } from "../../../data/words.js";
import { Dialog, LINK, LogLine } from "../parts/kit.js";

/**
 * One site: its status, what it can do now and, with the same weight, what
 * it cannot, the requests it has sent, and the controls that take its access
 * back. Pausing, disconnecting and blocking happen in the wallet and leave
 * allowances on-chain alone; revoking them is one transaction per allowance,
 * stood in for by a short wait. Every outcome is said once in the actions'
 * status line. An address with no record gets a plain page and a way back.
 */

/** The tag each status wears: a connected site is watched, a blocked one reads Blocked. */
const TONE: Record<SiteStatus, TagTone> = {
  connected: "watching",
  paused: "neutral",
  blocked: "blocked",
  notConnected: "neutral",
};

type Ask = "disconnect" | "block" | "revoke" | "forget";

interface Point {
  readonly id: string;
  readonly text: string;
}

interface Action {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly variant: "ghost" | "danger";
  readonly run: () => void;
}

/** The route's origin as the browser reported it; a malformed escape is kept as it came. */
function decode(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** What the site can do now, one line each: reading and asking while connected, then what it holds. */
function canDo(site: Site, held: readonly Permission[]): Point[] {
  const { can } = sites.detail;
  // A paused site still sees the address; only a connected one can send requests.
  const points: Point[] = [
    ...(site.status === "connected" || site.status === "paused"
      ? [{ id: "read", text: can.read }]
      : []),
    ...(site.status === "connected" ? [{ id: "request", text: can.request }] : []),
  ];
  for (const p of held) {
    if (p.kind === "allowance") {
      points.push({
        id: p.id,
        text:
          p.amount === null
            ? fill(can.unlimited, { asset: p.asset })
            : fill(can.spend, { amount: amount(p.amount, 6), asset: p.asset }),
      });
    } else if (p.kind === "operator") {
      points.push({ id: p.id, text: fill(can.operator, { contract: p.contract }) });
    }
  }
  if (held.some((p) => p.kind === "payment")) points.push({ id: "payments", text: can.payments });
  return points;
}

/** A list with a check or a crossed-out X on every line, as the connect window shows it. */
function Points({
  title,
  points,
  can,
  note,
}: {
  title: string;
  points: readonly Point[];
  can: boolean;
  note?: string | undefined;
}): JSX.Element {
  const Icon = can ? Check : X;
  return (
    <Block title={title}>
      <ul className="grid border-t border-[color:var(--rule)]">
        {points.map((point) => (
          <li
            key={point.id}
            className="flex gap-3 border-b border-[color:var(--rule)] py-3 text-base text-[color:var(--fg)]"
          >
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
            <span
              className={`min-w-0 [overflow-wrap:anywhere] ${can ? "" : "line-through decoration-[color:var(--fg-muted)]"}`}
            >
              {point.text}
            </span>
          </li>
        ))}
        {note ? (
          <li className="border-b border-[color:var(--rule)] py-3 text-base text-[color:var(--fg-muted)]">
            {note}
          </li>
        ) : null}
      </ul>
    </Block>
  );
}

export function Component() {
  const { state, dispatch } = useExtension();
  const origin = decode(useParams().origin);
  const navigate = useNavigate();
  const hints = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  // The permissions in the revoke dialog, fixed when it opens.
  const [revoking, setRevoking] = useState<readonly Permission[]>([]);
  const [working, setWorking] = useState(false);
  const [said, setSaid] = useState("");
  // Bumped when the button that was used leaves with its row.
  const [moved, setMoved] = useState(0);
  // The site as it was when it was forgotten, shown until the list opens.
  const [leaving, setLeaving] = useState<Site | null>(null);

  // The revoke transactions, stood in for by a short wait.
  useEffect(() => {
    if (!working) return;
    const id = window.setTimeout(() => {
      dispatch({ type: "revoke", ids: revoking.map((p) => p.id), at: new Date().toISOString() });
      setWorking(false);
      setAsk(null);
      setSaid(fill(sites.detail.done.revoked, { origin }));
      setMoved((n) => n + 1);
    }, 700);
    return () => window.clearTimeout(id);
  }, [working, revoking, origin, dispatch]);

  // Disconnect and revoke take their own row away. Keep the keyboard in the
  // actions block then, unless the reader has already moved on.
  useEffect(() => {
    if (moved === 0) return;
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected || active.closest("dialog")) {
      listRef.current?.focus();
    }
  }, [moved]);

  const site = state.sites.find((s) => s.origin === origin) ?? leaving ?? undefined;

  if (!site) {
    const { notFound } = sites.detail.errors;
    return (
      <Screen
        title={notFound.title}
        body={notFound.body}
        picture={OPTIONS_ART.site}
        actions={
          <Button asChild variant="ghost">
            <Link to={notFound.action.href}>{notFound.action.label}</Link>
          </Button>
        }
      >
        {origin ? (
          <p className="font-mono text-sm text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">
            {origin}
          </p>
        ) : null}
      </Screen>
    );
  }

  const { detail } = sites;
  const { activity, payments, done } = detail;
  const a = detail.actions;
  const status = sites.status[site.status];
  const held = state.permissions.filter((p) => p.origin === site.origin);
  const live = site.status === "connected" || site.status === "paused";
  const account = live ? state.accounts.find((acc) => acc.id === site.account) : undefined;
  const log = state.activity
    .filter((item) => item.origin === site.origin)
    .sort((x, y) => Date.parse(y.at) - Date.parse(x.at))
    .slice(0, 6);
  const values = { origin: site.origin, count: String(revoking.length) };

  const facts: Row[] = [
    { label: sites.columns.firstSeen, value: <span className={T.num}>{day(site.firstSeen)}</span> },
    ...(site.connected
      ? [
          {
            label: sites.status.connected.label,
            value: <span className={T.num}>{day(site.connected)}</span>,
          },
        ]
      : []),
    {
      label: sites.columns.lastUsed,
      value: (
        <span className={T.num}>{site.lastUsed ? timeOf(site.lastUsed) : common.ui.none}</span>
      ),
    },
    ...(account ? [{ label: common.labels.account, value: account.name }] : []),
    { label: sites.columns.requests, value: <span className={T.num}>{site.requests}</span> },
  ];

  const setStatus = (next: SiteStatus, line: string): void => {
    dispatch({ type: "site", origin: site.origin, status: next, at: new Date().toISOString() });
    setSaid(fill(line, { origin: site.origin }));
  };

  const actions: Action[] = [];
  if (live) {
    actions.push(
      site.status === "connected"
        ? {
            key: "pause",
            label: a.pause.label,
            hint: a.pause.hint,
            variant: "ghost",
            run: () => setStatus("paused", done.paused),
          }
        : {
            key: "pause",
            label: a.resume.label,
            hint: a.resume.hint,
            variant: "ghost",
            run: () => setStatus("connected", done.resumed),
          },
      {
        key: "disconnect",
        label: a.disconnect.label,
        hint: a.disconnect.hint,
        variant: "ghost",
        run: () => setAsk("disconnect"),
      },
    );
  }
  actions.push(
    site.status === "blocked"
      ? {
          key: "block",
          label: a.unblock.label,
          hint: a.unblock.hint,
          variant: "ghost",
          run: () => setStatus("notConnected", done.unblocked),
        }
      : {
          key: "block",
          label: a.block.label,
          hint: a.block.hint,
          variant: "ghost",
          run: () => setAsk("block"),
        },
  );
  if (held.length > 0) {
    actions.push({
      key: "revoke",
      label: a.revoke.label,
      hint: a.revoke.hint,
      variant: "danger",
      run: () => {
        if (!working) setRevoking(held);
        setAsk("revoke");
      },
    });
  }
  actions.push({
    key: "forget",
    label: a.forget.label,
    hint: a.forget.hint,
    variant: "danger",
    run: () => setAsk("forget"),
  });

  const forget = (): void => {
    setLeaving(site);
    dispatch({ type: "forgetSite", origin: site.origin });
    setAsk(null);
    navigate("/sites", { state: { forgot: site.origin } });
  };

  const close = () => setAsk(null);

  // An origin is one long word: the page title and the dialog titles may
  // break it anywhere rather than run past a 320 px screen.
  return (
    <div className="[&_h1]:[overflow-wrap:anywhere] [&_h2]:[overflow-wrap:anywhere]">
      {/* A break after each dot, so a long site name wraps at its parts, never mid-word. */}
      <Screen
        title={site.origin.replaceAll(".", ".\u200b")}
        body={detail.lead}
        picture={OPTIONS_ART.site}
      >
        <div className="grid gap-14">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="grid content-start gap-3 border-t border-[color:var(--rule)] pt-4 md:col-span-5">
              <div className="flex">
                <Tag tone={TONE[site.status]}>{status.label}</Tag>
              </div>
              <p className={`${T.body} max-w-[48ch]`}>{status.hint}</p>
              <p className="grid gap-1 border-l-4 border-[color:var(--rule-strong)] pl-4 text-sm">
                <span className="font-mono text-[color:var(--fg)] [overflow-wrap:anywhere]">
                  {site.origin}
                </span>
                <span className="text-[color:var(--fg-muted)]">{detail.origin}</span>
              </p>
            </div>
            <div className="md:col-span-7">
              <Rows rows={facts} />
            </div>
          </div>

          <div className="grid gap-12 md:grid-cols-2 md:gap-8">
            <Points
              title={detail.can.title}
              points={canDo(site, held)}
              can
              note={held.length === 0 ? detail.can.none : undefined}
            />
            <Points
              title={detail.cannot.title}
              points={detail.cannot.items.map((text) => ({ id: text, text }))}
              can={false}
            />
          </div>

          {held.some((p) => p.kind === "payment") ? (
            <Block
              title={payments.title}
              aside={
                <Link to={payments.action.href} className={LINK}>
                  {payments.action.label}
                </Link>
              }
            >
              <p className={`${T.body} max-w-[60ch]`}>{payments.body}</p>
            </Block>
          ) : null}

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <Block
              title={activity.title}
              className="lg:col-span-7"
              aside={
                <Link to={activity.viewAll.href} className={LINK}>
                  {activity.viewAll.label}
                </Link>
              }
            >
              {log.length === 0 ? (
                <p
                  className={`${T.body} border border-dashed border-[color:var(--rule-strong)] p-6`}
                >
                  {activity.empty}
                </p>
              ) : (
                <ul className="grid border-t border-[color:var(--rule)]">
                  {log.map((item) => (
                    <li key={item.id} className="border-b border-[color:var(--rule)]">
                      <LogLine item={item} />
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <Block title={a.title} className="lg:col-span-5">
              <div>
                <ul
                  ref={listRef}
                  tabIndex={-1}
                  className="grid border-t border-[color:var(--rule)] outline-none"
                >
                  {actions.map((action) => (
                    <li
                      key={action.key}
                      className="grid justify-items-start gap-2 border-b border-[color:var(--rule)] py-4"
                    >
                      <Button
                        type="button"
                        variant={action.variant}
                        aria-describedby={`${hints}-${action.key}`}
                        onClick={action.run}
                      >
                        {action.label}
                      </Button>
                      <p id={`${hints}-${action.key}`} className={`${T.small} max-w-[52ch]`}>
                        {action.hint}
                      </p>
                    </li>
                  ))}
                </ul>
                <p role="status" className="text-base text-[color:var(--fg)]">
                  {said ? (
                    <span className="mt-4 block border-l-4 border-[color:var(--fg)] pl-3 [overflow-wrap:anywhere]">
                      {said}
                    </span>
                  ) : null}
                </p>
              </div>
            </Block>
          </div>
        </div>
      </Screen>

      <Dialog
        open={ask === "disconnect"}
        title={fill(detail.disconnect.title, values)}
        action={detail.disconnect.action}
        cancel={detail.disconnect.cancel}
        onCancel={close}
        onConfirm={() => {
          setStatus("notConnected", done.disconnected);
          setAsk(null);
          setMoved((n) => n + 1);
        }}
      >
        <p className={T.body}>{detail.disconnect.body}</p>
      </Dialog>

      <Dialog
        open={ask === "block"}
        title={fill(detail.block.title, values)}
        action={detail.block.action}
        cancel={detail.block.cancel}
        danger
        onCancel={close}
        onConfirm={() => {
          setStatus("blocked", done.blocked);
          setAsk(null);
        }}
      >
        <p className={T.body}>{detail.block.body}</p>
      </Dialog>

      <Dialog
        open={ask === "revoke"}
        title={fill(revoking.length === 1 ? detail.revoke.titleOne : detail.revoke.title, values)}
        action={working ? optionsAllowances.revoke.working : fill(detail.revoke.action, values)}
        cancel={working ? common.actions.close : detail.revoke.cancel}
        danger
        disabled={working}
        onCancel={close}
        onConfirm={() => setWorking(true)}
      >
        <p className={T.body}>
          {fill(revoking.length === 1 ? detail.revoke.bodyOne : detail.revoke.body, values)}
        </p>
        <ul className="grid border-t border-[color:var(--rule)]">
          {revoking.map((p) => (
            <li
              key={p.id}
              className="border-b border-[color:var(--rule)] py-2.5 text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]"
            >
              {permissionLine(p)}
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={ask === "forget"}
        title={fill(detail.forget.title, values)}
        action={detail.forget.action}
        cancel={detail.forget.cancel}
        danger
        onCancel={close}
        onConfirm={forget}
      >
        <p className={T.body}>{detail.forget.body}</p>
      </Dialog>
    </div>
  );
}
