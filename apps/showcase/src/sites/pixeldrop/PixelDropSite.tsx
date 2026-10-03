import { hub, pixeldrop } from "@baret/content";
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
import { PixelGlyph, VIEWS } from "./Glyph.js";
import { MintCard } from "./MintCard.js";
import { ART, parseQuantity, priceOf, SAMPLE } from "./sample.js";
import { SOURCE } from "./source.js";

/**
 * PixelDrop: a mint page for the Night Shift collection in its own
 * risograph palette, with Baret's strip on top and Baret's panel behind the
 * main button.
 *
 * The story (pixeldrop.content.ts): honest, the button mints and one piece
 * arrives for 0.01 MON. In the attack version the same button grants another
 * address every piece you hold, now and later, and mints nothing. Prepared
 * samples only, so nothing is sent (source.ts).
 */

const { site, analysis } = pixeldrop;

export function PixelDropSite(): JSX.Element {
  const [mode, setMode] = useState<DemoMode>("safe");
  const [checked, setChecked] = useState<DemoMode>("safe");
  const [quantity, setQuantity] = useState<string>(site.panel.start);
  const [count, setCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const check = useCheck(hub.frame.panel.phases.length, SOURCE);
  const { view, go } = useSiteView(VIEWS);
  const page = site.pages.views.find((v) => v.id === view);

  function runCheck(version: DemoMode, pieces: number): void {
    setChecked(version);
    setCount(pieces);
    setConnected(true);
    setOpen(true);
    check.start({ mode: version, count: pieces });
  }

  function mint(): void {
    const value = parseQuantity(quantity);
    if (value === null) {
      setError(site.panel.errors.empty);
      return;
    }
    if (value > SAMPLE.perWallet) {
      setError(site.panel.errors.tooHigh);
      return;
    }
    setError(null);
    runCheck(mode, value);
  }

  function tryOther(): void {
    const next: DemoMode = checked === "safe" ? "danger" : "safe";
    setMode(next);
    runCheck(next, count);
  }

  const modeCopy = analysis.modes[checked];
  // The honest ask names how many pieces; the attack asks for the collection.
  const many = checked === "safe" && count > 1 ? analysis.modes.safe.many : null;
  const values = {
    contract: SAMPLE.collection,
    operator: SAMPLE.operator,
    count: String(count),
    price: priceOf(count),
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
        glyph={<PixelGlyph />}
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
          <SiteViewPage view={page} note={site.pages.sampleNote} faqName="pixeldrop-page-faq" />
        ) : (
          <>
            <SiteHero
              badge={site.hero.badge}
              title={site.hero.title}
              body={site.hero.body}
              card={
                <MintCard
                  mode={mode}
                  onMode={setMode}
                  quantity={quantity}
                  onQuantity={(value) => {
                    setQuantity(value);
                    if (error) setError(null);
                  }}
                  error={error}
                  onMint={mint}
                />
              }
            />
            <Stats items={site.stats} />
            <Features image={ART.hero} blocks={site.sections} />
            <Faq items={site.faq} name="pixeldrop-faq" />
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
          asks: fill(many?.asks ?? modeCopy.asks, values),
          call: fill(many?.call ?? modeCopy.call, values),
          expected: modeCopy.expected,
          expectedBody: fill(many?.expectedBody ?? modeCopy.expectedBody, values),
          claims: analysis.claims,
          without: analysis.without,
          lesson: analysis.lesson,
        }}
        onTryOther={tryOther}
      />
    </>
  );
}
