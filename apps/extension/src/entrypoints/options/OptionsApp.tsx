import { common, extOnboarding } from "@baret/content";
import { Mark, Tag } from "@baret/ui";

/**
 * The options page. Onboarding, the full permissions manager, the rule editor
 * and the agent payments dashboard live here, at full width.
 */
export function OptionsApp() {
  return (
    <div className="grid min-h-dvh place-content-center gap-6 p-8">
      <div className="flex items-center gap-2.5">
        <Mark size={32} slit="var(--ground)" />
        <span className="font-stencil text-3xl uppercase tracking-[0.04em]">
          {common.brand.wordmark}
        </span>
      </div>

      <div className="grid max-w-[60ch] gap-4">
        <Tag tone="brand" size="sm">
          {extOnboarding.steps[0]}
        </Tag>
        <h1 className="text-display-l">{extOnboarding.welcome.title}</h1>
        <p className="text-lg text-[color:var(--fg-muted)]">{extOnboarding.welcome.body}</p>

        <ul className="grid gap-1.5">
          {extOnboarding.welcome.points.map((point) => (
            <li
              key={point}
              className="grid grid-cols-[14px_1fr] gap-2 text-[color:var(--fg-muted)]"
            >
              <span aria-hidden="true" className="font-mono text-[color:var(--accent)]">
                /
              </span>
              {point}
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="chamfer-sm h-11 w-max bg-[color:var(--accent)] px-5 font-display text-base uppercase tracking-[0.08em] text-[color:var(--on-accent)]"
        >
          {extOnboarding.welcome.action.label}
        </button>

        <p className="font-mono text-xs text-[color:var(--fg-faint)]">
          {extOnboarding.welcome.footnote}
        </p>
      </div>
    </div>
  );
}
