import { signRequest } from "@baret/content/extension/popup/sign-request.content";
import { common } from "@baret/content/shared/common.content";
import type { ActivityItem } from "@baret/wallet-ui/data/types";
import { SignRequest } from "@baret/wallet-ui/sign/SignRequest";
import { Img } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { type JSX, useState } from "react";
import { VERDICT_ART } from "../../../assets.js";
import { activeAccount, useExtension } from "../../../data/store.js";
import type {
  Activity,
  ActivityStatus,
  LoggedVerdict,
  PaymentRequest,
  PopupRequest,
  TransactionRequest,
} from "../../../data/types.js";
import { scenarioQuery } from "../../../lib/start.js";
import { TextButton } from "../frame/bits.js";
import { openOptions } from "../navigation.js";
import { type Decision, MessageView, PaymentView, TypedDataView } from "../parts/Requests.js";

/**
 * The signing phase: the popup shows the request and nothing else, no tabs
 * and no balance (docs/WALLET.md 2.6). A transaction is the wallet's own sign
 * request, compact, with what the extension adds: the tag of its verdict, a
 * first request from a site, the window note. Messages, structured data and
 * payments have their own views. When several requests wait, they are decided
 * one at a time, and all of them can be declined at once.
 *
 * Every answer lands in the log, the declined ones too.
 */

function VerdictArt({ verdict }: { verdict: LoggedVerdict }): JSX.Element {
  const art = VERDICT_ART[verdict];
  return (
    <div
      className="w-14 shrink-0 overflow-hidden border border-[color:var(--rule)]"
      style={{ aspectRatio: "2 / 3", backgroundColor: art.ground }}
    >
      <Img asset={art} sizes="56px" />
    </div>
  );
}

function FirstTime({ origin }: { origin: string }): JSX.Element {
  return (
    <div className="grid gap-1 border-l-4 border-[color:var(--caution)] pl-3">
      <p className="font-display text-base font-bold uppercase leading-tight tracking-[0.02em] text-[color:var(--fg)]">
        {signRequest.firstTime.title}
      </p>
      <p className={T.small}>{fill(signRequest.firstTime.body, { origin })}</p>
    </div>
  );
}

const STATUS: Record<ActivityItem["kind"], ActivityStatus> = {
  sent: "confirmed",
  signed: "confirmed",
  received: "confirmed",
  allowance: "confirmed",
  revoke: "confirmed",
  payment: "confirmed",
  blocked: "blocked",
  declined: "declined",
  expired: "expired",
  overridden: "overridden",
  unchecked: "unchecked",
  drift: "confirmed",
  connect: "confirmed",
  disconnect: "confirmed",
};

/** The wallet's log row for a transaction, as the extension's log keeps it. */
function fromTransaction(item: ActivityItem, tx: TransactionRequest, account: string): Activity {
  const { request } = tx;
  const values = request.values;
  return {
    id: item.id,
    kind:
      request.action === "approvalUnlimited"
        ? "allowance"
        : request.action === "payment"
          ? "payment"
          : "sent",
    status: STATUS[item.kind],
    at: item.at,
    account,
    origin: request.origin,
    counterparty: values.recipient ?? values.spender ?? values.contract ?? null,
    values: {
      ...(values.amount ? { amount: values.amount } : {}),
      ...(values.asset ? { asset: values.asset } : {}),
    },
    verdict: request.verdict,
    findings: request.findings,
    changes: request.changes,
    ...(item.rule ? { rule: item.rule } : {}),
    ...(item.fee ? { fee: item.fee } : {}),
  };
}

const DECIDED: Record<Decision, ActivityStatus> = {
  signed: "confirmed",
  declined: "declined",
  expired: "expired",
  overridden: "overridden",
};

/** A message, structured data or a payment, as one row of the log. */
function fromOther(
  request: Exclude<PopupRequest, TransactionRequest>,
  decision: Decision,
  account: string,
): Activity {
  const at = new Date().toISOString();
  const base = {
    id: `${request.id}-${decision}-${at}`,
    at,
    account,
    origin: request.origin,
    changes: [],
  };
  if (request.kind === "message") {
    return {
      ...base,
      kind: "message",
      status: DECIDED[decision],
      counterparty: null,
      values: {},
      verdict: null,
      findings: [],
    };
  }
  if (request.kind === "typedData") {
    const permit = request.permit;
    const rule = request.rules[0]?.rule;
    return {
      ...base,
      kind: "typedData",
      status: DECIDED[decision],
      counterparty: permit?.spender ?? null,
      values: permit ? { asset: permit.asset } : {},
      // Baret's own verdict on the signature, never a stand-in.
      verdict: request.verdict,
      findings: request.findings,
      ...(rule && decision === "overridden" ? { rule } : {}),
    };
  }
  return fromPayment(request, decision, base);
}

function fromPayment(
  request: PaymentRequest,
  decision: Decision,
  base: Pick<Activity, "id" | "at" | "account" | "origin" | "changes">,
): Activity {
  // A payment Baret could not check never goes out: it is logged as Blocked.
  return {
    ...base,
    kind: "payment",
    status: request.state === "notChecked" ? "blocked" : DECIDED[decision],
    counterparty: request.merchant,
    values: { amount: request.amount, asset: request.asset },
    verdict:
      request.state === "notChecked"
        ? "unreachable"
        : request.state === "overCap"
          ? "blocked"
          : "safe",
    findings: [],
  };
}

