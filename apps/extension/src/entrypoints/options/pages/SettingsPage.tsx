import { common, extFrame, optionsSettings, policy } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { OPTIONS_ART } from "../../../assets.js";
import { rulesTemplate } from "../../../data/derive.js";
import { useGate } from "../../../data/gate.js";
import { activeAccount, useExtension } from "../../../data/store.js";
import type { Account, Settings } from "../../../data/types.js";
import { EXT_VERSION } from "../../../lib/version.js";
import { Dialog, INPUT, LINK, useLock } from "../parts/kit.js";
import {
  ChangePassphrase,
  download,
  Endpoint,
  MinutesSelect,
  Note,
  RevealPhrase,
  Rows,
  SettingRow,
} from "./settings-parts.js";

/**
 * Settings, in the wallet's settings grammar: each row its label, one plain
 * line and its control, in blocks for the account, security, rules, network,
 * notifications, privacy (what leaves this device and where it goes),
 * advanced and about. The danger zone lists what a reset deletes and what it
 * leaves before the button, then asks again behind an acknowledgement.
 * Every change applies at once and a status line says "Saved." Anything that
 * would reach a node or a server is stood in for by the sample.
 */

const { identity, security, rules, network, notifications, privacy, advanced, about, danger } =
  optionsSettings;

const LOCK_CHOICES = [5, 15, 30, 60] as const;
const TIMEOUT_CHOICES = [1, 5, 10] as const;
const NOTIFY = ["drift", "capNear", "capReached", "unsettled"] as const;

/** The account name: saved on submit, refused when empty. */
function RenameForm({ account, onSaved }: { account: Account; onSaved: () => void }): JSX.Element {
  const { dispatch } = useExtension();
  const [nameRow] = identity.rows;
  const id = useId();
  const errorId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(account.name);
  const [empty, setEmpty] = useState(false);
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = name.trim();
        if (next === "") {
          setEmpty(true);
          field.current?.focus();
          return;
        }
        setName(next);
        dispatch({ type: "renameAccount", id: account.id, name: next });
        onSaved();
      }}
    >
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          {nameRow.label}
        </label>
        <input
          ref={field}
          id={id}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setEmpty(false);
          }}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={empty ? true : undefined}
          aria-describedby={empty ? errorId : undefined}
          className={`${INPUT} md:w-56`}
        />
        <Button type="submit" variant="ghost">
          {common.actions.save}
        </Button>
      </div>
      {empty ? (
        <Note tone="blocked" id={errorId}>
          {identity.nameEmpty}
        </Note>
      ) : null}
    </form>
  );
}

