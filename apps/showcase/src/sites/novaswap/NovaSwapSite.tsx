import { hub, novaswap } from "@baret/content";
import { type JSX, useState } from "react";
import { useSearchParams } from "react-router";
import { FRAME, GRID } from "../../shared/layout.js";
import { Reveal } from "../../shared/Reveal.js";
import { TextReveal } from "../../shared/TextReveal.js";
import { T } from "../../shared/type.js";
import { fill } from "../../shared/util.js";
import { AnalysisPanel } from "../kit/AnalysisPanel.js";
import { DemoBar } from "../kit/DemoBar.js";
import type { DemoMode } from "../kit/types.js";
import { useSampleCheck } from "../kit/useSampleCheck.js";
import { DocsPage, PoolsPage, StatsPage } from "./Pages.js";
import { Faq, Features, SiteFooter, Stats } from "./Sections.js";
import { SiteHeader, VIEWS, type View } from "./SiteHeader.js";
import { SwapCard } from "./SwapCard.js";
import { ART, parseAmount, SAMPLE, sampleCheck } from "./sample.js";

/**
 * NovaSwap: a believable swap venue in its own cobalt palette, with Baret's
 * strip on top and Baret's panel waiting behind the main button.
 *
 * The story (novaswap.content.ts): a swap that succeeds and pays someone
 * else. The honest version calls the NovaSwap router; the attack version
 * calls a look-alike that pays the USDC to another wallet. Pressing
 * "Review swap" opens the panel with the prepared sample for the version that
 * is switched on. Nothing is signed and nothing leaves the page.
 */

const { site, analysis } = novaswap;

export function NovaSwapSite(): JSX.Element {
  const [mode, setMode] = useState<DemoMode>("safe");
  const [amount, setAmount] = useState("2.5");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const check = useSampleCheck(hub.frame.panel.phases.length);
  // The page lives in ?view= so Back works and a page can be linked.
  const [params, setParams] = useSearchParams();
  const raw = params.get("view");
  const view: View = VIEWS.find((v) => v === raw) ?? "swap";

  function go(next: View): void {
    setParams(next === "swap" ? {} : { view: next });
    window.scrollTo({ top: 0 });
  }

  const mon = parseAmount(amount) ?? 0;
  const result = sampleCheck(mode, mon);
  const copy = analysis.modes[mode];

  function review(): void {
    const value = parseAmount(amount);
    if (value === null) {
      setError(site.panel.errors?.empty ?? null);
      return;
    }
    if (value > SAMPLE.balance) {
      setError(site.panel.errors?.tooHigh ?? null);
      return;
    }
    setError(null);
    setConnected(true);
    setOpen(true);
    check.start();
  }

  function tryOther(): void {
    setMode((m) => (m === "safe" ? "danger" : "safe"));
    check.start();
  }

  return (
    <>
      <DemoBar
        mode={mode}
        onMode={setMode}
        labels={{ safe: analysis.modes.safe.label, danger: analysis.modes.danger.label }}
        body={copy.body}
      />
      <SiteHeader
        connected={connected}
        onConnect={() => setConnected(true)}
        view={view}
        onView={go}
      />

      <main key={view}>
        {view === "pools" ? <PoolsPage onSwap={() => go("swap")} /> : null}
        {view === "stats" ? <StatsPage /> : null}
        {view === "docs" ? <DocsPage /> : null}
        {view === "swap" ? (
          <>
            <section className={`${FRAME} py-12 md:py-16 lg:py-24`}>
              <div className={`${GRID} gap-y-12 lg:items-center`}>
                <div className="col-span-4 grid gap-6 md:col-span-8 lg:col-span-6">
                  <p className={T.label}>{site.hero.badge}</p>
                  <TextReveal
                    as="h1"
                    text={site.hero.title}
                    immediate
                    className="font-display text-[clamp(2.75rem,1.5rem+4vw,5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.005em] text-[color:var(--fg)]"
                  />
                  <p className={`${T.lead} max-w-[46ch]`}>{site.hero.body}</p>
                </div>
                <Reveal className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">
                  <SwapCard
                    amount={amount}
                    onAmount={(value) => {
                      setAmount(value);
                      if (error) setError(null);
                    }}
                    error={error}
                    onReview={review}
                  />
                </Reveal>
              </div>
            </section>

            <Stats />
            <Features />
            <Faq />
          </>
        ) : null}
      </main>

      <SiteFooter />

      <AnalysisPanel
        open={open}
        onOpenChange={setOpen}
        state={check.state}
        mode={mode}
        result={result}
        image={mode === "safe" ? ART.safe : ART.danger}
        copy={{
          asks: fill(copy.asks, { contract: result.contract }),
          call: copy.call,
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
