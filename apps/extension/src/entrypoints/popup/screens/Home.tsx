import { extFrame } from "@baret/content/extension/frame.content";
import { allowances as allowanceCopy } from "@baret/content/extension/popup/allowances.content";
import { popupHome } from "@baret/content/extension/popup/home.content";
import { Button, Meter } from "@baret/ui";
import { Parts } from "@baret/wallet-ui/components/Parts";
import { amount } from "@baret/wallet-ui/data/format";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ArrowDownLeft, ArrowUpRight, Repeat } from "lucide-react";
import { m } from "motion/react";
import { type JSX, useId } from "react";
import { POPUP_ART } from "../../../assets.js";
import {
  type Banner,
  bannerOf,
  fill as fullness,
  nearCap,
  payments,
} from "../../../data/derive.js";
import { activeAccount, type ExtState, useExtension } from "../../../data/store.js";
import type { Permission } from "../../../data/types.js";
import { headline, short } from "../../../data/words.js";
import { useCountUp } from "../../../lib/useCountUp.js";
import { PopupEmpty, PopupSection, TEXT_BUTTON, TextButton } from "../frame/bits.js";
import { ActivityLine } from "../parts/ActivityLine.js";

/**
 * Home, the popup's first tab (docs/WALLET.md 2.1): the balance with the
 * three quick actions, the one banner that needs a look, the tokens, the
 * last four entries of the log and the two busiest allowances with their
 * meters. Testnet tokens have no price, so the USD line says so.
 */

export type BannerTarget = "alerts" | "allowances" | "payments" | "settings" | "retry";

function Balance({ value }: { value: string }): JSX.Element {
  const final = amount(value);
  const counted = useCountUp(final);
  const { balance } = popupHome;
  return (
    <div className="grid gap-1.5 px-4 pt-5 pb-4">
      <p className={T.label}>{balance.label}</p>
      <p className="flex items-baseline gap-2 text-[color:var(--fg)]">
        <span className="sr-only">{`${final} MON`}</span>
        {/* The final value holds the width underneath, so MON never moves while it counts;
            the count is pinned left, since a moving left edge counts as a layout shift. */}
        <span
          aria-hidden="true"
          className="relative inline-block font-display text-[3.25rem] font-extrabold leading-[0.9] tracking-[-0.01em] tabular-nums slashed-zero"
        >
          <span className="invisible">{final}</span>
          <span className="absolute inset-y-0 left-0">{counted}</span>
        </span>
        <span
          aria-hidden="true"
          className="font-display text-xl font-bold uppercase text-[color:var(--fg-muted)]"
        >
          MON
        </span>
      </p>
      <p className={T.small}>{balance.unavailable}</p>
    </div>
  );
}

const EDGE: Record<Banner["kind"], string> = {
  drift: "border-[color:var(--blocked)]",
  unreachable: "border-[color:var(--blocked)]",
  revoked: "border-[color:var(--caution)]",
  unsettled: "border-[color:var(--caution)]",
  capNear: "border-[color:var(--caution)]",
  rpcDown: "border-[color:var(--caution)]",
  backup: "border-[color:var(--fg)]",
  noFunds: "border-[color:var(--fg)]",
};

const TARGET: Record<Banner["kind"], BannerTarget | "faucet"> = {
  drift: "alerts",
  unreachable: "retry",
  revoked: "allowances",
  unsettled: "payments",
  capNear: "allowances",
  rpcDown: "retry",
  backup: "settings",
  noFunds: "faucet",
};

