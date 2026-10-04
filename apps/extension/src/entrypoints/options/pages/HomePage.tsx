import { common, extFrame, optionsHome, policy, popupHome } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block, Empty } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { amount, day } from "@baret/wallet-ui/data/format";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import type { JSX } from "react";
import { Link } from "react-router";
import { OPTIONS_ART } from "../../../assets.js";
import { byExposure, now, rulesTemplate, unusedFor30Days } from "../../../data/derive.js";
import { activeAccount, type ExtState, useExtension } from "../../../data/store.js";
import { exposureText, permissionLine, timeOf } from "../../../data/words.js";
import { LINK, LogLine } from "../parts/kit.js";

/**
 * Overview, the wide version of the popup's home: what the wallet holds, who
 * can spend from it, whether Baret is answering, and what happened last.
 * Every block links to the page that manages it. When Baret is unreachable
 * the status says what that means: every sign request counts as Blocked.
 */

const { balance, status, assets, watched, permissions, sites, recent, health } = optionsHome;

function checkup(state: ExtState) {
  const unlimited = state.permissions.filter(
    (p) => p.kind === "allowance" && p.amount === null,
  ).length;
  const unused = state.permissions.filter((p) => unusedFor30Days(p)).length;
  const [phrase, noLimit, stale] = health.items;
  return [
    { item: phrase, ok: state.settings.backedUp, count: 0, to: "/settings" },
    { item: noLimit, ok: unlimited === 0, count: unlimited, to: "/permissions" },
    { item: stale, ok: unused === 0, count: unused, to: "/permissions" },
  ].filter(
    (row): row is { item: NonNullable<typeof phrase>; ok: boolean; count: number; to: string } =>
      Boolean(row.item),
  );
}

