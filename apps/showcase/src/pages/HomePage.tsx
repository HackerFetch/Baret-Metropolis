import { AgentsSection } from "../landing/sections/Agents.js";
import { FinalCtaSection } from "../landing/sections/FinalCta.js";
import { HeroSection } from "../landing/sections/Hero.js";
import { MarqueeSection } from "../landing/sections/Marquee.js";
import { OpenerSection } from "../landing/sections/Opener.js";
import { PillarsSection } from "../landing/sections/Pillars.js";
import { ShowcaseSection } from "../landing/sections/Showcase.js";
import { VerdictsSection } from "../landing/sections/Verdicts.js";
import { Signature } from "../landing/shared/cursor/Signature.js";
import { LandingMotion } from "../landing/shared/LandingMotion.js";

/**
 * The landing page. Every string comes from @baret/content and every section
 * lives in its own file under landing/sections, in scroll order: opener,
 * hero, checks, how it works, six dApps, verdicts, agents, closing.
 *
 * No <title> or description here: RootLayout renders the one of each for
 * every route. LandingMotion gives every motion element on this page the
 * BRAND ease-out default and honours prefers-reduced-motion. Signature
 * lazy-loads SmoothScroll (wheel only) and Cursor (fine pointer only) after
 * first paint, on this page alone; touch and reduced motion never fetch them.
 */
export function Component() {
  return (
    <LandingMotion>
      <Signature />
      <div className="overflow-x-clip">
        {/* Seam: no spacer. The opener's last photo hands straight to the hero photo. */}
        <OpenerSection />
        <HeroSection />
        <MarqueeSection />
        <PillarsSection />
        <ShowcaseSection />
        <VerdictsSection />
        <AgentsSection />
        <FinalCtaSection />
      </div>
    </LandingMotion>
  );
}
