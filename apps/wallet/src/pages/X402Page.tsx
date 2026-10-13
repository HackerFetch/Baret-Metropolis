import { walletX402 } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import { Block, Empty, Problem } from "@baret/wallet-ui/components/Block";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { useWallet } from "@baret/wallet-ui/data/store";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useState } from "react";
import { recentOf, spentSince, vaultOf } from "../console/audit.js";
import { Feed } from "../console/Feed.js";
import { LiveBar } from "../console/LiveBar.js";
import { type Poll, usePoll } from "../console/usePoll.js";
import { Merchants, Stats } from "../console/VaultParts.js";
import { useLive } from "../live/live.js";
import { routes } from "../routes.js";

/**
 * /x402, the x402 Console: what agents pay, read live from the Baret
 * indexer every 5 seconds (GET /api/v1/audit/...). Two tabs: this account's
 * PaymentGuard vault (its figures, its merchants and caps, its own feed) and
 * the whole Baret network (every agent's latest payments and the registry's
 * changes), so an account with no vault still sees live data.
 *
 * Fail-closed: a read that failed says so and shows nothing in its place; a
 * vault the wallet could not read shows no figures; the sample, which has no
 * vault on Monad, never polls one.
 */

const copy = walletX402;
type Tab = "vault" | "network";

const NETWORK_URL = "/api/v1/audit/recent?limit=25";

function Failed({ poll }: { poll: Poll<unknown> }): JSX.Element {
  return (
    <Problem
      title={copy.errors.unavailable.title}
      body={copy.errors.unavailable.body}
      action={
        <Button type="button" variant="ghost" size="sm" onClick={poll.retry}>
          {copy.errors.retry}
        </Button>
      }
    />
  );
}

function Loading(): JSX.Element {
  return (
    <div className="grid gap-2" aria-busy="true">
      <p role="status" aria-live="polite" className="sr-only">
        {copy.loading}
      </p>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="block h-12 bg-[color:var(--ground-deep)] motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}

/** Seconds since the page last re-rendered its clock; the feed's "ago" reads it. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function NetworkTab({ poll, now }: { poll: Poll<ReturnType<typeof recentOf>>; now: number }) {
  const rows = poll.data ?? [];
  const payments = rows.filter((r) => r.kind === "payment");
  const registry = rows.filter((r) => r.kind !== "payment");
  return (
    <div className="grid gap-12">
      {poll.status === "error" ? <Failed poll={poll as Poll<unknown>} /> : null}
      <Block title={copy.feed.titleNetwork}>
        {poll.data === null ? (
          poll.status === "error" ? null : (
            <Loading />
          )
        ) : payments.length === 0 ? (
          <p className={T.body}>{copy.feed.emptyNetwork}</p>
        ) : (
          <Feed rows={payments} now={now} label={copy.feed.titleNetwork} />
        )}
      </Block>
      {registry.length > 0 ? (
        <Block title={copy.registry.title}>
          <p className={`${T.body} max-w-[64ch]`}>{copy.registry.body}</p>
          <Feed rows={registry.slice(0, 10)} now={now} label={copy.registry.title} />
        </Block>
      ) : null}
    </div>
  );
}

function VaultTab({
  address,
  vaultStatus,
  sample,
  poll,
  now,
  onNetwork,
}: {
  address: string;
  vaultStatus: string;
  sample: boolean;
  poll: Poll<ReturnType<typeof vaultOf>>;
  now: number;
  onNetwork: () => void;
}): JSX.Element {
  if (sample) {
    return (
      <Empty
        title={copy.noVault.title}
        body={copy.sample}
        action={
          <Button type="button" variant="ghost" onClick={onNetwork}>
            {copy.noVault.network}
          </Button>
        }
      />
    );
  }
  if (vaultStatus === "loading") return <Loading />;
  if (vaultStatus !== "ok") {
    return <Problem title={copy.errors.vault.title} body={copy.errors.vault.body} />;
  }
  if (!address || poll.status === "missing") {
    return (
      <Empty
        title={copy.noVault.title}
        body={copy.noVault.body}
        action={
          <div className="flex flex-wrap gap-3">
            <LinkButton
              href={routes.delegation.path}
              label={copy.noVault.action}
              variant="primary"
            />
            <Button type="button" variant="ghost" onClick={onNetwork}>
              {copy.noVault.network}
            </Button>
          </div>
        }
      />
    );
  }
  const vault = poll.data;
  return (
    <div className="grid gap-12">
      {poll.status === "error" ? <Failed poll={poll as Poll<unknown>} /> : null}
      {vault === null ? (
        poll.status === "error" ? null : (
          <Loading />
        )
      ) : (
        <>
          <Stats vault={vault} today={spentSince(vault.feed, Math.floor(now / 1000) - 86_400)} />
          <Merchants merchants={vault.merchants} />
          <Block
            title={copy.feed.title}
            aside={
              <code
                className="font-mono text-sm text-[color:var(--fg-muted)]"
                title={vault.address}
              >
                {truncateAddress(vault.address)}
              </code>
            }
          >
            {vault.feed.length === 0 ? (
              <p className={T.body}>{copy.feed.empty}</p>
            ) : (
              <Feed rows={vault.feed} now={now} label={copy.feed.title} />
            )}
          </Block>
        </>
      )}
    </div>
  );
}

export function Component(): JSX.Element {
  const { state } = useWallet();
  const live = useLive();
  const sample = live === null;
  const address = state.vault.address;
  const hasVault = !sample && state.status.vault === "ok" && address !== "";
  const [tab, setTab] = useState<Tab | null>(null);
  const shown: Tab = tab ?? (hasVault ? "vault" : "network");
  const [paused, setPaused] = useState(false);
  const now = useNow();
  const tabsId = useId();

  const network = usePoll(shown === "network" ? NETWORK_URL : null, recentOf, { paused });
  const vault = usePoll(
    shown === "vault" && hasVault ? `/api/v1/audit/vault/${address}?limit=50` : null,
    vaultOf,
    { paused },
  );
  const active = shown === "vault" ? vault : network;

  const tabs: ReadonlyArray<{ key: Tab; label: string }> = [
    { key: "vault", label: copy.tabs.vault },
    { key: "network", label: copy.tabs.network },
  ];

  return (
    <Screen title={copy.title} body={copy.body}>
      <div className="grid gap-8">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--rule)]">
            <div role="tablist" aria-label={copy.tabs.label} className="flex">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  id={`${tabsId}-${t.key}`}
                  type="button"
                  role="tab"
                  aria-selected={shown === t.key}
                  aria-controls={`${tabsId}-panel`}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px min-h-11 border-b-2 px-4 font-display text-base font-bold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] ${shown === t.key ? "border-[color:var(--fg)] text-[color:var(--fg)]" : "border-transparent text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <LiveBar
              status={active.status}
              at={active.at}
              paused={paused}
              onToggle={() => setPaused((p) => !p)}
            />
          </div>
          {/* How often it reads, under the live line and not after a long feed. */}
          <p className={`${T.small} md:text-right`}>{fill(copy.live.every, {})}</p>
        </div>
        <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${shown}`}>
          {shown === "network" ? (
            <NetworkTab poll={network} now={now} />
          ) : (
            <VaultTab
              address={address}
              vaultStatus={state.status.vault}
              sample={sample}
              poll={vault}
              now={now}
              onNetwork={() => setTab("network")}
            />
          )}
        </div>
      </div>
    </Screen>
  );
}
