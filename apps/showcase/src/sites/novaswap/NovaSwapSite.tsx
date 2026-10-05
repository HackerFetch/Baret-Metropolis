import { hub, novaswap } from "@baret/content";
import type { DemoMode } from "@baret/web-ui/lib/check-types";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useState } from "react";
import { AnalysisPanel } from "../kit/AnalysisPanel.js";
import { toWei } from "../kit/amount.js";
import { DemoBar } from "../kit/DemoBar.js";
import { SiteHero } from "../kit/site/Page.js";
import { Faq, Features, SiteFooter, Stats } from "../kit/site/Sections.js";
import { SiteHeader } from "../kit/site/SiteHeader.js";
import { useSiteView } from "../kit/site/useSiteView.js";
import { useCheck } from "../kit/useCheck.js";
import { addressOf } from "../kit/wallet/store.js";
import { exceeds, formatMon, useDemoWallet } from "../kit/wallet/useDemoWallet.js";
import { DocsPage, PoolsPage, StatsPage } from "./Pages.js";
import { NovaGlyph, VIEWS } from "./SiteHeader.js";
import { SwapCard } from "./SwapCard.js";
import { ART, balanceOf, parseAmount, SAMPLE } from "./sample.js";
import { contractOf, SOURCE } from "./source.js";

/**
 * NovaSwap: a believable swap venue in its own cobalt palette, with Baret's
 * strip on top and Baret's panel waiting behind the main button.
 *
 * The story (novaswap.content.ts, D-018): the honest version buys dUSDC
 * with MON on the NovaSwap router. The attack version sells dUSDC and first
 * asks to "enable trading", an unlimited allowance to a look-alike router.
 * Baret's strip and the switch in the card flip between the two. The main
 * button opens the panel with Baret's answer for the version switched on:
 * the live answer from the connected wallet's address, or the prepared
 * sample without one (source.ts). Nothing is ever signed.
 */

const { site, analysis } = novaswap;

/** The amount each version starts with: under half the sample MON, and a dUSDC sale. */
const START: Record<DemoMode, string> = { safe: "2.5", danger: "20" };

export function NovaSwapSite(): JSX.Element {
  const [mode, setModeState] = useState<DemoMode>("safe");
  const [checked, setChecked] = useState<DemoMode>("safe");
  const [amount, setAmount] = useState(START.safe);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const check = useCheck(hub.frame.panel.phases.length, SOURCE);
  const { wallet, from, live, balance } = useDemoWallet();
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
    check.start({ mode: version, amount: value, wei: toWei(value) ?? 0n, from });
  }

  /** False when the amount is refused, so the card can move focus to it. */
  function review(): boolean {
    const errors = mode === "safe" ? site.panel.errors : site.attack.errors;
    const value = parseAmount(amount);
    if (value === null) {
      setError(errors?.empty ?? null);
      return false;
    }
    // The sample checks its own balances. Live, the honest swap pays MON
    // from the connected wallet; the attack's approval costs nothing.
    if (!live && value > balanceOf(mode)) {
      setError(errors?.tooHigh ?? null);
      return false;
    }
    if (live && mode === "safe") {
      const wei = toWei(amount);
      if (wei === null) {
        setError(errors?.empty ?? null);
        return false;
      }
      if (balance !== null && exceeds(wei, balance)) {
        setError(fill(hub.frame.wallet.short, { balance: formatMon(balance) }));
        return false;
      }
    }
    setError(null);
    runCheck(mode, amount);
    return true;
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
        sample={{ connected, address: SAMPLE.wallet, onUse: () => setConnected(true) }}
      />

      <main key={view} id="main" tabIndex={-1} className="focus:outline-none">
        {view === "pools" ? <PoolsPage onSwap={() => go("swap")} /> : null}
        {view === "stats" ? <StatsPage /> : null}
        {view === "docs" ? <DocsPage /> : null}
        {view === "swap" ? (
          <>
            <SiteHero
              badge={site.hero.badge}
              title={site.hero.title}
              keepCase={["dUSDC"]}
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
                  live={live}
                  liveBalance={balance === null ? null : formatMon(balance)}
                  walletConnected={addressOf(wallet) !== null}
                />
              }
            />

            <Stats items={site.stats} title={hub.frame.site.statsTitle} />
            <Features image={ART.routes} blocks={site.sections} />
            <Faq items={site.faq} name="novaswap-faq" title={hub.frame.site.faqTitle} />
          </>
        ) : null}
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
