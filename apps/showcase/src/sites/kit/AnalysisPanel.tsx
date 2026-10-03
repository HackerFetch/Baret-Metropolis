import { common, hub } from "@baret/content";
import { Button, Sheet, SheetContent, SheetDescription, SheetTitle, Tag } from "@baret/ui";
import type { JSX } from "react";
import type { ImgAsset } from "../../shared/assets.js";
import { ImgWell } from "../../shared/Img.js";
import { T } from "../../shared/type.js";
import {
  ChangeList,
  ClaimsList,
  ExpectedVerdict,
  FindingList,
  LiveVerdict,
  NoteBlock,
  TheAsk,
} from "./panel/Blocks.js";
import type { DemoMode, Verdict } from "./types.js";
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
  readonly expected: Verdict;
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
  onTryOther: () => void;
}): JSX.Element {
  const result = state.phase === "done" ? state.result : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-scope="baret"
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
            {live ? panel.liveNote : panel.sample}
          </SheetDescription>
        </header>

        {/* The verdict is announced once it is ready; focus stays put. */}
        <p role="status" className="sr-only">
          {result ? common.verdicts[result.verdict].aria : ""}
        </p>

        {/* Addresses are one long word: let them wrap so the panel never
            outgrows a phone screen. */}
        <div className="grid gap-5 px-6 py-6 [overflow-wrap:anywhere] [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
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
              {result.source === "live" ? (
                <LiveVerdict verdict={result.verdict} expected={copy.expected} />
              ) : null}
              <ExpectedVerdict verdict={copy.expected} body={copy.expectedBody} />
              {image ? (
                <ImgWell
                  asset={image}
                  ratio="16/10"
                  fit="contain"
                  className="border border-[color:var(--rule)]"
                />
              ) : null}
              <TheAsk asks={copy.asks} call={copy.call} />
              <FindingList items={result.findings} />
              <ChangeList rows={result.changes} approvals={result.approvals} />
              <ClaimsList claims={copy.claims} />
              {mode === "danger" ? (
                <NoteBlock title={copy.without.title} body={copy.without.body} />
              ) : null}
              <NoteBlock title={panel.lesson} body={copy.lesson.body} />
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
