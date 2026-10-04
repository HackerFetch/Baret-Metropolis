import { common, history, walletFrame, walletHome } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { ActivityRow } from "@baret/wallet-ui/components/ActivityRow";
import { Block, Empty, Problem } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount } from "@baret/wallet-ui/data/format";
import { ready, useWallet } from "@baret/wallet-ui/data/store";
import type { Asset, Permission } from "@baret/wallet-ui/data/types";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { useCountUp } from "@baret/web-ui/lib/useCountUp";
import { counted, fill } from "@baret/web-ui/lib/util";
import type { JSX } from "react";
import { Link } from "react-router";
import { WALLET_ART } from "../assets.js";
import { routes } from "../routes.js";

/**
 * Home: the account, its balance, the three ways out (send, receive, the
 * agent), then what it holds, what happened lately, what can still spend
 * from it, and what needs a look. One banner, the most urgent of three.
 *
 * Testnet tokens have no price, so the USD estimate says so instead of
 * inventing one; the balances themselves lead the assets block.
 */

const { balance, actions, assets, activity, permissions, alerts, banners } = walletHome;

/** A permission's sentence: addresses shortened, the agent's merchants counted. */
function permissionText(permission: Permission): string {
  const values: Record<string, string> = { ...permission.values };
  for (const key of ["spender", "operator"]) {
    const value = values[key];
    if (value?.startsWith("0x")) values[key] = truncateAddress(value);
  }
  if (permission.kind === "agent") {
    const count = Number(values.count ?? "0");
    return counted(count, permissions.rows.agent, permissions.rows.agentOne, values);
  }
  return fill(permissions.rows[permission.kind], values);
}

/** The MON figure, counted up once on the first paint. */
function MonFigure({ mon }: { mon: Asset }): JSX.Element {
  const shown = useCountUp(amount(mon.balance, mon.decimals));
  return (
    <p className="font-display text-[clamp(2rem,1.4rem+2.2vw,2.75rem)] font-extrabold uppercase leading-none tabular-nums text-[color:var(--fg)]">
      {shown} MON
    </p>
  );
}

/** Fail-closed: a balance that did not load is said so, never shown as zero. */
function Balance({ loaded, mon }: { loaded: boolean; mon: Asset | undefined }): JSX.Element {
  return (
    <div className="grid gap-2">
      <p className={T.label}>{balance.label}</p>
      {loaded ? (
        <>
          <MonFigure mon={mon ?? { symbol: "MON", balance: "0", decimals: 18, contract: null }} />
          <p className={T.small}>{balance.monNote}</p>
        </>
      ) : (
        <Problem body={balance.error} />
      )}
    </div>
  );
}

/** The faucet, for an account with nothing to pay a fee with. */
function FaucetLink(): JSX.Element {
  return <LinkButton href={walletFrame.links.faucet} label={assets.empty.action.label} />;
}

