import { common, extFrame, popupReceive } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { Qr } from "@baret/wallet-ui/components/Qr";
import { groups } from "@baret/wallet-ui/lib/address";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { Img } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { ArrowUpRight } from "lucide-react";
import type { JSX } from "react";
import { POPUP_ART } from "../../../assets.js";
import { activeAccount, useExtension } from "../../../data/store.js";
import { TEXT_BUTTON } from "../frame/bits.js";
import { Sheet } from "../frame/Sheet.js";

/**
 * Receive: the address as a QR code (the wallet's own encoder, checked
 * module for module against node-qrcode) and in groups of four, copy, the one
 * network Baret shows, and the faucet. A new wallet with nothing in it yet
 * opens on its picture: the empty hopper.
 */
export function Receive({ onClose }: { onClose: () => void }): JSX.Element {
  const { state } = useExtension();
  const account = activeAccount(state);
  const address = account?.address ?? "";
  const empty = state.assets.length === 0;

  return (
    <Sheet title={popupReceive.title} onClose={onClose}>
      {empty ? (
        <div
          className="relative aspect-[5/2] overflow-hidden border-b border-[color:var(--rule)]"
          style={{ backgroundColor: POPUP_ART.receive.ground }}
        >
          <Img asset={POPUP_ART.receive} sizes="360px" />
        </div>
      ) : null}
      <div className="grid gap-5 px-4 pt-5 pb-5">
        <div className="grid justify-items-center gap-2">
          <Qr text={address} className="size-44 border border-[color:var(--rule)]" />
          <p className="text-xs text-[color:var(--fg-muted)]">{popupReceive.qrHint}</p>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className={T.label}>{popupReceive.address.label}</p>
            <Tag tone="network" size="sm">
              {common.networks.testnet.label}
            </Tag>
          </div>
          <p
            className="font-mono text-base leading-relaxed text-[color:var(--fg)] [word-spacing:0.35em]"
            title={address}
          >
            {groups(address).join(" ")}
          </p>
          <div className="-ml-2 flex">
            <CopyButton
              text={address}
              label={popupReceive.address.copy}
              done={popupReceive.address.copied}
            />
          </div>
        </div>

        <p className="border-l-4 border-[color:var(--caution)] pl-3 text-sm text-[color:var(--fg)]">
          {popupReceive.warning}
        </p>

        <div className="grid gap-1 border-t border-[color:var(--rule)] pt-4">
          <a
            href={extFrame.links.faucet}
            target="_blank"
            rel="noreferrer"
            className={`${TEXT_BUTTON} w-max gap-1.5`}
          >
            {popupReceive.faucet.label}
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </a>
          <p className={T.small}>{popupReceive.faucet.hint}</p>
        </div>
      </div>
    </Sheet>
  );
}
