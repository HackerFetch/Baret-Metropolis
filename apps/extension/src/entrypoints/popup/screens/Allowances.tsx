import { allowances } from "@baret/content/extension/popup/allowances.content";
import { common } from "@baret/content/shared/common.content";
import { Button, Meter } from "@baret/ui";
import { Tag, type TagTone } from "@baret/ui/primitives/Tag";
import { amount, toUnits } from "@baret/wallet-ui/data/format";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { ago, capReached, nearCap, now, PAYMENT_ASSET, payments } from "../../../data/derive.js";
import { useExtension } from "../../../data/store.js";
import type { PaymentPermission, Permission } from "../../../data/types.js";
import { short } from "../../../data/words.js";
import { PopupEmpty, TabTitle } from "../frame/bits.js";
import { Confirm } from "../frame/Sheet.js";

/**
 * Allowances, the visual heart of the product (docs/WALLET.md 2.3): every
 * token allowance and every site with payment caps, each with its live meters
 * and a revoke button. Pausing a payment site happens on this device; a token
 * allowance lives in the token contract, so it can only be revoked, and its
 * card says so. Revoking is a transaction, and the dialog says that before
 * the button. Collection access lives on the options page.
 */

type Card = Exclude<Permission, { kind: "operator" }>;

function statusOf(p: Card): { label: string; tone: TagTone } {
  const { status } = allowances.card;
  if (p.status === "paused") return { label: status.paused, tone: "neutral" };
  if (p.kind === "payment" && capReached(p)) return { label: status.capReached, tone: "blocked" };
  if (p.kind === "payment" && nearCap(p)) return { label: status.nearCap, tone: "caution" };
  return { label: status.active, tone: "watching" };
}

function MeterLine({
  label,
  spent,
  cap,
  asset,
}: {
  label: string;
  spent: string;
  cap: string | null;
  asset: string;
}): JSX.Element {
  const id = useId();
  const { meters } = allowances.card;
  return (
    <div className="grid gap-1.5">
      <p className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-[color:var(--fg-muted)]">{label}</span>
        <span id={id} className={`text-[color:var(--fg)] ${T.num}`}>
          {cap === null
            ? allowances.card.noCap
            : fill(meters.value, { actual: `${spent} ${asset}`, cap: `${cap} ${asset}` })}
        </span>
      </p>
      {cap === null ? null : <Meter value={Number(spent)} max={Number(cap)} describedBy={id} />}
    </div>
  );
}

function PaymentBody({ p }: { p: PaymentPermission }): JSX.Element {
  const { card } = allowances;
  return (
    <div className="grid gap-3">
      <p className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-[color:var(--fg-muted)]">{card.meters.perPayment}</span>
        <span className={`text-[color:var(--fg)] ${T.num}`}>
          {p.caps.perPayment} {p.asset}
        </span>
      </p>
      <MeterLine label={card.meters.hour} spent={p.spent.hour} cap={p.caps.hour} asset={p.asset} />
      <MeterLine label={card.meters.day} spent={p.spent.day} cap={p.caps.day} asset={p.asset} />
      <p className={`text-xs text-[color:var(--fg-muted)] ${T.num}`}>
        {counted(p.paymentsToday, card.payments, card.paymentsOne)} ·{" "}
        {p.lastUsed ? `${card.lastUsed} ${ago(p.lastUsed, now())}` : card.neverUsed}
      </p>
    </div>
  );
}

const NUMBER = /^\d+(?:[.,]\d{1,6})?$/;
/** Caps are compared in base units, so no float rounding decides a set. */
const CAP_DECIMALS = 6;
const capUnits = (text: string) =>
  NUMBER.test(text.trim()) ? toUnits(text.trim(), CAP_DECIMALS) : null;

