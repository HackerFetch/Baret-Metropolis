import { agents } from "@baret/content";
import { Disclosures } from "@baret/web-ui/components/Disclosures";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { GRID } from "@baret/web-ui/lib/layout";
import { useState } from "react";
import { AgentsHero } from "../agents/AgentsHero.js";
import { Layers } from "../agents/Layers.js";
import { Playground } from "../agents/playground/Playground.js";
import type { PolicyName } from "../agents/playground/sample.js";
import { Quickstart } from "../agents/Quickstart.js";
import { AGENTS_ART } from "../shared/assets.js";
import { ClosingBand } from "../shared/ClosingBand.js";

/**
 * /agents, for a developer about to give an agent access to money. Six
 * blocks (owner's order, 2026-10-03): the claim at night, the three layers,
 * the quickstart, the playground, fair questions, and the way in. The
 * problem, the control model, the chooser, fail-closed and revoke are folded
 * into those or cut. One policy choice drives the quickstart's code and the
 * playground's answers. The questions sit beside their title from 1024 px.
 */

const FAQ = agents.faq.items.map((item) => ({ summary: item.question, body: item.answer }));

export function Component() {
  const [policy, setPolicy] = useState<PolicyName>("balanced");
  const { cta, faq } = agents;
  return (
    <div className="overflow-x-clip">
      <AgentsHero />
      <Layers />
      <Quickstart policy={policy} />
      <Playground policy={policy} onPolicy={setPolicy} />
      <Section id="faq" ground="deep">
        <div className={`${GRID} gap-y-10 lg:items-start`}>
          <div className="col-span-4 md:col-span-8 lg:sticky lg:top-24 lg:col-span-4">
            <SectionHeader titleId={titleIdOf("faq")} title={faq.title} layout="stack" />
          </div>
          <Reveal className="col-span-4 md:col-span-8 lg:col-span-8">
            <Disclosures name="agents-faq" items={FAQ} />
          </Reveal>
        </div>
      </Section>
      <ClosingBand
        title={cta.title}
        body={cta.body}
        primary={cta.actions.primary}
        secondary={cta.actions.secondary}
        picture={{ asset: AGENTS_ART.cta, position: "50% 40%" }}
      />
    </div>
  );
}