/** One side of "What a reset does". Both sides carry the same weight. */
function Consequences({ label, items }: { label: string; items: readonly string[] }): JSX.Element {
  return (
    <div className="grid content-start gap-3 border-t border-[color:var(--rule-strong)] pt-3">
      <p className={T.label}>{label}</p>
      <ul className="grid gap-2">
        {items.map((line) => (
          <li key={line} className="flex gap-3 text-base text-[color:var(--fg)]">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 bg-[color:var(--fg)]" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Component() {
  const { state, dispatch } = useExtension();
  const lock = useLock();
  const gate = useGate();
  const navigate = useNavigate();
  const account = activeAccount(state);
  const [status, setStatus] = useState("");
  const statusTimer = useRef<number | undefined>(undefined);
  const [changed, setChanged] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => () => window.clearTimeout(statusTimer.current), []);

  /** Speaks through the status line. It empties first, so the same words are read again. */
  function say(message: string): void {
    window.clearTimeout(statusTimer.current);
    setStatus("");
    statusTimer.current = window.setTimeout(() => setStatus(message), 100);
  }

  function patch(change: Partial<Settings>): void {
    dispatch({ type: "settings", patch: change });
    say(optionsSettings.saved);
  }

  const template = rulesTemplate(state);
  const templateName =
    template === "custom" ? policy.templates.custom.name : policy.templates[template].name;

  const [nameRow, addressRow, accountsRow] = identity.rows;
  const [passRow, lockRow, revealRow, lockNowRow] = security.rows;
  const [networkRow, nodeRow, serverRow] = network.rows;
  const [, , , , exportRow, clearRow] = privacy.rows;
  const [rawRow, timeoutRow, debugRow] = advanced.rows;
  const [versionRow, sourceRow, auditRow, limitsRow, licenceRow] = about.rows;
  const { consequences, confirm } = danger.reset;

  function exportData(): void {
    const data = {
      activity: state.activity,
      permissions: state.permissions,
      rules: state.policy,
      sites: state.sites,
    };
    download("baret-extension-data.json", JSON.stringify(data, null, 2));
  }

  return (
    <Screen
      title={optionsSettings.title}
      body={optionsSettings.lead}
      picture={OPTIONS_ART.settings}
    >
      <div className="grid gap-12">
        <p role="status" className="sr-only">
          {status}
        </p>

        <Block title={identity.title}>
          <Rows>
            <SettingRow
              label={nameRow.label}
              hint={nameRow.hint}
              control={
                account ? (
                  <RenameForm
                    key={account.id}
                    account={account}
                    onSaved={() => say(optionsSettings.saved)}
                  />
                ) : null
              }
            />
            <SettingRow
              label={addressRow.label}
              hint={addressRow.hint}
              control={
                account ? (
                  <div className="flex flex-wrap items-center gap-x-2">
                    <code
                      className="font-mono text-sm text-[color:var(--fg)]"
                      title={account.address}
                    >
                      {truncateAddress(account.address)}
                    </code>
                    <CopyButton
                      text={account.address}
                      label={extFrame.account.copy}
                      done={extFrame.account.copied}
                    />
                  </div>
                ) : null
              }
            />
            <SettingRow
              label={accountsRow.label}
              hint={accountsRow.hint}
              control={
                <span className={`font-mono text-sm text-[color:var(--fg)] ${T.num}`}>
                  {state.accounts.length}
                </span>
              }
            />
          </Rows>
        </Block>

        <Block title={security.title}>
          <Rows>
            <SettingRow
              label={passRow.label}
              hint={passRow.hint}
              control={
                <ChangePassphrase
                  onDone={() => {
                    setChanged(true);
                    say(security.passphrase.done);
                  }}
                />
              }
            >
              {changed ? <Note tone="safe">{security.passphrase.done}</Note> : null}
            </SettingRow>
            <SettingRow
              label={lockRow.label}
              hint={lockRow.hint}
              control={
                <MinutesSelect
                  label={lockRow.label}
                  value={state.settings.lockMinutes}
                  choices={LOCK_CHOICES}
                  onChange={(lockMinutes) => patch({ lockMinutes })}
                />
              }
            />
            <SettingRow
              label={revealRow.label}
              hint={revealRow.hint}
              control={
                <RevealPhrase label={revealRow.label} onWritten={() => patch({ backedUp: true })} />
              }
            />
            <SettingRow
              label={lockNowRow.label}
              hint={lockNowRow.hint}
              control={
                <Button type="button" variant="ghost" size="sm" onClick={lock}>
                  {extFrame.lock.label}
                </Button>
              }
            />
          </Rows>
        </Block>

        <Block title={rules.title}>
          <Rows>
            <SettingRow
              label={rules.row.label}
              hint={fill(rules.row.hint, { template: templateName })}
              control={
                <Link to={rules.action.href} className={LINK}>
                  {rules.action.label}
                </Link>
              }
            />
          </Rows>
        </Block>

        <Block title={network.title}>
          <Rows>
            <SettingRow
              label={networkRow.label}
              hint={networkRow.hint}
              control={
                <Tag tone="network" size="sm">
                  {common.networks.testnet.label}
                </Tag>
              }
            />
            <Endpoint label={nodeRow.label} hint={nodeRow.hint} />
            <Endpoint label={serverRow.label} hint={serverRow.hint} />
          </Rows>
        </Block>

        <Block title={notifications.title}>
          <Rows>
            {NOTIFY.map((key, index) => {
              const row = notifications.rows[index];
              if (!row) return null;
              return (
                <SettingRow
                  key={key}
                  label={row.label}
                  hint={row.hint}
                  toggle={{
                    on: state.settings.notify[key],
                    onToggle: (on) => patch({ notify: { ...state.settings.notify, [key]: on } }),
                  }}
                />
              );
            })}
          </Rows>
        </Block>

        <Block title={privacy.title}>
          <p className={`${T.body} max-w-[64ch]`}>{privacy.body}</p>
          <Rows>
            {privacy.rows.slice(0, 4).map((row) => (
              <SettingRow key={row.label} label={row.label} hint={row.hint} />
            ))}
            <SettingRow
              label={exportRow.label}
              hint={exportRow.hint}
              control={
                <Button type="button" variant="ghost" size="sm" onClick={exportData}>
                  {exportRow.label}
                </Button>
              }
            />
            <SettingRow
              label={clearRow.label}
              hint={clearRow.hint}
              control={
                <Button type="button" variant="danger" size="sm" onClick={() => setClearing(true)}>
                  {clearRow.label}
                </Button>
              }
            />
          </Rows>
        </Block>

        <Block title={advanced.title}>
          <Rows>
            <SettingRow
              label={rawRow.label}
              hint={rawRow.hint}
              toggle={{
                on: state.settings.rawData,
                onToggle: (rawData) => patch({ rawData }),
              }}
            />
            <SettingRow
              label={timeoutRow.label}
              hint={timeoutRow.hint}
              control={
                <MinutesSelect
                  label={timeoutRow.label}
                  value={state.settings.timeoutMinutes}
                  choices={TIMEOUT_CHOICES}
                  onChange={(timeoutMinutes) => patch({ timeoutMinutes })}
                />
              }
            />
            <SettingRow
              label={debugRow.label}
              hint={debugRow.hint}
              toggle={{
                on: state.settings.debugLog,
                onToggle: (debugLog) => patch({ debugLog }),
              }}
            />
          </Rows>
        </Block>

        <Block title={about.title}>
          <Rows>
            <SettingRow
              label={versionRow.label}
              control={
                <span className={`font-mono text-sm text-[color:var(--fg)] ${T.num}`}>
                  {fill(versionRow.hint, { version: EXT_VERSION })}
                </span>
              }
            />
            <SettingRow
              label={sourceRow.label}
              hint={sourceRow.hint}
              href={extFrame.links.source}
            />
            <SettingRow label={auditRow.label} hint={auditRow.hint} />
            <SettingRow
              label={limitsRow.label}
              hint={limitsRow.hint}
              href={extFrame.links.limits}
            />
            <SettingRow label={licenceRow.label} hint={licenceRow.hint} />
          </Rows>
        </Block>

        <Block title={danger.title}>
          <div className="grid gap-1">
            <p className="text-base font-medium text-[color:var(--fg)]">{danger.reset.label}</p>
            <p className={T.small}>{danger.reset.hint}</p>
          </div>
          <div className="grid gap-4">
            <h3 className="text-base font-medium text-[color:var(--fg)]">{consequences.title}</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <Consequences label={consequences.labels.deleted} items={consequences.deleted} />
              <Consequences label={consequences.labels.kept} items={consequences.kept} />
            </div>
          </div>
          <div className="flex">
            <Button type="button" variant="danger" onClick={() => setResetting(true)}>
              {danger.reset.label}
            </Button>
          </div>
        </Block>
      </div>

      <Dialog
        open={clearing}
        title={privacy.clear.title}
        action={privacy.clear.action}
        danger
        onConfirm={() => {
          dispatch({ type: "clearActivity" });
          setClearing(false);
          say(optionsSettings.saved);
        }}
        onCancel={() => setClearing(false)}
      >
        <p className={T.body}>{privacy.clear.body}</p>
      </Dialog>

      <Dialog
        open={resetting}
        title={confirm.title}
        action={confirm.action}
        cancel={confirm.cancel}
        danger
        disabled={!acknowledged}
        onConfirm={() => {
          if (!acknowledged) return;
          // Live: the vault and everything stored go, and setup opens.
          if (gate) return gate.wipe(false);
          dispatch({ type: "reset" });
          setResetting(false);
          navigate("/onboarding");
        }}
        onCancel={() => {
          setResetting(false);
          setAcknowledged(false);
        }}
      >
        <p className={T.body}>{confirm.body}</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-[color:var(--fg)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.currentTarget.checked)}
            className="size-5 shrink-0 accent-[color:var(--fg)]"
          />
          {confirm.acknowledge}
        </label>
      </Dialog>
    </Screen>
  );
}