function CapsForm({
  open,
  asset,
  onClose,
  onSave,
}: {
  open: boolean;
  /** The token the caps are in. */
  asset: string;
  onClose: () => void;
  onSave: (origin: string, caps: { perPayment: string; hour: string; day: string }) => void;
}): JSX.Element {
  const { add } = allowances;
  const ids = {
    origin: useId(),
    perPayment: useId(),
    hour: useId(),
    day: useId(),
    originError: useId(),
    capsError: useId(),
  };
  const [origin, setOrigin] = useState("https://");
  const [perPayment, setPerPayment] = useState("");
  const [hour, setHour] = useState("");
  const [day, setDay] = useState("");
  const [tried, setTried] = useState(false);

  const host = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/?$/i.test(origin.trim());
  const per = capUnits(perPayment);
  const hourCap = capUnits(hour);
  const dayCap = capUnits(day);
  // The first thing wrong with the caps, in the order a reader fixes them.
  const capsError =
    per === null || hourCap === null || dayCap === null
      ? add.errors.numbers
      : hourCap < per
        ? add.errors.hour
        : hourCap > dayCap
          ? add.errors.order
          : null;
  const valid = host && capsError === null;
  const originShown = tried && !host;
  const capsShown = tried && capsError !== null;
  const capInvalid = (value: string) =>
    capsShown && (capUnits(value) === null || capsError !== add.errors.numbers);

  const field =
    "h-11 w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 text-base text-[color:var(--fg)] focus-visible:border-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

  return (
    <Confirm
      open={open}
      title={add.title}
      action={add.action}
      cancel={common.actions.cancel}
      danger={false}
      onCancel={onClose}
      onConfirm={() => {
        setTried(true);
        if (!valid) return;
        onSave(
          origin
            .trim()
            .replace(/\/$/, "")
            .replace(/^https:\/\//, ""),
          {
            perPayment: perPayment.trim().replace(",", "."),
            hour: hour.trim().replace(",", "."),
            day: day.trim().replace(",", "."),
          },
        );
      }}
    >
      <p className={T.small}>{add.body}</p>
      <div className="grid gap-1.5">
        <label htmlFor={ids.origin} className={T.label}>
          {add.fields.origin.label}
        </label>
        <input
          id={ids.origin}
          value={origin}
          onChange={(event) => setOrigin(event.target.value)}
          placeholder={add.fields.origin.placeholder}
          inputMode="url"
          autoComplete="off"
          aria-invalid={originShown ? true : undefined}
          aria-describedby={originShown ? ids.originError : undefined}
          className={field}
        />
        {originShown ? (
          <p id={ids.originError} className="text-sm text-[color:var(--fg)]">
            {add.errors.origin}
          </p>
        ) : null}
      </div>
      <p className="flex items-baseline justify-between text-sm">
        <span className={T.label}>{add.fields.asset.label}</span>
        <span className="font-medium text-[color:var(--fg)]">{asset}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["perPayment", perPayment, setPerPayment],
            ["hour", hour, setHour],
            ["day", day, setDay],
          ] as const
        ).map(([key, value, set]) => (
          <div key={key} className="grid min-w-0 gap-1.5">
            <label htmlFor={ids[key]} className={T.label}>
              {add.fields[key].label}
            </label>
            <input
              id={ids[key]}
              value={value}
              onChange={(event) => set(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={capInvalid(value) ? true : undefined}
              aria-describedby={capsShown ? ids.capsError : undefined}
              className={`${field} ${T.num}`}
            />
          </div>
        ))}
      </div>
      {capsShown ? (
        <p id={ids.capsError} className="text-sm text-[color:var(--fg)]">
          {capsError}
        </p>
      ) : null}
    </Confirm>
  );
}

