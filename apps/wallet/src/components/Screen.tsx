import type { ReactNode } from "react";

/**
 * The frame every wallet screen shares: a title, an optional lead paragraph
 * and the screen's own content underneath.
 */
export function Screen({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <header className="grid gap-2.5 border-b border-[color:var(--rule)] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-display-l">{title}</h1>
          {action}
        </div>
        {body ? <p className="max-w-[70ch] text-[color:var(--fg-muted)]">{body}</p> : null}
      </header>
      {children}
    </div>
  );
}