function BannerBlock({
  banner,
  onAction,
}: {
  banner: Banner;
  onAction: (target: BannerTarget) => void;
}): JSX.Element {
  const words = popupHome.banners[banner.kind];
  const values = Object.fromEntries(
    Object.entries(banner.values).map(([key, value]) => [
      key,
      key === "amount" ? amount(value) : short(value),
    ]),
  );
  const target = TARGET[banner.kind];
  return (
    <m.div
      role="status"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-4 mb-4 grid gap-1.5 border-l-4 bg-[color:var(--surface)] py-3 pr-3 pl-3.5 ${EDGE[banner.kind]}`}
    >
      <p className="font-display text-base font-bold uppercase leading-tight tracking-[0.02em] text-[color:var(--fg)]">
        <Parts parts={headline(words.title, banner.values)} />
      </p>
      <p className={T.small}>{fill(words.body, values)}</p>
      <div className="flex">
        {target === "faucet" ? (
          <a href={extFrame.links.faucet} target="_blank" rel="noreferrer" className={TEXT_BUTTON}>
            {words.action.label}
          </a>
        ) : (
          <TextButton onClick={() => onAction(target)}>{words.action.label}</TextButton>
        )}
      </div>
    </m.div>
  );
}

/** The two busiest: payments by how full their caps are, then the allowances. */
function busiest(list: readonly Permission[]): Permission[] {
  const score = (p: Permission) =>
    p.kind === "payment"
      ? 1 + Math.max(fullness(p.spent.hour, p.caps.hour), fullness(p.spent.day, p.caps.day))
      : p.kind === "allowance"
        ? 0.5
        : 0;
  return [...list]
    .filter((p) => p.kind !== "operator")
    .sort((a, b) => score(b) - score(a))
    .slice(0, 2);
}

function AllowanceRow({ permission }: { permission: Permission }): JSX.Element {
  const id = useId();
  const { row } = popupHome.allowances;
  if (permission.kind === "payment") {
    const hour = permission.caps.hour;
    const line = hour
      ? fill(row.hour, {
          actual: `${permission.spent.hour} ${permission.asset}`,
          cap: `${hour} ${permission.asset}`,
        })
      : fill(row.day, {
          actual: `${permission.spent.day} ${permission.asset}`,
          cap: `${permission.caps.day} ${permission.asset}`,
        });
    const [spent, cap] = hour
      ? [permission.spent.hour, hour]
      : [permission.spent.day, permission.caps.day];
    return (
      <li className="grid gap-2 py-3">
        <p className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-[color:var(--fg)]">
            {permission.origin}
          </span>
          <span className="shrink-0 font-mono text-label uppercase text-[color:var(--fg-muted)]">
            {permission.status === "paused"
              ? allowanceCopy.card.status.paused
              : allowanceCopy.card.kinds.payment}
          </span>
        </p>
        <Meter value={Number(spent)} max={Number(cap)} describedBy={id} />
        <p id={id} className={`text-xs text-[color:var(--fg-muted)] ${T.num}`}>
          {line}
        </p>
      </li>
    );
  }
  const tokenLine =
    permission.kind === "allowance" && permission.amount === null
      ? fill(allowanceCopy.card.token.unlimited, { asset: permission.asset })
      : permission.kind === "allowance"
        ? fill(allowanceCopy.card.token.limited, {
            amount: amount(permission.amount ?? "0", 6),
            asset: permission.asset,
          })
        : row.noCap;
  return (
    <li className="grid gap-1 py-3">
      <p className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium text-[color:var(--fg)]">
          {permission.origin}
        </span>
        <span className="shrink-0 font-mono text-label uppercase text-[color:var(--fg-muted)]">
          {allowanceCopy.card.kinds.token}
        </span>
      </p>
      <p className="text-xs text-[color:var(--fg-muted)]">{tokenLine}</p>
    </li>
  );
}

function summary(state: ExtState): string {
  const { allowances } = popupHome;
  const active = state.permissions.filter((p) => p.status === "active").length;
  const near = payments(state.permissions).filter(nearCap).length;
  const head = fill(allowances.summary, { count: String(active) });
  return near > 0 ? `${head} · ${fill(allowances.nearCap, { count: String(near) })}` : head;
}

export function Home({
  onSend,
  onReceive,
  onSwap,
  onActivity,
  onAllowances,
  onTokens,
  onBanner,
}: {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
  onActivity: () => void;
  onAllowances: () => void;
  onTokens: () => void;
  onBanner: (target: BannerTarget) => void;
}): JSX.Element {
  const { state } = useExtension();
  const account = activeAccount(state);
  const banner = bannerOf(state);
  const recent = state.activity.filter((a) => a.account === state.active).slice(0, 4);
  const top = busiest(state.permissions.filter((p) => p.account === state.active));
  const { quickActions, tokens, activity, allowances } = popupHome;

  return (
    <div className="pb-2">
      <Balance value={account?.balance ?? "0"} />

      <div className="grid grid-cols-3 gap-2 px-4 pb-5">
        <Button type="button" variant="primary" className="px-2" onClick={onSend}>
          <ArrowUpRight aria-hidden="true" strokeWidth={2} />
          {quickActions.send}
        </Button>
        <Button type="button" variant="ghost" className="px-2" onClick={onReceive}>
          <ArrowDownLeft aria-hidden="true" strokeWidth={2} />
          {quickActions.receive}
        </Button>
        <Button type="button" variant="soft" className="px-2" onClick={onSwap}>
          <Repeat aria-hidden="true" strokeWidth={2} />
          {quickActions.swap}
        </Button>
      </div>

      {banner ? <BannerBlock banner={banner} onAction={onBanner} /> : null}

      <PopupSection
        title={tokens.title}
        action={
          state.assets.length > 0 ? (
            <TextButton onClick={onTokens}>{tokens.viewAll}</TextButton>
          ) : undefined
        }
      >
        {state.assets.length === 0 ? (
          <div className="grid gap-1 border border-dashed border-[color:var(--rule-strong)] p-3">
            <p className="text-sm font-medium text-[color:var(--fg)]">{tokens.empty.title}</p>
            <p className={T.small}>{tokens.empty.body}</p>
            <div className="flex">
              <TextButton onClick={onReceive}>{tokens.empty.action.label}</TextButton>
            </div>
          </div>
        ) : (
          <ul className="grid">
            {state.assets.map((asset) => (
              <li
                key={asset.symbol}
                className="flex items-baseline justify-between gap-3 border-b border-[color:var(--rule)] py-2.5 last:border-b-0"
              >
                <span className="font-display text-lg font-bold uppercase text-[color:var(--fg)]">
                  {asset.symbol}
                </span>
                <span className="font-display text-lg font-extrabold tabular-nums text-[color:var(--fg)]">
                  {amount(asset.balance, asset.decimals)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PopupSection>

      <PopupSection
        title={activity.title}
        flush
        action={
          recent.length > 0 ? (
            <TextButton onClick={onActivity}>{activity.viewAll}</TextButton>
          ) : undefined
        }
      >
        {recent.length === 0 ? (
          <PopupEmpty
            picture={POPUP_ART.home}
            title={activity.empty.title}
            body={activity.empty.body}
          />
        ) : (
          <ul className="-mt-1 grid">
            {recent.map((item) => (
              <li key={item.id} className="border-b border-[color:var(--rule)] last:border-b-0">
                <ActivityLine item={item} />
              </li>
            ))}
          </ul>
        )}
      </PopupSection>

      <PopupSection
        title={allowances.title}
        action={
          top.length > 0 ? (
            <TextButton onClick={onAllowances}>{allowances.viewAll}</TextButton>
          ) : undefined
        }
      >
        {top.length === 0 ? (
          <div className="grid gap-1 border border-dashed border-[color:var(--rule-strong)] p-3">
            <p className="text-sm font-medium text-[color:var(--fg)]">{allowances.empty.title}</p>
            <p className={T.small}>{allowances.empty.body}</p>
          </div>
        ) : (
          <>
            <p className={`text-sm text-[color:var(--fg)] ${T.num}`}>{summary(state)}</p>
            <ul className="-mt-1 grid divide-y divide-[color:var(--rule)]">
              {top.map((permission) => (
                <AllowanceRow key={permission.id} permission={permission} />
              ))}
            </ul>
          </>
        )}
      </PopupSection>
    </div>
  );
}
