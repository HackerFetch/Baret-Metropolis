import { hub, scrybe } from "@baret/content";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useState } from "react";
import { AnalysisPanel } from "../kit/AnalysisPanel.js";
import { DemoBar } from "../kit/DemoBar.js";
import { SiteHero } from "../kit/site/Page.js";
import { Faq, Features, SiteFooter, Stats } from "../kit/site/Sections.js";
import { SiteHeader } from "../kit/site/SiteHeader.js";
import { useSiteView } from "../kit/site/useSiteView.js";
import { SiteViewPage } from "../kit/site/Views.js";
import { useCheck } from "../kit/useCheck.js";
import { useDemoWallet } from "../kit/wallet/useDemoWallet.js";
import { AskCard } from "./AskCard.js";
import { ScrybeGlyph, VIEWS } from "./Glyph.js";
import { AgentsBridge, Run } from "./Run.js";
import { ART, type Cap, SAMPLE, START_CAP, usdc } from "./sample.js";
import { LIVE_VALUES, SOURCE } from "./source.js";

/**
 * Scrybe: a pay-per-answer service in its own highlighter palette, with
 * Baret's strip on top and Baret's panel behind the main button.
 *
 * The story (scrybe.content.ts): nothing here is malicious. One answer is a
 * small x402 payment, Safe. The agent loop pays question after question; the
 * payment that would take the hour over the visitor's cap is stopped. The
 * panel shows the run, the stop and the way to the same caps on /agents.
 * With a wallet connected, Baret checks the real payment from that address
 * under the visitor's cap; without one, the prepared sample (source.ts).
 * Nothing is signed or sent.
 */

const { site, analysis } = scrybe;

export function ScrybeSite(): JSX.Element {
  const [mode, setMode] = useState<DemoMode>("safe");
  const [checked, setChecked] = useState<DemoMode>("safe");
  const [question, setQuestion] = useState<string>(site.panel.start);
  const [cap, setCap] = useState<Cap>(START_CAP);
  const [checkedCap, setCheckedCap] = useState<Cap>(START_CAP);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const check = useCheck(hub.frame.panel.phases.length, SOURCE);
  const { from, live } = useDemoWallet();
  const { view, go } = useSiteView(VIEWS);
  const page = site.pages.views.find((v) => v.id === view);

  function runCheck(version: DemoMode): void {
    setChecked(version);
    setCheckedCap(cap);
    setConnected(true);
    setOpen(true);
    check.start({ mode: version, cap, from });
  }

  /** False when the question is missing, so the card can move focus to it. */
  function ask(): boolean {
    if (mode === "safe" && question.trim() === "") {
      setError(site.panel.errors.empty);
      return false;
    }
    setError(null);
    runCheck(mode);
    return true;
  }

  function tryOther(): void {
    const next: DemoMode = checked === "safe" ? "danger" : "safe";
    setMode(next);
    runCheck(next);
  }

  const copy = analysis.modes[checked];
  const values = {
    amount: usdc(SAMPLE.price),
    merchant: live ? LIVE_VALUES.merchant : SAMPLE.merchant,
  };

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
        glyph={<ScrybeGlyph />}
        nav={site.nav}
        views={VIEWS}
        view={view}
        onView={go}
        connect={site.connect}
        sample={{ connected, address: SAMPLE.wallet, onUse: () => setConnected(true) }}
      />

      <main key={view} id="main" tabIndex={-1} className="focus:outline-none">
        {page ? (
          <SiteViewPage view={page} note={site.pages.sampleNote} faqName="scrybe-page-faq" />
        ) : (
          <>
            <SiteHero
              badge={site.hero.badge}
              title={site.hero.title}
              body={site.hero.body}
              card={
                <AskCard
                  mode={mode}
                  onMode={setMode}
                  question={question}
                  onQuestion={(value) => {
                    setQuestion(value);
                    if (error) setError(null);
                  }}
                  cap={cap}
                  onCap={setCap}
                  error={error}
                  onAsk={ask}
                />
              }
            />
            <Stats items={site.stats} title={hub.frame.site.statsTitle} />
            <Features image={ART.hero} blocks={site.sections} />
            <Faq items={site.faq} name="scrybe-faq" title={hub.frame.site.faqTitle} />
          </>
        )}
      </main>

      <SiteFooter note={site.footer} hostname={site.hostname} />

      <AnalysisPanel
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Closing the panel cancels a check that is still running.
          if (!next) check.reset();
        }}
        state={check.state}
        live={live}
        mode={checked}
        image={checked === "safe" ? ART.safe : ART.danger}
        copy={{
          asks: fill(copy.asks, values),
          call: copy.call,
          expected: copy.expected,
          expectedBody: copy.expectedBody,
          claims: analysis.claims,
          without: analysis.without,
          lesson: analysis.lesson,
        }}
        extra={checked === "danger" ? <Run cap={checkedCap} /> : null}
        after={<AgentsBridge />}
        onTryOther={tryOther}
      />
    </>
  );
}