function StatusPanel(): JSX.Element {
  const { state, dispatch } = useExtension();
  const template = rulesTemplate(state);
  return (
    <section
      aria-label={status.title}
      className={`grid content-start gap-2 border-l-4 py-1 pl-4 ${state.reachable ? "border-[color:var(--safe)]" : "border-[color:var(--blocked)]"}`}
    >
      <p className={T.label}>{status.title}</p>
      <p className="font-display text-xl font-bold uppercase leading-tight text-[color:var(--fg)]">
        {state.reachable ? status.reachable.ok : status.reachable.bad}
      </p>
      <p className="text-sm text-[color:var(--fg)]">
        {template === "custom"
          ? status.rules.custom
          : fill(status.rules.template, { template: policy.templates[template].name })}
      </p>
      <p className={`${T.small} ${T.num}`}>
        {status.lastCheck.label}:{" "}
        {state.lastCheck
          ? fill(status.lastCheck.value, { time: timeOf(state.lastCheck) })
          : status.lastCheck.never}
      </p>
      {!state.reachable ? (
        <div className="flex pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "reachable", value: true, at: now() })}
          >
            {status.action.label}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function Component() {
  const { state } = useExtension();
  const account = activeAccount(state);
  const mon = state.assets.find((a) => a.symbol === "MON");
  const top = byExposure(state.permissions.filter((p) => p.account === state.active)).slice(0, 4);
  const log = state.activity.filter((a) => a.account === state.active).slice(0, 5);
  const connected = state.sites.filter((s) => s.status === "connected");
  const unsigned = state.watched.reduce((sum, w) => sum + w.unsigned, 0);

  return (
    <Screen title={optionsHome.title} body={optionsHome.lead} picture={OPTIONS_ART.overview}>
      <div className="grid gap-14">
        <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-8">
          <div className="grid gap-2 md:col-span-7">
            <p className={T.label}>{balance.label}</p>
            <p className="flex items-baseline gap-3 text-[color:var(--fg)]">
              <span className="font-display text-[clamp(3rem,2rem+3vw,4.5rem)] font-extrabold leading-[0.9] tabular-nums slashed-zero">
                {amount(mon?.balance ?? account?.balance ?? "0")}
              </span>
              <span className="font-display text-2xl font-bold uppercase text-[color:var(--fg-muted)]">
                MON
              </span>
            </p>
            <p className={T.small}>
              {balance.usd}: {popupHome.balance.unavailable}
            </p>
          </div>
          <div className="md:col-span-5">
            <StatusPanel />
          </div>
        </div>

        <Block title={assets.title}>
          {state.assets.length === 0 ? (
            <Empty
              title={assets.empty.title}
              body={assets.empty.body}
              action={
                account ? (
                  <CopyButton
                    text={account.address}
                    label={assets.empty.action.label}
                    done={extFrame.account.copied}
                  />
                ) : undefined
              }
            />
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
                    className={`${T.label} hidden py-3 pr-4 text-right font-normal sm:table-cell`}
                  >
                    {assets.columns.value}
                  </th>
                  <th
                    scope="col"
                    className={`${T.label} hidden py-3 text-right font-normal md:table-cell`}
                  >
                    {assets.columns.contract}
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
                    <td className="hidden py-4 pr-4 text-right text-sm text-[color:var(--fg-muted)] sm:table-cell">
                      {popupHome.balance.unavailable}
                    </td>
                    <td className="hidden py-4 text-right font-mono text-sm text-[color:var(--fg-muted)] md:table-cell">
                      {asset.contract ? truncateAddress(asset.contract) : common.ui.none}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <Block
            title={permissions.title}
            className="lg:col-span-7"
            aside={
              <Link to={permissions.viewAll.href} className={LINK}>
                {permissions.viewAll.label}
              </Link>
            }
          >
            <p className={`${T.body} max-w-[60ch]`}>{permissions.body}</p>
            {top.length === 0 ? (
              <Empty title={permissions.empty.title} body={permissions.empty.body} />
            ) : (
              <ul className="grid border-t border-[color:var(--rule)]">
                {top.map((p) => (
                  <li
                    key={p.id}
                    className="grid gap-1 border-b border-[color:var(--rule)] py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6"
                  >
                    <span className="text-base text-[color:var(--fg)] [overflow-wrap:anywhere]">
                      {permissionLine(p)}
                    </span>
                    <span
                      className={`font-display text-lg font-bold uppercase sm:text-right ${p.kind === "allowance" && p.amount === null ? "text-[color:var(--blocked)]" : "text-[color:var(--fg)]"} ${T.num}`}
                    >
                      {exposureText(p, state.assets)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title={health.title} className="lg:col-span-5">
            <ul className="grid border-t border-[color:var(--rule)]">
              {checkup(state).map(({ item, ok, count, to }) => (
                <li
                  key={item.label}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[color:var(--rule)] py-3.5"
                >
                  <span className="text-base text-[color:var(--fg)]">{item.label}</span>
                  <span className="flex items-center gap-3">
                    <Tag tone={ok ? "safe" : "caution"} size="sm">
                      {ok ? item.ok : fill(item.bad, { count: String(count) })}
                    </Tag>
                    {ok ? null : (
                      <Link to={to} className={LINK}>
                        {health.action.label}
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <Block
            title={recent.title}
            className="lg:col-span-7"
            aside={
              log.length > 0 ? (
                <Link to={recent.viewAll.href} className={LINK}>
                  {recent.viewAll.label}
                </Link>
              ) : undefined
            }
          >
            {log.length === 0 ? (
              <Empty title={recent.empty.title} body={recent.empty.body} />
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

          <Block
            title={sites.title}
            className="lg:col-span-5"
            aside={
              connected.length > 0 ? (
                <Link to={sites.viewAll.href} className={LINK}>
                  {sites.viewAll.label}
                </Link>
              ) : undefined
            }
          >
            {connected.length === 0 ? (
              <Empty title={sites.empty.title} body={sites.empty.body} />
            ) : (
              <ul className="grid border-t border-[color:var(--rule)]">
                {connected.map((site) => (
                  <li
                    key={site.origin}
                    className="grid gap-1 border-b border-[color:var(--rule)] py-3.5"
                  >
                    <Link
                      to={`/sites/${encodeURIComponent(site.origin)}`}
                      className="w-max font-mono text-base text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
                    >
                      {site.origin}
                    </Link>
                    <span className={`${T.small} ${T.num}`}>
                      {fill(sites.row, {
                        date: day(site.connected ?? site.firstSeen),
                        time: site.lastUsed ? timeOf(site.lastUsed) : common.ui.none,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <Block
          title={watched.title}
          aside={
            unsigned > 0 ? (
              <Link to={watched.action.href} className={LINK}>
                {watched.action.label}
              </Link>
            ) : undefined
          }
        >
          <p className={`${T.body} max-w-[64ch]`}>{watched.body}</p>
          {unsigned > 0 ? (
            <p className="border-l-4 border-[color:var(--blocked)] pl-3 text-base font-medium text-[color:var(--fg)]">
              {fill(watched.alerts, { count: String(unsigned) })}
            </p>
          ) : null}
          <table className="w-full border-collapse">
            <caption className="sr-only">{watched.title}</caption>
            <thead>
              <tr className="border-b border-[color:var(--rule)]">
                <th scope="col" className={`${T.label} py-3 pr-4 text-left font-normal`}>
                  {watched.columns.name}
                </th>
                <th
                  scope="col"
                  className={`${T.label} hidden py-3 pr-4 text-left font-normal sm:table-cell`}
                >
                  {watched.columns.address}
                </th>
                <th scope="col" className={`${T.label} py-3 text-right font-normal`}>
                  {watched.columns.lastMovement}
                </th>
              </tr>
            </thead>
            <tbody>
              {state.watched.map((w) => (
                <tr key={w.address} className="border-b border-[color:var(--rule)]">
                  <th
                    scope="row"
                    className="py-3.5 pr-4 text-left text-base font-medium text-[color:var(--fg)]"
                  >
                    {w.name}
                    <span className="block font-mono text-sm font-normal text-[color:var(--fg-muted)] sm:hidden">
                      {truncateAddress(w.address)}
                    </span>
                  </th>
                  <td className="hidden py-3.5 pr-4 font-mono text-sm text-[color:var(--fg-muted)] sm:table-cell">
                    {truncateAddress(w.address)}
                  </td>
                  <td className={`py-3.5 text-right text-sm text-[color:var(--fg)] ${T.num}`}>
                    {w.lastMovement ? timeOf(w.lastMovement) : watched.never}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      </div>
    </Screen>
  );
}
