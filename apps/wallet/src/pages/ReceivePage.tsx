import { common, receive, walletFrame } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { Block, Problem } from "@baret/wallet-ui/components/Block";
import { Qr } from "@baret/wallet-ui/components/Qr";
import { Screen } from "@baret/wallet-ui/components/Screen";
import { useWallet } from "@baret/wallet-ui/data/store";
import { groups } from "@baret/wallet-ui/lib/address";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { T } from "@baret/web-ui/lib/type";
import { useState } from "react";
import { WALLET_ART } from "../assets.js";

/**
 * Receive: the address as a QR code and as text, in four-character groups so
 * it can be read aloud and compared, with a copy button that copies it whole.
 * Then the network it works on, the faucet, and the line that watches for
 * incoming transfers. Nothing here moves funds or asks for a signature.
 */

export function Component() {
  const { state } = useWallet();
  const [copyFailed, setCopyFailed] = useState(false);
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
              <p className="flex items-center gap-3 text-sm text-[color:var(--fg)]">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-[color:var(--fg-muted)]"
                />
                {watching.idle}
              </p>
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
              />
            </div>
          </Block>
        </div>
      </div>
    </Screen>
  );
}
