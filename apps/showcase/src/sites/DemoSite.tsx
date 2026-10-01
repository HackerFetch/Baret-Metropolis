import { Tag } from "@baret/ui";
import { DemoShell } from "./DemoShell.js";

/**
 * Renders any of the six demos from its content file.
 *
 * Every site has the same shape: a fake product hero, its own supporting
 * sections, and a Baret analysis panel that only appears once the user has
 * pressed the site's main button. The fake product is deliberately given the
 * whole page; a demo that announces itself as a demo teaches nothing.
 *
 * The per-site interfaces (a swap form, a mint counter, a countdown) are the
 * next piece of work. This shell renders the copy and the mode switch so the
 * routing, the content wiring and the theme are provable today.
 */

interface DemoContent {
  scenario: {
    name: string;
    category: string;
    tagline: string;
    summary: string;
    watchFor: readonly string[];
    whyItMatters: string;
    verdict: string;
  };
  site: {
    brand: string;
    nav: readonly string[];
    hero: { title: string; body: string; cta: string; badge?: string };
  };
  analysis: {
    modes: {
      safe: { label: string; body: string };
      danger: { label: string; body: string };
    };
    lesson: { title: string; body: string };
  };
}

export function DemoSite({
  content,
  danger,
  onToggle,
}: {
  content: DemoContent;
  danger: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { site, scenario, analysis } = content;

  return (
    <DemoShell
      brand={site.brand}
      nav={site.nav}
      danger={danger}
      onToggle={onToggle}
      modes={analysis.modes}
    >
      <div className="grid gap-10">
        <section className="grid max-w-[60ch] gap-4">
          {site.hero.badge ? (
            <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">
              {site.hero.badge}
            </span>
          ) : null}
          <h1 className="text-display-l sm:text-5xl">{site.hero.title}</h1>
          <p className="text-lg text-[color:var(--fg-muted)]">{site.hero.body}</p>
          <button
            type="button"
            className="chamfer-sm inline-flex h-12 w-max items-center bg-[color:var(--accent)] px-6 font-display text-lg uppercase tracking-[0.06em] text-[color:var(--on-accent)]"
          >
            {site.hero.cta}
          </button>
        </section>

        <section
          aria-label="What Baret sees"
          className="grid gap-3.5 border-t border-[color:var(--rule)] pt-8 md:grid-cols-[1fr_1fr]"
        >
          <div className="grid content-start gap-2.5">
            <div className="flex items-center gap-2">
              <Tag size="sm" tone="brand">
                Baret
              </Tag>
              <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">
                {scenario.category}
              </span>
            </div>
            <h2 className="text-display-m">{scenario.name}</h2>
            <p className="text-sm text-[color:var(--fg-muted)]">{scenario.summary}</p>
            <p className="text-sm text-[color:var(--fg-faint)]">{scenario.whyItMatters}</p>
          </div>

          <div className="grid content-start gap-2.5 border border-[color:var(--rule)] bg-[color:var(--surface)] p-5">
            <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">
              What the analysis flags
            </span>
            <ul className="grid gap-1.5">
              {scenario.watchFor.map((item) => (
                <li
                  key={item}
                  className="grid grid-cols-[14px_1fr] gap-2 text-sm text-[color:var(--fg-muted)]"
                >
                  <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                    /
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <hr className="my-1 border-[color:var(--rule)]" />
            <h3 className="font-display text-base uppercase">{analysis.lesson.title}</h3>
            <p className="text-sm text-[color:var(--fg-muted)]">{analysis.lesson.body}</p>
          </div>
        </section>
      </div>
    </DemoShell>
  );
}
