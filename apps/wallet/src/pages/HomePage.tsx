import { common, history, walletHome } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import type { JSX } from "react";
import { Link } from "react-router";
import { WALLET_ART } from "../assets.js";
import { ActivityRow } from "../components/ActivityRow.js";
import { Block, Empty } from "../components/Block.js";
import { Screen } from "../components/Screen.js";
import { amount } from "../data/format.js";
import { useWallet } from "../data/store.js";
import type { Permission } from "../data/types.js";
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
  return fill(permissions.rows[permission.kind], values);
}

function Balance(): JSX.Element {
  return (
    <div className="grid gap-2">
      <p className={T.label}>{balance.label}</p>
      <p className="font-display text-[clamp(2rem,1.4rem+2.2vw,2.75rem)] font-extrabold uppercase leading-none text-[color:var(--fg-muted)]">
        {balance.unavailable}
      </p>
      <p className={T.small}>{balance.subLabel}</p>
    </div>
  );
}

export function Component() {
  const { state, dispatch } = useWallet();
  const recent = state.activity.slice(0, 4);

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
        <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-8">
          <div className="md:col-span-7">
            <Balance />
          </div>
          <p className="flex flex-wrap items-center gap-3 md:col-span-5">
            <Tag tone="network" size="sm">
              {common.networks.testnet.label}
            </Tag>
            <span className={T.small}>{banners.testnet}</span>
          </p>
        </div>

        <Block title={assets.title}>
          {state.assets.length === 0 ? (
            <Empty title={assets.empty.title} body={assets.empty.body} />
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
                className="text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
              >
                {activity.viewAll.label}
              </Link>
            }
          >
            {recent.length === 0 ? (
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
                      size="sm"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant={permission.kind === "site" ? "ghost" : "danger"}
                      size="sm"
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
