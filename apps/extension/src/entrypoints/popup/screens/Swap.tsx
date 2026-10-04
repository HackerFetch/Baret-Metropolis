import { extFrame, popupHome } from "@baret/content";
import { ImgWell } from "@baret/web-ui/components/Img";
import { T } from "@baret/web-ui/lib/type";
import { ArrowUpRight } from "lucide-react";
import type { JSX } from "react";
import { POPUP_ART } from "../../../assets.js";
import { Sheet } from "../frame/Sheet.js";

/**
 * Swap is not built (docs/WALLET.md 2.1 and section 7): the screen says so
 * plainly and points to a Monad exchange, where Baret still checks the swap
 * before it is signed. No half-built form.
 */
export function Swap({ onClose }: { onClose: () => void }): JSX.Element {
  const { swapPlaceholder } = popupHome;
  return (
    <Sheet title={popupHome.quickActions.swap} onClose={onClose}>
      <div className="grid gap-5 px-4 pt-4 pb-5">
        <ImgWell
          asset={POPUP_ART.swap}
          ratio="16/10"
          dim
          sizes="328px"
          className="border border-[color:var(--rule)]"
        />
        <div className="grid gap-2">
          <p className="font-display text-2xl font-extrabold uppercase leading-none text-[color:var(--fg)]">
            {swapPlaceholder.title}
          </p>
          <p className={T.body}>{swapPlaceholder.body}</p>
        </div>
        <a
          href={extFrame.links.showcase}
          target="_blank"
          rel="noreferrer"
          className="chamfer-sm inline-flex h-11 w-max items-center gap-2 border border-[color:var(--fg)] px-4 font-display text-base font-extrabold uppercase tracking-[0.08em] text-[color:var(--fg)] transition-colors hover:bg-[color:var(--ground-deep)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
        >
          {swapPlaceholder.action.label}
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
        </a>
      </div>
    </Sheet>
  );
}