export function Component() {
  const { state, dispatch } = useWallet();
  const recent = state.activity.slice(0, 4);
  const balancesReady = ready(state, "balances");
  const analyzerReady = ready(state, "analyzer");
  const mon = state.assets.find((asset) => asset.symbol === "MON");
  const noFunds = balancesReady && (!mon || /^[0.]*$/.test(mon.balance));

  function revoke(permission: Permission): void {
    dispatch({
      type: "revoke",
      id: permission.id,
      item: {
        id: `revoke-${permission.id}-${state.activity.length}`,
        kind: permission.kind === "site" ? "disconnect" : "revoke",
        at: new Date().toISOString(),
        values:
          permission.kind === "site"
            ? { origin: permission.values.origin ?? "" }
            : { spender: permission.values.spender ?? "" },
        verdict: null,
        findings: [],
        changes: [],
      },
    });
  }

  return (
    <Screen
      title={state.accountName}
      picture={WALLET_ART.home}
      actions={
        <>
          <LinkButton href={routes.send.path} label={actions.send} variant="primary" />
          <LinkButton href={routes.receive.path} label={actions.receive} />
          <LinkButton href={routes.delegation.path} label={actions.agents} />
        </>
      }
    >
      <div className="grid gap-12">
        {/* One banner, the most urgent: Baret unreachable, then no MON for a fee. */}
        {!analyzerReady ? (
          <Problem body={banners.analyzerDown} />
        ) : noFunds ? (
          <Problem body={banners.noFunds} action={<FaucetLink />} />
        ) : null}

        <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-8">
          <div className="md:col-span-7">
            <Balance loaded={balancesReady} mon={mon} />
          </div>
          <p className="flex flex-wrap items-center gap-3 md:col-span-5">
            <Tag tone="network" size="sm">
              {common.networks.testnet.label}
            </Tag>
            <span className={T.small}>{banners.testnet}</span>
          </p>
        </div>

        <Block title={assets.title}>
          {!balancesReady ? (
            <Problem body={balance.error} />
          ) : state.assets.length === 0 ? (
            <Empty title={assets.empty.title} body={assets.empty.body} action={<FaucetLink />} />
          ) : (
            <table className="w-full border-collapse">
              <caption className="sr-only">{assets.title}</caption>
              <thead>
                <tr className="border-b border-[color:var(--rule)]">
                  <th scope="col" className={`${T.label} py-3 pr-4 text-left font-normal`}>
                    {assets.columns.asset}
                  </th>
                  <th scope="col" className={`${T.label} py-3 pr-4 text-right font-normal`}>
                    {assets.columns.balance}
                  </th>
                  <th
                    scope="col"
                    className={`${T.label} hidden py-3 text-right font-normal sm:table-cell`}
                  >
                    {assets.columns.value}
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.assets.map((asset) => (
                  <tr key={asset.symbol} className="border-b border-[color:var(--rule)]">
                    <th
                      scope="row"
                      className="py-4 pr-4 text-left font-display text-2xl font-bold text-[color:var(--fg)]"
                    >
                      {asset.symbol}
                    </th>
                    <td className="py-4 pr-4 text-right font-display text-2xl font-extrabold tabular-nums text-[color:var(--fg)]">
                      {amount(asset.balance, asset.decimals)}
                    </td>
                    <td className="hidden py-4 text-right text-sm text-[color:var(--fg-muted)] sm:table-cell">
                      {balance.unavailable}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <Block
            title={activity.title}
            className="lg:col-span-7"
            aside={
              <Link
                to={activity.viewAll.href}
                className="inline-flex min-h-11 items-center text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
              >
                {activity.viewAll.label}
              </Link>
            }
          >
            {!ready(state, "activity") ? (
              <Problem title={history.errors.load.title} body={history.errors.load.body} />
            ) : recent.length === 0 ? (
              <Empty
                title={activity.empty.title}
                body={activity.empty.body}
                action={
                  <LinkButton
                    href={activity.empty.action.href}
                    label={activity.empty.action.label}
                  />
                }
              />
            ) : (
              <ul aria-label={history.title} className="grid border-t border-[color:var(--rule)]">
                {recent.map((item) => (
                  <li key={item.id} className="border-b border-[color:var(--rule)]">
                    <ActivityRow item={item} />
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title={alerts.title} className="lg:col-span-5">
            {state.alerts.length === 0 ? (
              <p className={T.body}>{alerts.empty}</p>
            ) : (
              <ul className="grid gap-4">
                {state.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="border-l-4 border-[color:var(--fg)] pl-4 text-base text-[color:var(--fg)]"
                  >
                    {fill(alerts[alert.kind], {
                      ...alert.values,
                      ...(alert.values.spender
                        ? { spender: truncateAddress(alert.values.spender) }
                        : {}),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <Block
          title={permissions.title}
          aside={
            <span className={`${T.label} ${T.num}`}>
              {fill(permissions.summary, { count: String(state.permissions.length) })}
            </span>
          }
        >
          <p className={`${T.body} max-w-[64ch]`}>{permissions.body}</p>
          {state.permissions.length === 0 ? (
            <Empty title={permissions.empty.title} body={permissions.empty.body} />
          ) : (
            <ul className="grid border-t border-[color:var(--rule)]">
              {state.permissions.map((permission) => (
                <li
                  key={permission.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[color:var(--rule)] py-4"
                >
                  <span className="min-w-0 flex-1 text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                    {permissionText(permission)}
                  </span>
                  {permission.kind === "agent" ? (
                    <LinkButton
                      href={permissions.manageAgent.href}
                      label={permissions.manageAgent.label}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant={permission.kind === "site" ? "ghost" : "danger"}
                      onClick={() => revoke(permission)}
                    >
                      {permission.kind === "site"
                        ? permissions.disconnect
                        : permissions.revoke.label}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className={T.small}>{permissions.revoke.note}</p>
        </Block>
      </div>
    </Screen>
  );
}