export function AllowancesTab({
  onEditCaps,
  onFull,
}: {
  onEditCaps: () => void;
  onFull: () => void;
}): JSX.Element {
  const { state, dispatch } = useExtension();
  const cards = state.permissions.filter(
    (p): p is Card => p.account === state.active && p.kind !== "operator",
  );
  const [target, setTarget] = useState<Card | null>(null);
  const [all, setAll] = useState(false);
  // The permissions being revoked, fixed at the moment the reader confirms.
  const [pending, setPending] = useState<readonly string[] | null>(null);
  const working = pending !== null;
  const [adding, setAdding] = useState(false);
  const [said, setSaid] = useState<{ text: string; note?: string } | null>(null);

  // A notice lasts long enough to read, then clears.
  useEffect(() => {
    if (!said) return;
    const id = window.setTimeout(() => setSaid(null), 5000);
    return () => window.clearTimeout(id);
  }, [said]);

  // The revoke transaction, stood in for by a short wait.
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => {
      dispatch({ type: "revoke", ids: pending, at: new Date().toISOString() });
      setPending(null);
      setTarget(null);
      setAll(false);
      setSaid({ text: allowances.revoke.done });
    }, 700);
    return () => window.clearTimeout(id);
  }, [pending, dispatch]);

  const pays = payments(cards);
  const asset = pays[0]?.asset ?? PAYMENT_ASSET;
  // Summed in base units; every payment site here settles in the same token.
  const cents =
    pays.reduce((sum, p) => sum + (toUnits(p.spent.day, CAP_DECIMALS) ?? 0n), 0n) / 10_000n;
  const spent = `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
  const near = pays.filter(nearCap).length;
  const { summary, card, revoke, revokeAll } = allowances;

  if (cards.length === 0) {
    return (
      <div className="pb-4">
        <TabTitle title={allowances.title} body={allowances.body} />
        <PopupEmpty
          picture={POPUP_ART.allowances}
          title={allowances.empty.title}
          body={allowances.empty.body}
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
              {summary.add}
            </Button>
          }
        />
        <CapsForm
          key={adding ? "open" : "closed"}
          open={adding}
          asset={asset}
          onClose={() => setAdding(false)}
          onSave={(origin, caps) => {
            dispatch({ type: "caps", permission: newPayment(origin, caps, state.active, asset) });
            setAdding(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <TabTitle title={allowances.title} body={allowances.body} />

      <dl className="mx-4 grid grid-cols-3 border-y border-[color:var(--rule)]">
        {[
          fill(summary.active, {
            count: String(cards.filter((c) => c.status === "active").length),
          }),
          fill(summary.spent, { actual: `${spent} ${asset}` }),
          fill(summary.nearCap, { count: String(near) }),
        ].map((line, i) => (
          <div
            key={line}
            className={`grid content-center py-2.5 text-xs leading-snug text-[color:var(--fg)] ${T.num} ${i > 0 ? "border-l border-[color:var(--rule)] pl-2.5" : "pr-2"}`}
          >
            <dd>{line}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
          {summary.add}
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={() => setAll(true)}>
          {summary.revokeAll}
        </Button>
      </div>

      <p role="status" className="px-4">
        {said ? (
          <span className="mt-3 grid gap-0.5 border-l-4 border-[color:var(--fg)] pl-3 text-sm text-[color:var(--fg)]">
            {said.text}
            {said.note ? <span className={T.small}>{said.note}</span> : null}
          </span>
        ) : null}
      </p>

      <ul className="mt-3 grid border-t border-[color:var(--rule)]">
        {cards.map((p) => {
          const status = statusOf(p);
          return (
            <li key={p.id} className="grid gap-3 border-b border-[color:var(--rule)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className={T.label}>
                  {p.kind === "payment" ? card.kinds.payment : card.kinds.token}
                </span>
                <Tag tone={status.tone} size="sm">
                  {status.label}
                </Tag>
              </div>
              <p className="font-display text-xl font-bold leading-tight text-[color:var(--fg)] [overflow-wrap:anywhere]">
                {p.origin}
              </p>
              {p.kind === "payment" ? (
                <PaymentBody p={p} />
              ) : (
                <div className="grid gap-1">
                  <p className="text-sm text-[color:var(--fg)]">
                    {p.amount === null
                      ? fill(card.token.unlimited, { asset: p.asset })
                      : fill(card.token.limited, { amount: amount(p.amount, 6), asset: p.asset })}
                  </p>
                  <p className={`${T.small} font-mono`}>{short(p.spender)}</p>
                  <p className={T.small}>{card.token.noPause}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {p.kind === "payment" ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = p.status === "paused" ? "active" : "paused";
                        dispatch({ type: "permissionStatus", id: p.id, status: next });
                        setSaid(
                          next === "paused"
                            ? {
                                text: fill(allowances.pause.done, { origin: p.origin }),
                                note: allowances.pause.note,
                              }
                            : { text: fill(allowances.pause.resumed, { origin: p.origin }) },
                        );
                      }}
                    >
                      {p.status === "paused" ? card.actions.resume : card.actions.pause}
                    </Button>
                    <Button type="button" variant="soft" size="sm" onClick={onEditCaps}>
                      {card.actions.edit}
                    </Button>
                  </>
                ) : null}
                <Button type="button" variant="danger" size="sm" onClick={() => setTarget(p)}>
                  {card.actions.revoke}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <details className="group mx-4 mt-4 border-b border-[color:var(--rule)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] [&::-webkit-details-marker]:hidden">
          {allowances.help.title}
          <span
            aria-hidden="true"
            className="font-mono text-base text-[color:var(--fg-muted)] transition-transform duration-150 group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="grid gap-2 pb-4">
          <p className={T.small}>{allowances.help.body}</p>
          <p className="text-sm text-[color:var(--fg)]">{allowances.help.caps}</p>
        </div>
      </details>

      <div className="flex px-4 pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={onFull}>
          {common.actions.seeAll}
        </Button>
      </div>

      <Confirm
        open={target !== null}
        title={revoke.title}
        action={working ? revoke.working : revoke.action}
        cancel={revoke.cancel}
        disabled={working}
        onCancel={() => {
          if (!working) setTarget(null);
        }}
        onConfirm={() => setPending(target ? [target.id] : [])}
      >
        {target ? (
          <>
            <p className="text-sm text-[color:var(--fg)]">
              {target.kind === "payment"
                ? fill(revoke.payment, { origin: target.origin })
                : fill(revoke.token, { spender: short(target.spender), asset: target.asset })}
            </p>
            <p className={T.small}>{revoke.how}</p>
          </>
        ) : null}
      </Confirm>

      <Confirm
        open={all}
        title={counted(cards.length, revokeAll.title, revokeAll.titleOne)}
        action={working ? revoke.working : revokeAll.action}
        cancel={revokeAll.cancel}
        disabled={working}
        onCancel={() => {
          if (!working) setAll(false);
        }}
        onConfirm={() => setPending(cards.map((c) => c.id))}
      >
        <p className="text-sm text-[color:var(--fg)]">{revokeAll.body}</p>
        <p className={T.small}>{revoke.how}</p>
      </Confirm>

      <CapsForm
        key={adding ? "open" : "closed"}
        open={adding}
        asset={asset}
        onClose={() => setAdding(false)}
        onSave={(origin, caps) => {
          dispatch({ type: "caps", permission: newPayment(origin, caps, state.active, asset) });
          setAdding(false);
        }}
      />
    </div>
  );
}

/** A site given its caps before it first asks to pay. */
function newPayment(
  origin: string,
  caps: { perPayment: string; hour: string; day: string },
  account: string,
  asset: string,
): PaymentPermission {
  const at = new Date().toISOString();
  return {
    id: `caps-${origin}-${at}`,
    kind: "payment",
    origin,
    account,
    status: "active",
    granted: at,
    lastUsed: null,
    holder: origin,
    uses: [],
    merchant: origin,
    asset,
    caps: { perPayment: caps.perPayment, hour: caps.hour, day: caps.day },
    spent: { hour: "0.00", day: "0.00" },
    paymentsToday: 0,
    facilitator: "",
    week: [0, 0, 0, 0, 0, 0, 0],
  };
}
