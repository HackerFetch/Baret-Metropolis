import { common, hub } from "@baret/content";
import { Button, Sheet, SheetContent, SheetDescription, SheetTitle, Tag } from "@baret/ui";
import {
  ChangeList,
  ClaimsList,
  type ExpectedKind,
  ExpectedVerdict,
  FindingList,
  LiveVerdict,
  NoteBlock,
  TheAsk,
} from "@baret/web-ui/components/CheckBlocks";
import { ImgWell } from "@baret/web-ui/components/Img";
import { StaggerItem } from "@baret/web-ui/components/Reveal";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, type ReactNode, useLayoutEffect, useRef } from "react";
import type { ImgAsset } from "../../shared/assets.js";
import type { CheckState } from "./useCheck.js";

/**
 * Baret's panel on top of a demo dApp. It opens when the site's main button
 * is pressed, walks through the analysis phases, then shows the result before
 * anything is signed. It always sits in data-scope="baret", so it keeps
 * Baret's palette on any dApp theme, like the real extension would.
 *
 * Three kinds of result, one layout:
 * - sample: the expected verdict and the prepared findings;
 * - live: Baret's verdict first, a line saying whether it matches the
 *   expected one, then the same blocks from the server's answer;
 * - failed: Blocked, and a note that the check did not finish.
 *
 * Shared by all six demo sites: each one passes its own copy.
 */

const { panel, outcome } = hub.frame;

export interface PanelCopy {
  readonly asks: string;
  readonly call: string;
  readonly expected: ExpectedKind;
  readonly expectedBody: string;
  readonly claims: readonly { claim: string; check: string }[];
  readonly without: { title: string; body: string };
  readonly lesson: { title: string; body: string };
}

export function AnalysisPanel({
  open,
  onOpenChange,
  state,
  live,
  mode,
  copy,
  image,
  extra,
  after,
  onTryOther,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: CheckState;
  /** True when the check goes to Baret's server, so the header can say so from the start. */
  live: boolean;
  /** The version that was checked, which may differ from the one switched on now. */
  mode: DemoMode;
  copy: PanelCopy;
  image?: ImgAsset;
  /**
   * A site's own block after "What the site asks for", for what the shared
   * blocks cannot show (Scrybe's run of payments against the cap).
   */
  extra?: ReactNode;
  /** A site's own block after the lesson (Scrybe's way to the agents page). */
  after?: ReactNode;
  onTryOther: () => void;
}): JSX.Element {
  const result = state.phase === "done" ? state.result : null;

  // The sheet opens from state, with no Radix trigger, so Radix has nothing
  // to send focus back to. Remember the control that opened it (a layout
  // effect runs before the sheet moves focus inside) and return there.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const el = document.activeElement;
    opener.current = el instanceof HTMLElement && el !== document.body ? el : null;
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={common.actions.close}
        data-scope="baret"
        onCloseAutoFocus={(event) => {
          const el = opener.current;
          if (!el?.isConnected) return;
          event.preventDefault();
          el.focus();
        }}
        className="gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[520px]"
      >
        <header className="grid gap-3 border-b border-[color:var(--rule)] px-6 pt-6 pb-5">
          <div className="flex">
            <Tag tone="brand" size="sm">
              {common.brand.wordmark}
            </Tag>
          </div>
          <SheetTitle className={`${T.h3} text-[color:var(--fg)]`}>{panel.title}</SheetTitle>
          <SheetDescription className={T.small}>
            {/* A shown answer says where it came from; a wallet connected
                after a sample check does not relabel that sample. */}
            {(result ? result.source !== "sample" : live) ? panel.liveNote : panel.sample}
          </SheetDescription>
        </header>

        {/* The verdict is announced once it is ready; focus stays put. */}
        <p role="status" className="sr-only">
          {result ? common.verdicts[result.verdict].aria : ""}
        </p>

        {/* Addresses are one long word: let them wrap so the panel never
            outgrows a phone screen. */}
        <div className="grid gap-5 px-6 py-6 [overflow-wrap:anywhere] [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0 [&>div:first-child>section:first-child]:border-t-0 [&>div:first-child>section:first-child]:pt-0">
          {state.phase === "checking" ? (
            <ol aria-label={panel.title} className="grid gap-2">
              {panel.phases.map((line, i) => (
                <li
                  key={line}
                  className={`flex items-center gap-3 ${T.small} ${i <= state.step ? "text-[color:var(--fg)]" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rounded-full ${i < state.step ? "bg-[color:var(--fg)]" : i === state.step ? "bg-[color:var(--accent)]" : "bg-[color:var(--rule-strong)]"}`}
                  />
                  {line}
                </li>
              ))}
            </ol>
          ) : null}

          {result?.source === "failed" ? (
            <>
              <LiveVerdict verdict={result.verdict} />
              <NoteBlock title={panel.failed.title} body={panel.failed.body} />
              <TheAsk asks={copy.asks} call={copy.call} />
            </>
          ) : null}

          {result && result.source !== "failed" ? (
            <>
              {/* Verdict, findings and changes rise in like the landing's blocks. */}
              <StaggerItem index={0} className="grid gap-5">
                {result.source === "live" ? (
                  <LiveVerdict verdict={result.verdict} expected={copy.expected} />
                ) : null}
                <ExpectedVerdict verdict={copy.expected} body={copy.expectedBody} />
              </StaggerItem>
              {image ? (
                <ImgWell
                  asset={image}
                  ratio="16/10"
                  fit="contain"
                  // The sheet is the full width on phones and 520 px from 640 px.
                  sizes="(min-width: 640px) 480px, 100vw"
                  className="border border-[color:var(--rule)]"
                />
              ) : null}
              <TheAsk asks={copy.asks} call={copy.call} />
              {extra}
              <StaggerItem index={1} className="grid">
                <FindingList items={result.findings} />
              </StaggerItem>
              <StaggerItem index={2} className="grid">
                <ChangeList rows={result.changes} approvals={result.approvals} />
              </StaggerItem>
              <ClaimsList claims={copy.claims} />
              {mode === "danger" ? (
                <NoteBlock title={copy.without.title} body={copy.without.body} />
              ) : null}
              <NoteBlock title={panel.lesson} body={copy.lesson.body} />
              {after}
            </>
          ) : null}

          {result ? (
            <section className="grid gap-3 border-t border-[color:var(--rule-strong)] pt-5">
              <p className={`${T.h3} text-[color:var(--fg)]`}>{outcome.stopped.title}</p>
              <p className={T.body}>{outcome.stopped.body}</p>
              <div className="flex">
                <Button type="button" variant="ghost" onClick={onTryOther}>
                  {outcome.again.label}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
