import { extFrame } from "@baret/content/extension/frame.content";
import { accounts } from "@baret/content/extension/popup/accounts.content";
import { common } from "@baret/content/shared/common.content";
import { Button, truncateAddress } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { amount } from "@baret/wallet-ui/data/format";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { Img } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { ArrowUpRight } from "lucide-react";
import { type JSX, useEffect, useId, useState } from "react";
import { POPUP_ART } from "../../../assets.js";
import { useExtension } from "../../../data/store.js";
import type { Account } from "../../../data/types.js";
import { TEXT_BUTTON } from "../frame/bits.js";
import { Sheet } from "../frame/Sheet.js";

/**
 * Accounts: every account from the one recovery phrase, each with its
 * balance; pick one to use it. Rename, copy and the explorer sit on each row.
 * A new account comes from the same phrase, so the backup already covers it,
 * and the sheet says so.
 */

const INPUT =
  "h-11 w-full min-w-0 border border-[color:var(--control-edge)] bg-[color:var(--ground)] px-3 text-base text-[color:var(--fg)] placeholder:text-[color:var(--fg-muted)] focus-visible:border-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

/** The sample's next address: made up, like every address here. */
function sampleAddress(index: number): string {
  return `0x${index.toString(16).padStart(2, "0")}7c1e4b9a2d5f8c3e6b0a4d7f1c9e2b5a8d3f6e`.slice(
    0,
    42,
  );
}

function NameForm({
  label,
  placeholder,
  initial,
  action,
  hint,
  onSave,
  onCancel,
}: {
  label: string;
  placeholder?: string;
  initial: string;
  action: string;
  hint?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const id = useId();
  const errorId = useId();
  const [name, setName] = useState(initial);
  const [tried, setTried] = useState(false);
  const blank = name.trim() === "";
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!blank) onSave(name.trim());
      }}
    >
      <label htmlFor={id} className={T.label}>
        {label}
      </label>
      <input
        id={id}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={32}
        aria-invalid={tried && blank ? true : undefined}
        aria-describedby={tried && blank ? errorId : undefined}
        // biome-ignore lint/a11y/noAutofocus: the form opens on the reader's own press.
        autoFocus
        className={INPUT}
      />
      {tried && blank ? (
        <p id={errorId} className="text-sm text-[color:var(--fg)]">
          {accounts.errors.nameEmpty}
        </p>
      ) : hint ? (
        <p className={T.small}>{hint}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {common.actions.cancel}
        </Button>
        <Button type="submit" variant="primary" size="sm">
          {action}
        </Button>
      </div>
    </form>
  );
}

function Row({
  account,
  active,
  onPick,
  onRename,
}: {
  account: Account;
  active: boolean;
  onPick: () => void;
  onRename: (name: string) => void;
}): JSX.Element {
  const [renaming, setRenaming] = useState(false);
  return (
    <li
      className={`grid gap-3 border-b border-[color:var(--rule)] px-4 py-4 ${active ? "bg-[color:var(--surface)]" : ""}`}
    >
      <button
        type="button"
        aria-pressed={active}
        onClick={onPick}
        className="grid gap-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="truncate font-display text-lg font-bold uppercase leading-tight text-[color:var(--fg)]">
            {account.name}
          </span>
          {active ? (
            <Tag tone="watching" size="sm">
              {accounts.row.active}
            </Tag>
          ) : null}
        </span>
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-sm text-[color:var(--fg-muted)]">
            {truncateAddress(account.address)}
          </span>
          <span className={`text-sm text-[color:var(--fg)] ${T.num}`}>
            {fill(accounts.row.balance, { amount: amount(account.balance) })}
          </span>
        </span>
      </button>
      {renaming ? (
        <NameForm
          label={accounts.rename.field.label}
          initial={account.name}
          action={accounts.rename.action}
          hint={accounts.rename.hint}
          onCancel={() => setRenaming(false)}
          onSave={(name) => {
            onRename(name);
            setRenaming(false);
          }}
        />
      ) : (
        <div className="-ml-2 flex flex-wrap items-center gap-x-1">
          <button type="button" onClick={() => setRenaming(true)} className={`${TEXT_BUTTON} px-2`}>
            {accounts.actions.rename}
          </button>
          <CopyButton
            text={account.address}
            label={accounts.actions.copy}
            done={extFrame.account.copied}
          />
          <a
            href={`${extFrame.links.explorer}/address/${account.address}`}
            target="_blank"
            rel="noreferrer"
            className={`${TEXT_BUTTON} gap-1 px-2`}
          >
            {accounts.actions.explorer}
            <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
          </a>
        </div>
      )}
    </li>
  );
}

export function Accounts({ onClose }: { onClose: () => void }): JSX.Element {
  const { state, dispatch } = useExtension();
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const next = state.accounts.length + 1;

  // Deriving the next account, stood in for by a short wait.
  useEffect(() => {
    if (working === null) return;
    const id = window.setTimeout(() => {
      dispatch({
        type: "addAccount",
        account: { id: `acc-${next}`, name: working, address: sampleAddress(next), balance: "0" },
      });
      setWorking(null);
      setAdding(false);
    }, 500);
    return () => window.clearTimeout(id);
  }, [working, next, dispatch]);

  return (
    <Sheet title={accounts.title} onClose={onClose}>
      <div
        className="relative aspect-[5/2] overflow-hidden border-b border-[color:var(--rule)]"
        style={{ backgroundColor: POPUP_ART.accounts.ground }}
      >
        <Img asset={POPUP_ART.accounts} sizes="360px" />
      </div>
      <p className={`${T.small} px-4 pt-4 pb-3`}>{accounts.body}</p>
      <ul className="grid border-t border-[color:var(--rule)]">
        {state.accounts.map((account) => (
          <Row
            key={account.id}
            account={account}
            active={account.id === state.active}
            onPick={() => dispatch({ type: "account", id: account.id })}
            onRename={(name) => dispatch({ type: "renameAccount", id: account.id, name })}
          />
        ))}
      </ul>
      <div className="grid gap-3 px-4 pt-4 pb-5">
        {adding ? (
          <div className="grid gap-2 border border-[color:var(--rule-strong)] p-3">
            <p className="font-display text-base font-bold uppercase text-[color:var(--fg)]">
              {accounts.add.title}
            </p>
            <p className={T.small}>{accounts.add.body}</p>
            {working ? (
              <p role="status" className="text-sm text-[color:var(--fg)]">
                {accounts.add.working}
              </p>
            ) : (
              <NameForm
                label={accounts.add.field.label}
                placeholder={fill(accounts.add.field.placeholder, { count: String(next) })}
                initial=""
                action={accounts.add.action}
                onCancel={() => setAdding(false)}
                onSave={setWorking}
              />
            )}
          </div>
        ) : (
          <Button type="button" variant="ghost" block onClick={() => setAdding(true)}>
            {accounts.actions.add}
          </Button>
        )}
        <p className={T.small}>{accounts.note}</p>
      </div>
    </Sheet>
  );
}
