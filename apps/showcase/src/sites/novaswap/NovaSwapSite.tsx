import { hub, novaswap } from "@baret/content";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useState } from "react";
import { AnalysisPanel } from "../kit/AnalysisPanel.js";
import { DemoBar } from "../kit/DemoBar.js";
import { SiteHero } from "../kit/site/Page.js";
import { Faq, Features, SiteFooter, Stats } from "../kit/site/Sections.js";
import { SiteHeader } from "../kit/site/SiteHeader.js";
import { useSiteView } from "../kit/site/useSiteView.js";
import { useCheck } from "../kit/useCheck.js";
import { DocsPage, PoolsPage, StatsPage } from "./Pages.js";
import { NovaGlyph, VIEWS } from "./SiteHeader.js";
import { SwapCard } from "./SwapCard.js";
import { ART, balanceOf, parseAmount, SAMPLE } from "./sample.js";
import { contractOf, DEMO_FROM, sourceFor } from "./source.js";

/**
 * NovaSwap: a believable swap venue in its own cobalt palette, with Baret's
 * strip on top and Baret's panel waiting behind the main button.
 *
 * The story (novaswap.content.ts, D-018): the honest version buys dUSDC
 * with MON on the NovaSwap router. The attack version sells dUSDC and first
 * asks to "enable trading", an unlimited allowance to a look-alike router.
 * Baret's strip and the switch in the card flip between the two. The main
 * button opens the panel with Baret's answer for the version switched on:
 * the prepared sample, or the live answer once there is a wallet to
 * simulate from (source.ts). Nothing is ever signed.
 */

const { site, analysis } = novaswap;

/** The amount each version starts with: under half the sample MON, and a dUSDC sale. */
const START: Record<DemoMode, string> = { safe: "2.5", danger: "20" };

/** Chosen once: the page either always asks Baret or always shows the sample. */
const SOURCE = sourceFor(DEMO_FROM);
const FROM = DEMO_FROM ?? SAMPLE.wallet;

export function NovaSwapSite(): JSX.Element {
  const [mode, setModeState] = useState<DemoMode>("safe");
  const [checked, setChecked] = useState<DemoMode>("safe");
  const [amount, setAmount] = useState(START.safe);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const check = useCheck(hub.frame.panel.phases.length, SOURCE);
  // The page lives in ?view= so Back works and a page can be linked.
  const { view, go } = useSiteView(VIEWS);

  /** The two versions spend different tokens, so each starts from its own amount. */
  function setMode(next: DemoMode): void {
    if (next === mode) return;
    setModeState(next);
    setAmount(START[next]);
    setError(null);
  }

  function runCheck(version: DemoMode, value: string): void {
    setChecked(version);
    setConnected(true);
    setOpen(true);
    check.start({ mode: version, amount: value, from: FROM });
  }

  function review(): void {
    const errors = mode === "safe" ? site.panel.errors : site.attack.errors;
    const value = parseAmount(amount);
    if (value === null) {
      setError(errors?.empty ?? null);
      return;
    }
    if (value > balanceOf(mode)) {
      setError(errors?.tooHigh ?? null);
      return;
    }
    setError(null);
    runCheck(mode, amount);
  }

  function tryOther(): void {
    const next: DemoMode = checked === "safe" ? "danger" : "safe";
    setMode(next);
    runCheck(next, START[next]);
  }

  const copy = analysis.modes[checked];

  return (
    <>
      <DemoBar
        mode={mode}
        onMode={setMode}
        labels={{ safe: analysis.modes.safe.label, danger: analysis.modes.danger.label }}
        body={analysis.modes[mode].body}
      />
      <SiteHeader
        brand={site.brand}
        glyph={<NovaGlyph />}
        nav={site.nav}
        views={VIEWS}
        view={view}
        onView={go}
        connect={site.connect}
        connected={connected}
        wallet={FROM}
        onConnect={() => setConnected(true)}
      />

      <main key={view}>
        {view === "pools" ? <PoolsPage onSwap={() => go("swap")} /> : null}
        {view === "stats" ? <StatsPage /> : null}
        {view === "docs" ? <DocsPage /> : null}
        {view === "swap" ? (
          <>
            <SiteHero
              badge={site.hero.badge}
              title={site.hero.title}
              body={site.hero.body}
              card={
                <SwapCard
                  mode={mode}
                  onMode={setMode}
                  amount={amount}
                  onAmount={(value) => {
                    setAmount(value);
                    if (error) setError(null);
                  }}
                  error={error}
                  onReview={review}
                />
              }
            />

            <Stats items={site.stats} />
            <Features image={ART.routes} blocks={site.sections} />
            <Faq items={site.faq} name="novaswap-faq" />
          </>
        ) : null}
      </main>

      <SiteFooter note={site.footer} hostname={site.hostname} />

      <AnalysisPanel
        open={open}
        onOpenChange={setOpen}
        state={check.state}
        live={DEMO_FROM !== null}
        mode={checked}
        image={checked === "safe" ? ART.safe : ART.danger}
        copy={{
          asks: fill(copy.asks, { contract: contractOf(checked) }),
          call: copy.call,
          expected: copy.expected,
          expectedBody: copy.expectedBody,
          claims: analysis.claims,
          without: analysis.without,
          lesson: analysis.lesson,
        }}
        onTryOther={tryOther}
      />
    </>
  );
}
