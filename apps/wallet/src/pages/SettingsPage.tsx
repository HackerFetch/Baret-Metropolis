import { common, policies, policy, settings, walletFrame } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { changedFields } from "@baret/wallet-ui/data/rules";
import { useWallet } from "@baret/wallet-ui/data/store";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { RuleSwitch } from "@baret/web-ui/components/RuleSwitch";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, type ReactNode, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { WALLET_ART } from "../assets.js";
import { WALLET_VERSION } from "../lib/version.js";
import { routes } from "../routes.js";

/**
 * Settings: five groups of rows (account, security, network, privacy, about),
 * each row its label, one plain line and its control; the danger zone, which
 * states every consequence before the button and asks again in a dialog with
 * an acknowledgement; and what Baret keeps. Changes apply at once and say
 * "Saved."
 */

const [account, security, network, privacy, about] = settings.groups;

function SettingRow({
  label,
  hint,
  control,
  href,
  toggle,
}: {
  label: string;
  hint: string;
  control?: ReactNode;
  /** An outside page: the label itself is the link. */
  href?: string;
  /** A switch takes the label's place, so the label is not said twice. */
  toggle?: { on: boolean; onToggle: (on: boolean) => void };
}): JSX.Element {
  return (
    <li className="grid gap-3 border-b border-[color:var(--rule)] py-4 md:grid-cols-12 md:items-start md:gap-6">
      <div className="grid gap-1 md:col-span-7">
        {toggle ? (
          <RuleSwitch
            label={label}
            stateWord={toggle.on ? policies.values.on : policies.values.off}
            on={toggle.on}
            onToggle={toggle.onToggle}
          />
        ) : (
          <p className="text-base font-medium text-[color:var(--fg)]">
            {href ? (
              <a href={href} rel="noreferrer" className={LINK}>
                {label}
              </a>
            ) : (
              label
            )}
          </p>
        )}
        <p className={T.small}>{hint}</p>
      </div>
      {control ? <div className="min-w-0 md:col-span-5 md:justify-self-end">{control}</div> : null}
    </li>
  );
}

function download(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "baret-wallet-data.json";
  link.click();
  URL.revokeObjectURL(url);
}

const LINK =
  "text-sm font-medium text-[color:var(--fg)] underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]";

