import { uninitialized } from "@baret/content/extension/popup/uninitialized.content";
import { common } from "@baret/content/shared/common.content";
import { Button } from "@baret/ui";
import { Tag } from "@baret/ui/primitives/Tag";
import { Brand } from "@baret/wallet-ui/components/Brand";
import { Img } from "@baret/web-ui/components/Img";
import { TwoToneText } from "@baret/web-ui/components/SectionHeader";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { POPUP_ART } from "../../../assets.js";
import { useExtension } from "../../../data/store.js";
import { TEXT_BUTTON } from "../frame/bits.js";

/**
 * First run: no wallet yet. Setup needs more room than 360 by 600, so this
 * screen makes the case in three verbs and hands off to the options page,
 * where the eight steps live. Restoring starts the same setup from a
 * recovery phrase. The two ways in stay pinned at the foot.
 */
export function Uninitialized({
  onSetup,
  onRestore,
}: {
  onSetup: () => void;
  onRestore: () => void;
}): JSX.Element {
  const { state } = useExtension();
  return (
    <div className="flex h-full flex-col">
      <section
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the scroller holds no control, so it takes focus to scroll by keyboard.
        tabIndex={0}
        aria-label={common.brand.tagline}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
      >
        <div
          className="relative aspect-[2/1] overflow-hidden border-b border-[color:var(--rule)]"
          style={{ backgroundColor: POPUP_ART.setup.ground }}
        >
          <Img asset={POPUP_ART.setup} loading="priority" sizes="360px" position="50% 55%" />
        </div>
        <div className="@container grid gap-5 px-5 pt-5 pb-6">
          <div className="flex items-center justify-between gap-3">
            <Brand slit="var(--ground)" />
            <Tag tone="network" size="sm">
              {common.networks[state.network].label}
            </Tag>
          </div>
          <TextReveal
            as="h1"
            text={common.brand.tagline}
            immediate
            className={`${T.h1Page} text-balance text-[color:var(--fg)]`}
          />
          <p className={T.body}>{uninitialized.body}</p>
          <ul className="grid border-t border-[color:var(--rule)]">
            {uninitialized.points.map((point) => (
              <li
                key={point}
                className="border-b border-[color:var(--rule)] py-3 text-sm leading-normal"
              >
                <span className="text-[color:var(--fg-muted)]">
                  <TwoToneText text={point} />
                </span>
              </li>
            ))}
          </ul>
          <p className={T.small}>{uninitialized.footnote}</p>
        </div>
      </section>
      <footer className="grid shrink-0 gap-2 border-t border-[color:var(--rule-strong)] bg-[color:var(--ground)] px-5 pt-3 pb-3">
        <Button type="button" variant="primary" size="lg" block onClick={onSetup}>
          {uninitialized.action.label}
        </Button>
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <button type="button" onClick={onRestore} className={TEXT_BUTTON}>
            {uninitialized.restore.label}
          </button>
          <span className="text-xs text-[color:var(--fg-muted)]">{uninitialized.restore.note}</span>
        </p>
      </footer>
    </div>
  );
}
