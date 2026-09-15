import { cn, Tag } from "@baret/ui";
import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * The frame every demo site renders inside.
 *
 * The fake product owns the whole canvas, because a demo that looks like a
 * demo teaches nothing. The only Baret surface here is the mode switch and
 * the analysis drawer, both of which live outside the fake product's layout.
 */
export function DemoShell({
  brand,
  nav,
  danger,
  onToggle,
  modes,
  children,
}: {
  brand: string;
  nav: readonly string[];
  danger: boolean;
  onToggle: (next: boolean) => void;
  modes: { safe: { label: string; body: string }; danger: { label: string; body: string } };
  children: ReactNode;
}) {
  const mode = danger ? modes.danger : modes.safe;

  return (
    <div className="min-h-dvh bg-[color:var(--ground)]">
      <header className="border-b border-[color:var(--rule)]">
        <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between gap-4 px-5">
          <span className="font-display text-xl uppercase tracking-[0.06em]">{brand}</span>
          <nav aria-label={`${brand} navigation`} className="hidden gap-5 sm:flex">
            {nav.map((item) => (
              <span key={item} className="text-sm text-[color:var(--fg-faint)]">
                {item}
              </span>
            ))}
          </nav>
          <button
            type="button"
            className="chamfer-sm h-9 border border-[color:var(--rule-strong)] px-3 font-display text-sm uppercase tracking-[0.06em]"
          >
            Connect
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-5 py-12">{children}</main>

      <aside
        aria-label="Demo controls"
        className="sticky bottom-0 border-t border-[color:var(--rule)] bg-[color:var(--surface)]"
      >
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-4 px-5 py-3.5">
          <Link to="/showcase" className="shrink-0">
            <Tag tone="brand" size="sm">
              Baret demo
            </Tag>
          </Link>

          <fieldset className="chamfer-sm flex shrink-0 border border-[color:var(--rule-strong)]">
            <legend className="sr-only">Demo mode</legend>
            {([false, true] as const).map((value) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={danger === value}
                onClick={() => onToggle(value)}
                className={cn(
                  "h-9 px-3.5 font-display text-sm uppercase tracking-[0.06em]",
                  danger === value
                    ? value
                      ? "bg-[color:var(--blocked)] text-[color:var(--surface)]"
                      : "bg-[color:var(--safe)] text-[color:var(--surface)]"
                    : "text-[color:var(--fg-faint)]",
                )}
              >
                {value ? modes.danger.label : modes.safe.label}
              </button>
            ))}
          </fieldset>

          <p className="min-w-[24ch] flex-1 text-sm text-[color:var(--fg-muted)]">{mode.body}</p>
        </div>
      </aside>
    </div>
  );
}