/**
 * The request as the popup may act on it. While Baret is unreachable, or its
 * reach is still unknown, every verdict counts as Can't reach Baret and a
 * payment counts as not checked, so no one-click Sign or pay is offered.
 */
export function asChecked(request: PopupRequest, reachable: boolean | null): PopupRequest {
  if (reachable === true) return request;
  if (request.kind === "transaction") {
    return { ...request, request: { ...request.request, verdict: "unreachable" } };
  }
  if (request.kind === "typedData") return { ...request, verdict: "unreachable" };
  if (request.kind === "payment" && (request.state === "first" || request.state === "auto")) {
    return { ...request, state: "notChecked" };
  }
  return request;
}

export function SignPhase({
  queue,
  onFinished,
}: {
  queue: readonly PopupRequest[];
  onFinished: () => void;
}): JSX.Element | null {
  const { state, dispatch } = useExtension();
  const account = activeAccount(state)?.id ?? state.active;
  const query = scenarioQuery(state.scenario);
  const [index, setIndex] = useState(0);
  const waiting = queue[index];
  const current = waiting ? asChecked(waiting, state.reachable) : undefined;
  const more = index + 1 < queue.length;
  const next = () => (more ? setIndex(index + 1) : onFinished());

  if (!current) return null;

  function declineAll(): void {
    const rest = queue.slice(index).map((request) => asChecked(request, state.reachable));
    for (const request of rest) {
      if (request.kind === "transaction") continue;
      dispatch({ type: "log", item: fromOther(request, "declined", account) });
    }
    for (const request of rest) {
      if (request.kind !== "transaction") continue;
      const at = new Date().toISOString();
      dispatch({
        type: "log",
        item: {
          ...fromTransaction(
            {
              id: `${request.id}-declined-${at}`,
              kind: "declined",
              at,
              values: {},
              verdict: request.request.verdict,
              findings: [],
              changes: [],
            },
            request,
            account,
          ),
        },
      });
    }
    onFinished();
  }

  function decided(decision: Decision): void {
    if (!current || current.kind === "transaction") return;
    dispatch({ type: "log", item: fromOther(current, decision, account) });
    next();
  }

  return (
    <div className="flex h-full flex-col">
      {queue.length > 1 ? (
        <div className="grid shrink-0 gap-0.5 border-b border-[color:var(--rule)] bg-[color:var(--ground-deep)] px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <p
              className={`font-mono text-xs font-medium uppercase tracking-[0.08em] text-[color:var(--fg)] ${T.num}`}
            >
              {fill(signRequest.queue.label, { count: String(queue.length - index) })}
            </p>
            <TextButton onClick={declineAll}>{signRequest.queue.declineAll}</TextButton>
          </div>
          <p className="text-xs text-[color:var(--fg-muted)]">
            {counted(queue.length - index, signRequest.queue.body, signRequest.queue.bodyOne)}
          </p>
        </div>
      ) : null}
      <div key={current.id} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {current.kind === "transaction" ? (
          <SignRequest
            request={current.request}
            network={current.network}
            compact
            framed={false}
            onLog={(item) => {
              const row = fromTransaction(item, current, account);
              const own = current.request.origin === null;
              if (
                own &&
                (item.kind === "sent" || item.kind === "overridden" || item.kind === "unchecked")
              ) {
                dispatch({
                  type: "send",
                  asset: current.request.values.asset ?? "MON",
                  amount: current.request.values.amount ?? "0",
                  fee: current.request.fee,
                  item: row,
                });
              } else {
                dispatch({ type: "log", item: row });
              }
            }}
            onAgain={next}
            againLabel={more ? signRequest.queue.next : common.actions.back}
            {...(current.request.origin === null ? { onDecline: onFinished } : {})}
            {...(current.firstTime && current.request.origin
              ? { notice: <FirstTime origin={current.request.origin} /> }
              : {})}
            verdictArt={<VerdictArt verdict={current.request.verdict} />}
            footnote={
              <p className="text-xs text-[color:var(--fg-muted)]">{signRequest.windowNote}</p>
            }
            editRules={(label, className) => (
              <button
                type="button"
                className={className}
                onClick={() => openOptions("policies", query)}
              >
                {label}
              </button>
            )}
          />
        ) : current.kind === "message" ? (
          <MessageView request={current} onDecide={decided} />
        ) : current.kind === "typedData" ? (
          <TypedDataView request={current} onDecide={decided} />
        ) : (
          <PaymentView
            request={current}
            autoPay={state.settings.autoPay}
            onDecide={decided}
            onEditCaps={() => openOptions("payments", query)}
            onCaps={(caps) => {
              const at = new Date().toISOString();
              dispatch({
                type: "caps",
                permission: {
                  id: `caps-${current.origin}-${at}`,
                  kind: "payment",
                  origin: current.origin,
                  account,
                  status: "active",
                  granted: at,
                  lastUsed: at,
                  holder: current.merchant,
                  uses: [{ at, amount: current.amount }],
                  merchant: current.origin,
                  asset: current.asset,
                  caps,
                  spent: { hour: current.amount, day: current.amount },
                  paymentsToday: 1,
                  // The request names its facilitator; the store keys them by id.
                  facilitator:
                    state.facilitators.find((f) => f.name === current.facilitator)?.id ??
                    current.facilitator,
                  week: [0, 0, 0, 0, 0, 0, Number(current.amount)],
                },
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
