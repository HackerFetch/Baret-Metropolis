import { cn } from "@baret/ui";
import type { ReactNode } from "react";

/**
 * The page rhythm: one heading, an optional lead, then content. No numbers, no eyebrows.
 */

export function Section({
  id,
  title,
  body,
  deep,
  children,
  className,
}: {
  id?: string;
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
        {title && (
          <header className="mb-9 grid max-w-[72ch] gap-3.5">
            <h2 className="text-display-l sm:text-4xl">{title}</h2>
            {body ? (
              <p className="max-w-[60ch] text-lg text-[color:var(--fg-muted)]">{body}</p>
            ) : null}
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
