import { cn } from "@baret/ui";
import type { ReactNode } from "react";

/**
 * The page rhythm. Every marketing section is one of these, so the numbering,
 * the rule lines and the gutters stay identical down the page.
 *
 * The number is not decoration. The landing page reads as a numbered document
 * because the brand is built on engineering drawings, so a section that has no
 * place in that sequence should not use this component.
 */

export function Section({
  id,
  index,
  eyebrow,
  title,
  body,
  deep,
  children,
  className,
}: {
  id?: string;
  index?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  deep?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "border-b border-[color:var(--rule)] py-14 sm:py-20",
        deep && "bg-[color:var(--ground-deep)]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1180px] px-5">
        {(title || eyebrow) && (
          <header className="mb-9 grid gap-5 sm:grid-cols-[120px_1fr] sm:gap-6">
            <div>
              {index ? (
                <div className="font-display text-5xl leading-none text-[color:var(--accent)]">
                  {index}
                </div>
              ) : null}
              {eyebrow ? (
                <div className="mt-1.5 font-mono text-label uppercase text-[color:var(--fg-faint)]">
                  {eyebrow}
                </div>
              ) : null}
            </div>
            <div className="grid max-w-[72ch] gap-3.5">
              {title ? <h2 className="text-display-l sm:text-4xl">{title}</h2> : null}
              {body ? (
                <p className="max-w-[60ch] text-lg text-[color:var(--fg-muted)]">{body}</p>
              ) : null}
            </div>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** A square panel with a single rule. The only card shape in the system. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid content-start gap-2.5 border border-[color:var(--rule)] bg-[color:var(--surface)] p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The small uppercase label that sits above a value. */
export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-label uppercase text-[color:var(--fg-faint)]">{children}</span>
  );
}