export function Component() {
  const { state, dispatch } = useWallet();
  const nameId = useId();
  const confirmTitle = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [name, setName] = useState(state.accountName);

  const changed = changedFields(state.policy, state.template).length;
  const rulesValue =
    changed === 0 ? policy.templates[state.template].name : policies.current.custom.label;

  function confirm(): void {
    dispatch({ type: "reset" });
    setAcknowledged(false);
    dialog.current?.close();
    setSaved(settings.saved);
  }

  if (!account || !security || !network || !privacy || !about) return null;
  const [nameRow, addressRow, passkeyRow] = account.rows;
  const [lockRow, passkeyEveryRow, rulesRow] = security.rows;
  const [networkRow, nodeRow, serverRow] = network.rows;
  const [analyticsRow, exportRow] = privacy.rows;
  const [versionRow, sourceRow, limitsRow] = about.rows;

  return (
    <Screen title={settings.title} picture={WALLET_ART.settings}>
      <div className="grid gap-12">
        <p role="status" className="sr-only">
          {saved}
        </p>

        <Block title={account.title}>
          <ul className="grid border-t border-[color:var(--rule)]">
            {nameRow ? (
              <SettingRow
                label={nameRow.label}
                hint={nameRow.hint}
                control={
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (name.trim() === "") return;
                      dispatch({ type: "rename", name: name.trim() });
                      setSaved(settings.saved);
                    }}
                  >
                    <label htmlFor={nameId} className="sr-only">
                      {nameRow.label}
                    </label>
                    <input
                      id={nameId}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="off"
                      className="w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 py-2 text-base text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--focus)] md:w-56"
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {common.actions.done}
                    </Button>
                  </form>
                }
              />
            ) : null}
            {addressRow ? (
              <SettingRow
                label={addressRow.label}
                hint={addressRow.hint}
                control={
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm text-[color:var(--fg)]">
                      {truncateAddress(state.address)}
                    </code>
                    <CopyButton
                      text={state.address}
                      label={walletFrame.account.copy}
                      done={walletFrame.account.copied}
                    />
                  </div>
                }
              />
            ) : null}
            {passkeyRow ? <SettingRow label={passkeyRow.label} hint={passkeyRow.hint} /> : null}
          </ul>
        </Block>

        <Block title={security.title}>
          <ul className="grid border-t border-[color:var(--rule)]">
            {lockRow ? (
              <SettingRow
                label={lockRow.label}
                hint={lockRow.hint}
                toggle={{
                  on: state.settings.lockAfterInactivity,
                  onToggle: (on) => {
                    dispatch({ type: "setting", key: "lockAfterInactivity", value: on });
                    setSaved(settings.saved);
                  },
                }}
              />
            ) : null}
            {passkeyEveryRow ? (
              <SettingRow
                label={passkeyEveryRow.label}
                hint={passkeyEveryRow.hint}
                toggle={{
                  on: state.settings.passkeyEverySignature,
                  onToggle: (on) => {
                    dispatch({ type: "setting", key: "passkeyEverySignature", value: on });
                    setSaved(settings.saved);
                  },
                }}
              />
            ) : null}
            {rulesRow ? (
              <SettingRow
                label={rulesRow.label}
                hint={rulesRow.hint}
                control={
                  <Link to={routes.policies.path} className={LINK}>
                    {rulesValue}
                  </Link>
                }
              />
            ) : null}
          </ul>
        </Block>

        <Block title={network.title}>
          <ul className="grid border-t border-[color:var(--rule)]">
            {networkRow ? (
              <SettingRow
                label={networkRow.label}
                hint={networkRow.hint}
                control={
                  <Tag tone="network" size="sm">
                    {common.networks.testnet.label}
                  </Tag>
                }
              />
            ) : null}
            {nodeRow ? <SettingRow label={nodeRow.label} hint={nodeRow.hint} /> : null}
            {serverRow ? <SettingRow label={serverRow.label} hint={serverRow.hint} /> : null}
          </ul>
        </Block>

        <Block title={privacy.title}>
          <ul className="grid border-t border-[color:var(--rule)]">
            {analyticsRow ? (
              <SettingRow label={analyticsRow.label} hint={analyticsRow.hint} />
            ) : null}
            {exportRow ? (
              <SettingRow
                label={exportRow.label}
                hint={exportRow.hint}
                control={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      download(
                        JSON.stringify(
                          {
                            activity: state.activity,
                            permissions: state.permissions,
                            rules: state.policy,
                          },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    {exportRow.label}
                  </Button>
                }
              />
            ) : null}
          </ul>
        </Block>

        <Block title={about.title}>
          <ul className="grid border-t border-[color:var(--rule)]">
            {versionRow ? (
              <SettingRow
                label={versionRow.label}
                hint={versionRow.hint}
                control={
                  <span className={`font-mono text-sm text-[color:var(--fg)] ${T.num}`}>
                    {WALLET_VERSION}
                  </span>
                }
              />
            ) : null}
            {sourceRow ? (
              <SettingRow
                label={sourceRow.label}
                hint={sourceRow.hint}
                href={walletFrame.links.source}
              />
            ) : null}
            {limitsRow ? (
              <SettingRow
                label={limitsRow.label}
                hint={limitsRow.hint}
                href={walletFrame.links.limits}
              />
            ) : null}
          </ul>
        </Block>

        <Block title={settings.record.title}>
          <p className={`${T.body} max-w-[64ch]`}>{settings.record.body}</p>
          <ul className="grid border-t border-[color:var(--rule)]">
            {settings.record.points.map((point) => (
              <li
                key={point}
                className="border-b border-[color:var(--rule)] py-3 text-base text-[color:var(--fg)]"
              >
                {point}
              </li>
            ))}
          </ul>
        </Block>

        <Block title={settings.danger.title}>
          <p className="text-base font-medium text-[color:var(--fg)]">
            {settings.danger.reset.label}
          </p>
          <ul className="grid gap-2">
            {settings.danger.reset.consequences.map((line) => (
              <li key={line} className="flex gap-3 text-base text-[color:var(--fg)]">
                <span
                  aria-hidden="true"
                  className="mt-2.5 size-1.5 shrink-0 bg-[color:var(--fg)]"
                />
                {line}
              </li>
            ))}
          </ul>
          <div className="flex">
            <Button type="button" variant="danger" onClick={() => dialog.current?.showModal()}>
              {settings.danger.reset.label}
            </Button>
          </div>
        </Block>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={confirmTitle}
        onClose={() => setAcknowledged(false)}
        className="m-auto w-[min(92vw,520px)] border border-[color:var(--rule-strong)] bg-[color:var(--surface)] p-0 text-[color:var(--fg)] backdrop:bg-black/55"
      >
        <form
          method="dialog"
          className="grid gap-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (acknowledged) confirm();
          }}
        >
          <h2 id={confirmTitle} className={`${T.h3} text-[color:var(--fg)]`}>
            {settings.danger.reset.confirm.title}
          </h2>
          <p className={T.body}>{settings.danger.reset.confirm.body}</p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-[color:var(--fg)]">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.currentTarget.checked)}
              className="size-5 accent-[color:var(--fg)]"
            />
            {settings.danger.reset.confirm.acknowledge}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="ghost" onClick={() => dialog.current?.close()}>
              {settings.danger.reset.confirm.cancel}
            </Button>
            <Button type="submit" variant="danger" disabled={!acknowledged}>
              {settings.danger.reset.confirm.action}
            </Button>
          </div>
        </form>
      </dialog>
    </Screen>
  );
}
