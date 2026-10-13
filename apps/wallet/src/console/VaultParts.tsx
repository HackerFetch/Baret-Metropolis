import { walletX402 } from "@baret/content";
import { truncateAddress } from "@baret/ui";
import { Block } from "@baret/wallet-ui/components/Block";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import type { VaultMerchant, VaultSummary } from "./audit.js";

/** The vault tab's figures and its merchants, as the indexer reports them. */
const copy = walletX402;

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="grid content-start gap-1 border border-[color:var(--rule)] bg-[color:var(--ground-deep)] p-4">
      <dt className={T.label}>{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums text-[color:var(--fg)]">
        {value}
      </dd>
    </div>
  );
}

export function Stats({ vault, today }: { vault: VaultSummary; today: string }): JSX.Element {
  const usdc = (v: string | null) => (v === null ? "-" : `${v} ${copy.asset}`);
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label={copy.stats.balance} value={usdc(vault.balance)} />
      <Stat label={copy.stats.payments} value={String(vault.payments)} />
      <Stat label={copy.stats.paid} value={usdc(vault.paid)} />
      <Stat label={copy.stats.today} value={usdc(today)} />
    </dl>
  );
}

const STATUS_TONE: Record<VaultMerchant["status"], string> = {
  active: "text-[color:var(--safe-ink)]",
  paused: "text-[color:var(--caution-ink)]",
  removed: "text-[color:var(--fg-muted)]",
};

export function Merchants({ merchants }: { merchants: readonly VaultMerchant[] }): JSX.Element {
  return (
    <Block title={copy.merchants.title}>
      {merchants.length === 0 ? (
        <p className={T.body}>{copy.merchants.none}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {merchants.map((m) => (
            <li key={m.address} className="grid gap-3 border border-[color:var(--rule)] p-4">
              <div className="flex items-center justify-between gap-3">
                <code className="font-mono text-sm text-[color:var(--fg)]" title={m.address}>
                  {truncateAddress(m.address)}
                </code>
                <span
                  className={`text-xs font-medium uppercase tracking-[0.08em] ${STATUS_TONE[m.status]}`}
                >
                  {copy.merchants[m.status]}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div className="grid gap-0.5">
                  <dt className="text-[color:var(--fg-muted)]">{copy.merchants.perPayment}</dt>
                  <dd className="tabular-nums text-[color:var(--fg)]">{m.perPayment ?? "-"}</dd>
                </div>
                <div className="grid gap-0.5">
                  <dt className="text-[color:var(--fg-muted)]">{copy.merchants.perDay}</dt>
                  <dd className="tabular-nums text-[color:var(--fg)]">{m.perDay ?? "-"}</dd>
                </div>
                <div className="grid gap-0.5">
                  <dt className="text-[color:var(--fg-muted)]">{copy.merchants.paid}</dt>
                  <dd className="tabular-nums text-[color:var(--fg)]">
                    {m.paid ?? "-"} ({m.payments})
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
