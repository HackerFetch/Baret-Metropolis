import { hub, orbityield } from "@baret/content";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useState } from "react";
import { AnalysisPanel } from "../kit/AnalysisPanel.js";
import { parseAmount } from "../kit/amount.js";
import { DemoBar } from "../kit/DemoBar.js";
import { SiteHero } from "../kit/site/Page.js";
import { Faq, Features, SiteFooter, Stats } from "../kit/site/Sections.js";
import { SiteHeader } from "../kit/site/SiteHeader.js";
import { useSiteView } from "../kit/site/useSiteView.js";
import { SiteViewPage } from "../kit/site/Views.js";
import { useCheck } from "../kit/useCheck.js";
import { OrbitGlyph, VIEWS } from "./Glyph.js";
import { StakeCard } from "./StakeCard.js";
import { ART, overLimit, poolOf, SAMPLE } from "./sample.js";
import { SOURCE } from "./source.js";

/**
 * OrbitYield: a liquid staking page in its own observatory palette, with
 * Baret's strip on top and Baret's panel behind the main button.
 *
 * The story (orbityield.content.ts): nothing here is provably an attack.
 * Honest, the deposit goes to the pool Baret knows and oMON comes back. In
 * the attack the same button pays a second pool on no list that sends
 * nothing back: Caution, and Blocked once the deposit is above the loss
 * limit, which is what the expected verdict then says too. Prepared samples
 * only, so nothing is sent (source.ts).
 */

const { site, analysis } = orbityield;

export function OrbitYieldSite(): JSX.Element {
  const [mode, setMode] = useState<DemoMode>("safe");
  const [checked, setChecked] = useState<DemoMode>("safe");
  const [amount, setAmount] = useState<string>(site.panel.start);
  const [staked, setStaked] = useState(Number(site.panel.start));
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const check = useCheck(hub.frame.panel.phases.length, SOURCE);
  const { view, go } = useSiteView(VIEWS);
  const page = site.pages.views.find((v) => v.id === view);

  function runCheck(version: DemoMode, value: number): void {
    setChecked(version);
    setStaked(value);
    setConnected(true);
    setOpen(true);
    check.start({ mode: version, amount: value });
  }

  function stake(): void {
    const value = parseAmount(amount);
    if (value === null) {
      setError(site.panel.errors.empty);
      return;
    }
    if (value > SAMPLE.mon) {
      setError(site.panel.errors.tooHigh);
      return;
    }
    setError(null);
    runCheck(mode, value);
  }

  function tryOther(): void {
    const next: DemoMode = checked === "safe" ? "danger" : "safe";
    setMode(next);
    runCheck(next, staked);
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
        glyph={<OrbitGlyph />}
        nav={site.nav}
        views={VIEWS}
        view={view}
        onView={go}
        connect={site.connect}
        connected={connected}
        wallet={SAMPLE.wallet}
        onConnect={() => setConnected(true)}
      />

      <main key={view}>
        {page ? (
          <SiteViewPage view={page} note={site.pages.sampleNote} faqName="orbityield-page-faq" />
        ) : (
          <>
            <SiteHero
              badge={site.hero.badge}
              title={site.hero.title}
              body={site.hero.body}
              card={
                <StakeCard
                  mode={mode}
                  onMode={setMode}
                  amount={amount}
                  onAmount={(value) => {
                    setAmount(value);
                    if (error) setError(null);
                  }}
                  error={error}
                  onStake={stake}
                />
              }
            />
            <Stats items={site.stats} />
            <Features image={ART.hero} blocks={site.sections} portrait />
            <Faq items={site.faq} name="orbityield-faq" />
          </>
        )}
      </main>

      <SiteFooter note={site.footer} hostname={site.hostname} />

      <AnalysisPanel
        open={open}
        onOpenChange={setOpen}
        state={check.state}
        live={false}
        mode={checked}
        image={checked === "safe" ? ART.safe : ART.danger}
        copy={{
          asks: fill(copy.asks, { contract: poolOf(checked) }),
          call: copy.call,
          // Above the loss limit the expected answer is Blocked; the body says so.
          expected: overLimit(checked, staked) ? "blocked" : copy.expected,
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
