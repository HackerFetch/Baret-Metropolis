import { common, receive, walletFrame } from "@baret/content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block, Problem } from "@baret/wallet-ui/components/Block";
import { Qr } from "@baret/wallet-ui/components/Qr";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { ready, useWallet } from "@baret/wallet-ui/data/store";
import { groups } from "@baret/wallet-ui/lib/address";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { useState } from "react";
import { WALLET_ART } from "../assets.js";
import { useLive } from "../live/live.js";
import { useWatch } from "../live/useWatch.js";

/**
 * Receive: the address as a QR code and as text, in four-character groups so
 * it can be read aloud and compared, with a copy button that copies it whole.
 * Then the network it works on, the faucet, and the line that watches for
 * incoming transfers. Nothing here moves funds or asks for a signature.
 *
 * Live, the watching line is true: the balances are read again every 3 s for
 * 90 s and on the way back to the tab, and the dot pulses only while that
 * runs. After that, "Check again" starts another round.
 */

export function Component() {
  const { state } = useWallet();
  const live = useLive();
  const [copyFailed, setCopyFailed] = useState(false);
  const { polling, restart } = useWatch(live, true);
  const loading = live !== null && state.status.balances === "loading";
  const { address, network, faucet, watching, errors } = receive;

  return (
    <Screen title={receive.title} body={receive.body} picture={WALLET_ART.receive}>
      <div className="grid gap-12">
        <Block title={address.label}>
          <div className="grid gap-8 md:grid-cols-12 md:items-start md:gap-8">
            <figure className="grid w-full max-w-[280px] gap-3 md:col-span-4">
              <Qr text={state.address} className="w-full border border-[color:var(--rule)]" />
              <figcaption className={T.small}>{address.qrHint}</figcaption>
            </figure>
            <div className="grid content-start gap-5 md:col-span-8">
              <p className="font-mono text-xl text-[color:var(--fg)] md:text-2xl">
                <span className="sr-only">{state.address}</span>
                <span aria-hidden="true" className="[word-spacing:0.35em]">
                  {groups(state.address).join(" ")}
                </span>
              </p>
              <div className="-ml-2 flex">
                <CopyButton
                  text={state.address}
                  label={address.copy}
                  done={address.copied}
                  onError={() => setCopyFailed(true)}
                />
              </div>
              {copyFailed ? <Problem title={errors.copy.title} body={errors.copy.body} /> : null}
              <p className={`${T.body} max-w-[56ch]`}>{address.tokens}</p>
              {/* Watching reads Monad RPC: when balances did not load, it says it can't watch. */}
              {loading ? (
                <p role="status" className="text-sm text-[color:var(--fg)]">
                  {watching.loading}
                </p>
              ) : ready(state, "balances") ? (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {/* One status region that stays mounted, so each change is read
                      out. Live, once a round ends nothing is watching, so it is empty. */}
                  <p
                    role="status"
                    className="flex items-center gap-3 text-sm text-[color:var(--fg)] empty:hidden"
                  >
                    {live && !polling ? null : (
                      <>
                        <span
                          aria-hidden="true"
                          className={`size-2 rounded-full ${polling ? "bg-[color:var(--fg)] motion-safe:animate-pulse" : "bg-[color:var(--fg-muted)]"}`}
                        />
                        {polling ? watching.live : watching.idle}
                      </>
                    )}
                  </p>
                  {/* Live: always mounted and busy while a round runs, so a press
                      never drops focus to the page. */}
                  {live ? (
                    <Button
                      type="button"
                      variant="ghost"
                      aria-disabled={polling || undefined}
                      className="aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                      onClick={polling ? undefined : restart}
                    >
                      {watching.check}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Problem title={errors.watching.title} body={errors.watching.body} />
              )}
            </div>
          </div>
        </Block>

        <div className="grid gap-12 md:grid-cols-2 md:gap-8">
          <Block title={network.title}>
            <div className="flex">
              <Tag tone="network" size="sm">
                {common.networks.testnet.label}
              </Tag>
            </div>
            <p className={T.body}>{network.body}</p>
          </Block>
          <Block title={faucet.title}>
            <p className={T.body}>{faucet.body}</p>
            <div className="flex">
              <LinkButton
                href={walletFrame.links.faucet}
                label={faucet.action.label}
                icon="arrow-up-right"
                newTab
              />
            </div>
          </Block>
        </div>
      </div>
    </Screen>
  );
}
